import { Storage } from '@google-cloud/storage';
import { config } from '../config.js';

const storage = new Storage();

/**
 * Sanitize a name for use in a filename.
 * Lowercases, replaces spaces with hyphens, removes non-alphanumeric chars except hyphens.
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Upload vCard content to GCS and return a signed URL.
 *
 * @param name - Lead name (used in filename)
 * @param vCardContent - The VCF content to upload
 * @param expiryDays - Number of days until the signed URL expires (default from config)
 * @returns Signed URL for the uploaded vCard
 */
export async function uploadVCardAndGetSignedUrl(
  name: string,
  vCardContent: string,
  expiryDays?: number,
): Promise<string> {
  const bucketName = config.GCS_BUCKET_NAME!;
  const sanitized = sanitizeName(name);
  const filePath = `vcards/${Date.now()}-${sanitized}.vcf`;

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  await file.save(vCardContent, {
    contentType: 'text/vcard',
  });

  const expiry = expiryDays ?? config.VCARD_EXPIRY_DAYS;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiry);

  const [signedUrl] = await file.getSignedUrl({
    action: 'read' as const,
    expires: expiresAt,
  });

  return signedUrl;
}
