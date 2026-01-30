import { google } from 'googleapis';
import { Readable } from 'stream';

// Create OAuth2 client from environment variables
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/api/auth/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
}

/**
 * Upload a video file to Google Drive
 * @param fileBuffer - The file buffer to upload
 * @param fileName - Original filename
 * @param mimeType - MIME type of the file
 * @param email - Email of the uploader (for naming)
 */
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  email: string
): Promise<UploadResult> {
  try {
    const auth = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Create a unique filename with timestamp and email
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const extension = fileName.split('.').pop() || 'mp4';
    const uniqueFileName = `${sanitizedEmail}_${timestamp}.${extension}`;

    // Convert buffer to readable stream
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    // Build request body - only include parents if folder ID is set
    const requestBody: { name: string; description: string; parents?: string[] } = {
      name: uniqueFileName,
      description: `Uploaded by: ${email} at ${new Date().toISOString()}`,
    };

    if (folderId) {
      requestBody.parents = [folderId];
    }

    const response = await drive.files.create({
      requestBody,
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });

    return {
      success: true,
      fileId: response.data.id || undefined,
      fileName: response.data.name || undefined,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error) {
    console.error('Google Drive upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to Google Drive',
    };
  }
}
