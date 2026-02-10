// Cloudflare R2 Storage Utilities
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

let r2Client = null;

if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
}

/**
 * Delete a file from R2 by its public URL
 * Extracts the key from the URL and deletes the object.
 * Fails silently — orphaned files are non-critical.
 *
 * @param {string} fileUrl - The full public URL (e.g. https://cdn.example.com/thumbnails/abc.jpg)
 */
async function deleteR2File(fileUrl) {
  if (!r2Client || !fileUrl || !process.env.R2_PUBLIC_URL) return;

  try {
    // Extract key from URL: remove the R2_PUBLIC_URL prefix
    const key = fileUrl.replace(process.env.R2_PUBLIC_URL + '/', '');
    if (!key || key === fileUrl) return; // URL didn't match, skip

    await r2Client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key
    }));
  } catch (err) {
    console.error('R2 delete error:', err.message);
  }
}

/**
 * Delete multiple R2 files (fire-and-forget)
 * @param {string[]} fileUrls
 */
async function deleteR2Files(fileUrls) {
  await Promise.all(fileUrls.filter(Boolean).map(deleteR2File));
}

module.exports = { deleteR2File, deleteR2Files };
