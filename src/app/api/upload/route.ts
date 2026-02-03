import { NextRequest, NextResponse } from 'next/server';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { recordUpload } from '@/lib/uploadTracker';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const video = formData.get('video') as File | null;
    const email = formData.get('email') as string | null;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Validate video presence
    if (!video) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    // Validate file type only - no size limit
    if (!ALLOWED_TYPES.includes(video.type)) {
      return NextResponse.json(
        { error: 'Only MP4 and MOV files are allowed' },
        { status: 400 }
      );
    }

    // No upload limit check - users can upload as many as they want

    // Convert File to Buffer
    const arrayBuffer = await video.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const uploadResult = await uploadToGoogleDrive(
      buffer,
      video.name,
      video.type,
      email
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload video' },
        { status: 500 }
      );
    }

    // Record the upload (for tracking purposes, but no limit enforced)
    await recordUpload(email, video.name, uploadResult.fileId);

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully! Thank you for sharing your KYST moment.',
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
