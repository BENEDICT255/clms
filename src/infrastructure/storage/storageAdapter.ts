import { supabase } from '../supabase/client';

export interface IStorageAdapter {
  createSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>;
  uploadFile(bucket: string, path: string, file: File | Blob): Promise<{ path: string }>;
}

export class SupabaseStorageAdapter implements IStorageAdapter {
  private readonly defaultBucket = 'commercial-documents';

  /**
   * Generates a temporary signed download URL for private documents.
   * Default expiry is 300 seconds (5 minutes).
   */
  async createSignedUrl(
    bucket = this.defaultBucket,
    path: string,
    expiresInSeconds = 300
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed document URL: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  async uploadFile(
    bucket = this.defaultBucket,
    path: string,
    file: File | Blob
  ): Promise<{ path: string }> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
    });

    if (error || !data?.path) {
      throw new Error(`Failed to upload private commercial document: ${error?.message}`);
    }

    return { path: data.path };
  }
}

export const storageAdapter = new SupabaseStorageAdapter();
