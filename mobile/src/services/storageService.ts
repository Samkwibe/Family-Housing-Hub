import api from './api';

export async function getStorageStatus() {
  return api.request<{ configured: boolean }>('/api/storage/status');
}

export async function getUploadUrl(payload: {
  filename: string;
  contentType: string;
  folder: 'documents' | 'checklist';
}) {
  return api.request<{
    uploadUrl: string;
    fileKey: string;
    contentType: string;
    householdId: string;
  }>('/api/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDownloadUrl(fileKey: string, filename?: string) {
  return api.request<{ downloadUrl: string }>('/api/storage/download-url', {
    method: 'POST',
    body: JSON.stringify({ fileKey, filename }),
  });
}

/** Upload a local file URI to a presigned PUT URL. */
export async function uploadFileToPresignedUrl(
  localUri: string,
  uploadUrl: string,
  contentType: string,
) {
  const blob = await (await fetch(localUri)).blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}
