// ==============================================================================
// CLMS Authoritative Document Download Service
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Section 18:
// - One shared download service: authorized fetch -> Blob -> object URL -> explicit download -> revoke URL
// - Single user click triggers exactly ONE download
// - In-flight deduplication locks prevent duplicate invocations from rapid double-clicks or re-renders
// - Zero external IDM interception dependencies for document viewing
// ==============================================================================

class DownloadService {
  private activeDownloads: Set<string> = new Set();
  private lastDownloadTime = 0;
  private readonly COOLDOWN_MS = 1000;

  /**
   * Initiates a clean, browser-native file download from a memory Blob.
   * Single-flight protected: Duplicate calls for the same file in rapid succession are ignored.
   * IDM-Immune: Utilizes File System Access API (showSaveFilePicker) in Chromium browsers
   * to write directly to disk without triggering IDM COM error 0x80040154.
   */
  public downloadBlob(blob: Blob, fileName: string): boolean {
    const now = Date.now();
    const downloadKey = `${fileName}_${blob.size}`;

    if (this.activeDownloads.has(downloadKey) || (now - this.lastDownloadTime < this.COOLDOWN_MS && this.activeDownloads.has(fileName))) {
      console.warn(`[DownloadService] Download for "${fileName}" already in-flight or debounced. Skipping duplicate request.`);
      return false;
    }

    this.activeDownloads.add(downloadKey);
    this.lastDownloadTime = now;

    // 1. Try modern File System Access API in Chromium browsers (Edge, Chrome)
    // Completely bypasses browser extension download hijackers (IDM 0x80040154)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      (async () => {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'PDF Document (*.pdf)',
                accept: { 'application/pdf': ['.pdf'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // User dismissed the Save dialog — harmless cancel
            return;
          }
          // Fallback to safe anchor download
          this.executeAnchorDownload(blob, fileName);
        } finally {
          this.activeDownloads.delete(downloadKey);
        }
      })();
      return true;
    }

    return this.executeAnchorDownload(blob, fileName, downloadKey);
  }

  private executeAnchorDownload(blob: Blob, fileName: string, downloadKey?: string): boolean {
    try {
      // Force octet-stream MIME type to prevent download manager MIME-type sniffers from intercepting
      const safeBlob = blob.type === 'application/octet-stream'
        ? blob
        : new Blob([blob], { type: 'application/octet-stream' });

      const url = URL.createObjectURL(safeBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the object URL after browser starts processing download
      setTimeout(() => {
        URL.revokeObjectURL(url);
        if (downloadKey) this.activeDownloads.delete(downloadKey);
      }, 5000);

      return true;
    } catch (err) {
      if (downloadKey) this.activeDownloads.delete(downloadKey);
      console.error(`[DownloadService] Failed to trigger download for "${fileName}":`, err);
      throw err;
    }
  }

  /**
   * Fetches a protected resource using fetch() and streams it into a Blob before downloading,
   * avoiding direct navigation to signed URLs.
   */
  public async downloadFromUrl(url: string, fileName: string): Promise<boolean> {
    const downloadKey = fileName;
    if (this.activeDownloads.has(downloadKey)) {
      console.warn(`[DownloadService] URL download for "${fileName}" already in-flight. Skipping duplicate.`);
      return false;
    }

    this.activeDownloads.add(downloadKey);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document for download: HTTP ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      return this.downloadBlob(blob, fileName);
    } finally {
      this.activeDownloads.delete(downloadKey);
    }
  }
}

export const downloadService = new DownloadService();
export { DownloadService };
