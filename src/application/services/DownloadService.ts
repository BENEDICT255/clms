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

    try {
      const url = URL.createObjectURL(blob);
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
        this.activeDownloads.delete(downloadKey);
      }, 5000);

      return true;
    } catch (err) {
      this.activeDownloads.delete(downloadKey);
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
