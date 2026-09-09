// ==============================================================================
// CLMS Commercial Document Storage Service
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Sections 34-38:
// - Centralized Storage authority: path sanitization, MIME validation, hashing,
//   atomic upload, signed URL generation, Blob streaming, and orphan cleanup
// - Stable UUID/version storage paths (no Date.now() as document identity)
// - Private storage only: short-lived authenticated access, zero public buckets
// - Complete provenance integrity: SHA-256, real sizes, and strict validation
// ==============================================================================

import { supabase } from '@/infrastructure/supabase/client';
import { computeSHA256 } from '@/domain/commercial/Hashing';

export interface StoredDocumentMetadata {
  id?: string;
  documentType: string;
  entityType: string;
  entityId: string;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  version?: number;
  isImmutable?: boolean;
}

export interface UploadDocumentOptions {
  bucket?: string;
  upsert?: boolean;
  version?: number;
  isImmutable?: boolean;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.ts', '.html', '.htm', '.php'
];

export class DocumentStorageService {
  private defaultBucket = 'commercial-documents';

  /**
   * Sanitizes a filename to avoid path traversal and dangerous characters.
   */
  public sanitizeFileName(fileName: string): string {
    const base = fileName.split(/[/\\\\]/).pop() || 'document';
    const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    const lower = cleaned.toLowerCase();
    for (const ext of DANGEROUS_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        throw new Error(`DISALLOWED_FILE_TYPE: File extension "${ext}" is not permitted for commercial documents.`);
      }
    }
    return cleaned;
  }

  /**
   * Validates file size and MIME type.
   */
  public validateFile(file: File | Blob, fileName: string, maxSizeMb = 50): void {
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size <= 0) {
      throw new Error('EMPTY_FILE: Document must not be empty.');
    }
    if (file.size > maxBytes) {
      throw new Error(`FILE_TOO_LARGE: Document size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${maxSizeMb} MB.`);
    }

    const mime = file.type || '';
    if (mime && !ALLOWED_MIME_TYPES.has(mime) && !fileName.toLowerCase().endsWith('.pdf') && !fileName.toLowerCase().endsWith('.xlsx')) {
      throw new Error(`UNSUPPORTED_MIME_TYPE: File type "${mime}" is not permitted for commercial documents.`);
    }
  }

  /**
   * Generates a stable internal storage path according to Section 35.
   */
  public buildStoragePath(params: {
    entityType: 'COMMERCIAL_PACKAGE' | 'PURCHASE_ORDER' | 'CERTIFICATE' | 'INVOICE' | 'PAYMENT';
    entityId: string;
    subfolder: 'source' | 'signed' | 'supporting' | 'packets';
    fileName: string;
    version?: number;
  }): string {
    const sanitized = this.sanitizeFileName(params.fileName);
    const versionPrefix = params.version ? `v${params.version}_` : '';
    switch (params.entityType) {
      case 'COMMERCIAL_PACKAGE':
        return `commercial-packages/${params.entityId}/source/${versionPrefix}${sanitized}`;
      case 'PURCHASE_ORDER':
        return `purchase-orders/${params.entityId}/source/${versionPrefix}${sanitized}`;
      case 'CERTIFICATE':
        return `certificates/${params.entityId}/${params.subfolder}/${versionPrefix}${sanitized}`;
      case 'INVOICE':
        return `invoices/${params.entityId}/${params.subfolder}/${versionPrefix}${sanitized}`;
      case 'PAYMENT':
        return `payments/${params.entityId}/evidence/${versionPrefix}${sanitized}`;
      default:
        return `misc/${params.entityId}/${versionPrefix}${sanitized}`;
    }
  }

  /**
   * Uploads a file buffer/Blob strictly to private Storage and verifies success.
   * If metadata creation subsequently fails, callers can invoke cleanupOrphan.
   */
  public async uploadToStorage(
    storagePath: string,
    file: File | Blob | Uint8Array,
    mimeType = 'application/pdf',
    bucket = this.defaultBucket
  ): Promise<{ success: boolean; storagePath: string; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          upsert: true,
          contentType: mimeType,
        });

      if (error) {
        return { success: false, storagePath, error: error.message };
      }

      return { success: true, storagePath };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown storage upload error';
      return { success: false, storagePath, error: msg };
    }
  }

  /**
   * Streams a private document as an in-memory Blob without navigating to external URLs or triggering IDM.
   */
  public async fetchBlob(storagePath: string, bucket = this.defaultBucket): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (error || !data) {
      // Fallback: Attempt authenticated signed URL fetch
      const { data: urlData, error: urlErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 300);

      if (urlErr || !urlData?.signedUrl) {
        throw new Error(`DOCUMENT_FETCH_FAILED: Could not download stored file "${storagePath}": ${error?.message || urlErr?.message}`);
      }

      const res = await fetch(urlData.signedUrl);
      if (!res.ok) {
        throw new Error(`DOCUMENT_FETCH_FAILED: HTTP ${res.status} when fetching "${storagePath}".`);
      }
      return await res.blob();
    }

    return data;
  }

  /**
   * Alias for fetchBlob
   */
  public async downloadBlob(storagePath: string, bucket = this.defaultBucket): Promise<Blob> {
    return this.fetchBlob(storagePath, bucket);
  }

  /**
   * Creates a short-lived authenticated signed URL for legitimate on-demand operations.
   */
  public async getSignedUrl(storagePath: string, expiresInSeconds = 3600, bucket = this.defaultBucket): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    } catch {
      return null;
    }
  }

  /**
   * Safely deletes an orphaned storage object or staged draft file.
   */
  public async deleteFromStorage(storagePath: string, bucket = this.defaultBucket): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([storagePath]);

      if (error) {
        console.warn(`[DocumentStorageService] Storage delete warning for "${storagePath}":`, error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`[DocumentStorageService] Storage delete exception for "${storagePath}":`, err);
      return false;
    }
  }

  /**
   * Helper to compute SHA-256 checksum from File or Blob.
   */
  public async computeChecksum(file: File | Blob): Promise<string> {
    const buffer = await file.arrayBuffer();
    return computeSHA256(buffer);
  }
}

export const documentStorageService = new DocumentStorageService();
