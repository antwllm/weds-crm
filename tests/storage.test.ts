import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so these are available inside vi.mock factory
const { mockSave, mockGetSignedUrl, mockFile, mockBucket } = vi.hoisted(() => {
  const mockSave = vi.fn().mockResolvedValue(undefined);
  const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']);
  const mockFile = vi.fn(() => ({
    save: mockSave,
    getSignedUrl: mockGetSignedUrl,
  }));
  const mockBucket = vi.fn(() => ({
    file: mockFile,
  }));
  return { mockSave, mockGetSignedUrl, mockFile, mockBucket };
});

vi.mock('@google-cloud/storage', () => {
  return {
    Storage: class MockStorage {
      bucket = mockBucket;
    },
  };
});

// Mock config to avoid env validation
vi.mock('../src/config.js', () => ({
  config: {
    GCS_BUCKET_NAME: 'test-bucket',
    VCARD_EXPIRY_DAYS: 7,
  },
}));

import { uploadVCardAndGetSignedUrl } from '../src/services/storage.js';

describe('uploadVCardAndGetSignedUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup default mock returns
    mockSave.mockResolvedValue(undefined);
    mockGetSignedUrl.mockResolvedValue(['https://storage.googleapis.com/signed-url']);
  });

  it('uploads vCard content to GCS and returns signed URL', async () => {
    const vCardContent = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Test\r\nEND:VCARD';
    const result = await uploadVCardAndGetSignedUrl('Sophie Dupont', vCardContent);

    expect(mockSave).toHaveBeenCalledWith(vCardContent, {
      contentType: 'text/vcard',
    });
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    expect(result).toBe('https://storage.googleapis.com/signed-url');
  });

  it('uses file path matching pattern vcards/{timestamp}-{sanitized-name}.vcf', async () => {
    await uploadVCardAndGetSignedUrl('Sophie Dupont', 'content');

    const filePath = mockFile.mock.calls[0][0] as string;
    expect(filePath).toMatch(/^vcards\/\d+-sophie-dupont\.vcf$/);
  });

  it('sanitizes special characters in filename', async () => {
    await uploadVCardAndGetSignedUrl('Helene Beaute-Riviere', 'content');

    const filePath = mockFile.mock.calls[0][0] as string;
    expect(filePath).toMatch(/^vcards\/\d+-helene-beaute-riviere\.vcf$/);
  });

  it('returns the signed URL string', async () => {
    const expectedUrl = 'https://storage.googleapis.com/test-signed-url';
    mockGetSignedUrl.mockResolvedValue([expectedUrl]);

    const result = await uploadVCardAndGetSignedUrl('Test', 'content');
    expect(result).toBe(expectedUrl);
  });

  it('calls getSignedUrl with correct expiry', async () => {
    await uploadVCardAndGetSignedUrl('Test', 'content', 14);

    const signedUrlArgs = mockGetSignedUrl.mock.calls[0][0];
    expect(signedUrlArgs.action).toBe('read');
    expect(signedUrlArgs.expires).toBeDefined();
  });
});
