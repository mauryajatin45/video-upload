import { MongoClient } from 'mongodb';

const MAX_UPLOADS_PER_EMAIL = 2;

// MongoDB connection (cached for serverless)
let cachedClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MongoDB not configured. Set MONGODB_URI environment variable. ' +
      'Get a free database at: https://www.mongodb.com/atlas'
    );
  }

  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

interface UploadRecord {
  email: string;
  count: number;
  uploads: Array<{
    timestamp: Date;
    fileName: string;
    fileId?: string;
  }>;
}

/**
 * Get the current upload count for an email
 */
export async function getUploadCount(email: string): Promise<number> {
  const client = await getMongoClient();
  const db = client.db('video-upload');
  const collection = db.collection<UploadRecord>('uploads');
  
  const normalizedEmail = email.toLowerCase().trim();
  const record = await collection.findOne({ email: normalizedEmail });
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
  const client = await getMongoClient();
  const db = client.db('video-upload');
  const collection = db.collection<UploadRecord>('uploads');
  
  const normalizedEmail = email.toLowerCase().trim();

  // Get existing record
  const record = await collection.findOne({ email: normalizedEmail });

  // Check limit
  if (record && record.count >= MAX_UPLOADS_PER_EMAIL) {
    return {
      success: false,
      remaining: 0,
      error: `Maximum ${MAX_UPLOADS_PER_EMAIL} uploads per email reached`,
    };
  }

  // Upsert the record
  await collection.updateOne(
    { email: normalizedEmail },
    {
      $inc: { count: 1 },
      $push: {
        uploads: {
          timestamp: new Date(),
          fileName,
          fileId,
        },
      },
      $setOnInsert: { email: normalizedEmail },
    },
    { upsert: true }
  );

  const newCount = (record?.count || 0) + 1;

  return {
    success: true,
    remaining: MAX_UPLOADS_PER_EMAIL - newCount,
  };
}

/**
 * Get upload history for an email
 */
export async function getUploadHistory(email: string) {
  const client = await getMongoClient();
  const db = client.db('video-upload');
  const collection = db.collection<UploadRecord>('uploads');
  
  const normalizedEmail = email.toLowerCase().trim();
  const record = await collection.findOne({ email: normalizedEmail });
  return record?.uploads || [];
}
