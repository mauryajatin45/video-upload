import { NextRequest, NextResponse } from 'next/server';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { canUpload, recordUpload, getRemainingUploads } from '@/lib/uploadTracker';

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

    // Check upload limit (2 per email)
    const canUploadMore = await canUpload(email);
    if (!canUploadMore) {
      return NextResponse.json(
        { error: 'You have reached the maximum of 2 uploads for this email address' },
        { status: 429 }
      );
    }

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

    // Record the upload
    await recordUpload(email, video.name, uploadResult.fileId);
    
    const remaining = await getRemainingUploads(email);

    return NextResponse.json({
      success: true,
      message: remaining > 0 
        ? `Video uploaded successfully! You have ${remaining} upload${remaining === 1 ? '' : 's'} remaining.`
        : 'Video uploaded successfully! This was your last allowed upload.',
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
