import { Redis } from '@upstash/redis';

const MAX_UPLOADS_PER_EMAIL = 2;

// Initialize Redis client - will use REST API (works in serverless)
function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. ' +
      'Get free credentials at: https://console.upstash.com/'
    );
  }

  return new Redis({ url, token });
}

interface UploadRecord {
  count: number;
  uploads: Array<{
    timestamp: string;
    fileName: string;
    fileId?: string;
  }>;
}

/**
 * Get the current upload count for an email
 */
export async function getUploadCount(email: string): Promise<number> {
  const redis = getRedis();
  const normalizedEmail = email.toLowerCase().trim();
  const record = await redis.get<UploadRecord>(`uploads:${normalizedEmail}`);
  return record?.count || 0;
}

/**
 * Check if an email can still upload (hasn't reached limit)
 */
export async function canUpload(email: string): Promise<boolean> {
  const count = await getUploadCount(email);
  return count < MAX_UPLOADS_PER_EMAIL;
}

/**
 * Get remaining uploads for an email
 */
export async function getRemainingUploads(email: string): Promise<number> {
  const count = await getUploadCount(email);
  return Math.max(0, MAX_UPLOADS_PER_EMAIL - count);
}

/**
 * Record a new upload for an email
 */
export async function recordUpload(
  email: string,
  fileName: string,
  fileId?: string
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const redis = getRedis();
  const normalizedEmail = email.toLowerCase().trim();
  const key = `uploads:${normalizedEmail}`;
  
  // Get existing record
  let record = await redis.get<UploadRecord>(key);

  // Initialize if needed
  if (!record) {
    record = { count: 0, uploads: [] };
  }

  // Check limit
  if (record.count >= MAX_UPLOADS_PER_EMAIL) {
    return {
      success: false,
      remaining: 0,
      error: `Maximum ${MAX_UPLOADS_PER_EMAIL} uploads per email reached`,
    };
  }

  // Record the upload
  record.count += 1;
  record.uploads.push({
    timestamp: new Date().toISOString(),
    fileName,
    fileId,
  });

  // Save to Redis (expire after 30 days)
  await redis.set(key, record, { ex: 60 * 60 * 24 * 30 });

  return {
    success: true,
    remaining: MAX_UPLOADS_PER_EMAIL - record.count,
  };
}

/**
 * Get upload history for an email
 */
export async function getUploadHistory(email: string) {
  const redis = getRedis();
  const normalizedEmail = email.toLowerCase().trim();
  const record = await redis.get<UploadRecord>(`uploads:${normalizedEmail}`);
  return record?.uploads || [];
}
