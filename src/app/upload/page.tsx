'use client';

import { useState, useRef, useCallback } from 'react';

export default function UploadPage() {
  const [email, setEmail] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateVideo = useCallback(async (file: File): Promise<string | null> => {
    // Only check file type - no size or duration limits
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) {
      return 'Please upload an MP4 or MOV file';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setMessage(null);
    
    const error = await validateVideo(file);
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    setVideo(file);
    setVideoUrl(URL.createObjectURL(file));
  }, [validateVideo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeVideo = useCallback(() => {
    setVideo(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [videoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !video) {
      setMessage({ type: 'error', text: 'Please enter your email and select a video' });
      return;
    }

    if (!email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setMessage(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('video', video);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onload = () => {
        setIsUploading(false);
        
        try {
          const response = JSON.parse(xhr.responseText);
          
          if (xhr.status === 200 && response.success) {
            setMessage({ type: 'success', text: response.message || 'Video uploaded successfully! Thank you for sharing your KYST moment.' });
            setEmail('');
            removeVideo();
          } else {
            setMessage({ type: 'error', text: response.error || 'Upload failed. Please try again.' });
          }
        } catch {
          setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setMessage({ type: 'error', text: 'Network error. Please check your connection.' });
      };

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch {
      setIsUploading(false);
      setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        {/* <h1 className="upload-title">Share Your KYST Moment</h1>
        <p className="upload-subtitle">
          Upload your reaction video — gift opening, happy tears, bridesmaid chaos… anything.
        </p> */}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Your Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isUploading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Your Video</label>
            
            {!video ? (
              <div
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="drop-zone-icon">🎬</div>
                <p className="drop-zone-text">Tap to select or drag your video here</p>
                <p className="drop-zone-hint">MP4 or MOV format</p>
              </div>
            ) : (
              <div className="video-preview">
                {videoUrl && (
                  <video src={videoUrl} controls playsInline />
                )}
                <div className="video-info">
                  <span className="video-name">{video.name}</span>
                  <button type="button" className="video-remove" onClick={removeVideo}>
                    Remove
                  </button>
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!email || !video || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Your Video'}
          </button>

          {isUploading && (
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="progress-text">{uploadProgress}% uploaded</p>
            </div>
          )}

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </form>

        <p className="footer-note">
          By uploading, you agree that William &amp; Flo Gift may repost your video (with credit).
        </p>
      </div>
    </div>
  );
}
