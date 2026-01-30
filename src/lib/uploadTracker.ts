import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TRACKER_FILE = path.join(DATA_DIR, 'upload-tracker.json');
const MAX_UPLOADS_PER_EMAIL = 2;

interface TrackerData {
  [email: string]: {
    count: number;
    uploads: Array<{
      timestamp: string;
      fileName: string;
      fileId?: string;
    }>;
  };
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readTracker(): Promise<TrackerData> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(TRACKER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist yet, return empty object
    return {};
  }
}

async function writeTracker(data: TrackerData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TRACKER_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get the current upload count for an email
 */
export async function getUploadCount(email: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim();
  const tracker = await readTracker();
  return tracker[normalizedEmail]?.count || 0;
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
  const normalizedEmail = email.toLowerCase().trim();
  const tracker = await readTracker();

  // Initialize if needed
  if (!tracker[normalizedEmail]) {
    tracker[normalizedEmail] = { count: 0, uploads: [] };
  }

  // Check limit
  if (tracker[normalizedEmail].count >= MAX_UPLOADS_PER_EMAIL) {
    return {
      success: false,
      remaining: 0,
      error: `Maximum ${MAX_UPLOADS_PER_EMAIL} uploads per email reached`,
    };
  }

  // Record the upload
  tracker[normalizedEmail].count += 1;
  tracker[normalizedEmail].uploads.push({
    timestamp: new Date().toISOString(),
    fileName,
    fileId,
  });

  await writeTracker(tracker);

  return {
    success: true,
    remaining: MAX_UPLOADS_PER_EMAIL - tracker[normalizedEmail].count,
  };
}

/**
 * Get upload history for an email
 */
export async function getUploadHistory(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const tracker = await readTracker();
  return tracker[normalizedEmail]?.uploads || [];
}
