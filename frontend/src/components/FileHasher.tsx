import React, { useState, useCallback, useRef } from 'react';
import './FileHasher.css';

interface FileHasherProps {
  onHashGenerated: (hash: string, filename: string) => void;
  disabled?: boolean;
  maxFileSize?: number; // in MB
}

const FileHasher: React.FC<FileHasherProps> = ({
  onHashGenerated,
  disabled = false,
  maxFileSize = 100, // 100MB default limit
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; hash: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hash file using browser's SubtleCrypto API
  const hashFile = useCallback(async (file: File): Promise<string> => {
    setIsHashing(true);
    setError(null);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Hash with SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    } catch (err) {
      throw new Error(
        `Failed to hash file: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsHashing(false);
    }
  }, []);

  // Validate file before processing
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        return `File size (${fileSizeMB.toFixed(1)}MB) exceeds limit of ${maxFileSize}MB`;
      }

      // No file type restrictions - we can hash any file
      return null;
    },
    [maxFileSize]
  );

  // Process dropped/selected file
  const processFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        const hash = await hashFile(file);
        setLastFile({ name: file.name, hash });
        onHashGenerated(hash, file.name);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process file');
      }
    },
    [validateFile, hashFile, onHashGenerated]
  );

  // Handle drag events
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled || isHashing) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]); // Only process first file
      }
    },
    [disabled, isHashing, processFile]
  );

  // Handle file input change
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset input value to allow selecting same file again
      if (e.target) {
        e.target.value = '';
      }
    },
    [processFile]
  );

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && !isHashing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isHashing]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="file-hasher">
      <div className="file-hasher-header">
        <h4>File Hasher</h4>
        <p>Drop a file or click to select, and we'll use its SHA-256 hash as your private key.</p>
      </div>

      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''} ${isHashing ? 'hashing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop file or click to select file for hashing"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
          aria-hidden="true"
        />

        <div className="drop-zone-content">
          {isHashing ? (
            <>
              <div className="hashing-icon">⚡</div>
              <div className="drop-zone-text">
                <strong>Hashing file...</strong>
                <small>Computing SHA-256 hash</small>
              </div>
            </>
          ) : (
            <>
              <div className="upload-icon">📁</div>
              <div className="drop-zone-text">
                <strong>Drop file here or click to select</strong>
                <small>Any file type • Max {maxFileSize}MB</small>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {lastFile && !error && (
        <div className="file-result">
          <div className="result-header">
            <span className="success-icon">✅</span>
            <strong>File processed successfully!</strong>
          </div>
          <div className="file-info">
            <div className="file-detail">
              <label>File:</label>
              <span>{lastFile.name}</span>
            </div>
            <div className="file-detail">
              <label>SHA-256:</label>
              <code className="hash-display">{lastFile.hash}</code>
            </div>
          </div>
        </div>
      )}

      <div className="file-hasher-info">
        <small className="help-text">
          <strong>Privacy:</strong> Files are processed entirely in your browser. Nothing is
          uploaded to our servers.
        </small>
      </div>
    </div>
  );
};

export default FileHasher;
