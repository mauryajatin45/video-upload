'use client';

import { useState, useRef, useCallback } from 'react';

interface ValidationError {
  type: 'duration' | 'format' | 'size';
  message: string;
}

interface UploadState {
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
}

export default function UploadPage() {
  const [email, setEmail] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_DURATION = 15; // 15 seconds
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];

  const validateVideo = useCallback(async (file: File): Promise<ValidationError | null> => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        type: 'format',
        message: 'Only MP4 and MOV files are allowed',
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        type: 'size',
        message: `File size must be under 50MB (yours is ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
      };
    }

    // Check duration using HTML5 video
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = video.duration;
        setVideoDuration(duration);
        
        if (duration > MAX_DURATION) {
          resolve({
            type: 'duration',
            message: `Video must be 15 seconds or less (yours is ${duration.toFixed(1)}s)`,
          });
        } else {
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          type: 'format',
          message: 'Could not read video file. Please ensure it\'s a valid MP4 or MOV.',
        });
      };

      video.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = async (file: File) => {
    setValidationError(null);
    setUploadState({ status: 'validating', progress: 0, message: 'Checking video...' });

    const error = await validateVideo(file);
    
    if (error) {
      setValidationError(error);
      setUploadState({ status: 'idle', progress: 0, message: '' });
      setVideoFile(null);
      setVideoPreviewUrl(null);
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setUploadState({ status: 'idle', progress: 0, message: '' });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !email) return;

    setUploadState({ status: 'uploading', progress: 0, message: 'Uploading video...' });

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('email', email);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadState(prev => ({ ...prev, progress: percent }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setUploadState({
            status: 'success',
            progress: 100,
            message: response.message || 'Video uploaded successfully!',
          });
          // Reset form
          setVideoFile(null);
          setVideoPreviewUrl(null);
          setVideoDuration(null);
          setEmail('');
        } else {
          const response = JSON.parse(xhr.responseText);
          setUploadState({
            status: 'error',
            progress: 0,
            message: response.error || 'Upload failed. Please try again.',
          });
        }
      });

      xhr.addEventListener('error', () => {
        setUploadState({
          status: 'error',
          progress: 0,
          message: 'Network error. Please check your connection.',
        });
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Upload failed. Please try again.',
      });
    }
  };

  const isFormValid = email && videoFile && !validationError && uploadState.status !== 'uploading';

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Upload Your Video</h1>
          <p className="text-gray-400 text-sm">
            Max 15 seconds • MP4 or MOV • Up to 50MB
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field"
              required
              disabled={uploadState.status === 'uploading'}
            />
          </div>

          {/* Video Upload Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video File
            </label>
            <div
              className={`upload-zone p-6 text-center cursor-pointer transition-all ${
                isDragOver ? 'dragover' : ''
              } ${videoFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,video/mp4,video/quicktime"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={uploadState.status === 'uploading'}
              />
              
              {videoPreviewUrl ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    className="video-preview mx-auto"
                    controls
                  />
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">{videoFile?.name}</span>
                  </div>
                  {videoDuration && (
                    <p className="text-xs text-gray-400">
                      Duration: {videoDuration.toFixed(1)}s • Size: {((videoFile?.size || 0) / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-300 font-medium">
                      Drop your video here
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      or tap to browse
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="status-error flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{validationError.message}</span>
            </div>
          )}

          {/* Upload Progress */}
          {uploadState.status === 'uploading' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{uploadState.message}</span>
                <span className="text-indigo-400">{uploadState.progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadState.status === 'success' && (
            <div className="status-success flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{uploadState.message}</span>
            </div>
          )}

          {/* Error Message */}
          {uploadState.status === 'error' && (
            <div className="status-error flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{uploadState.message}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {uploadState.status === 'uploading' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Video
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Maximum 2 uploads per email address
        </p>
      </div>
    </main>
  );
}
