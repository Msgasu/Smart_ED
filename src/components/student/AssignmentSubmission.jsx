import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { submitAssignment, uploadAssignmentFile, getAssignmentFiles, deleteAssignmentFile } from '../../backend/students/assignments';
import { FaFileUpload, FaFile, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel, FaFileAlt, FaTimes, FaTrash, FaCheck, FaDownload } from 'react-icons/fa';
import './styles/AssignmentSubmission.css';

const AssignmentSubmission = ({ assignmentId, studentId }) => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef();
  const [downloading, setDownloading] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);

  useEffect(() => {
    checkSubmission();
  }, [assignmentId, studentId]);

  const checkSubmission = async () => {
    try {
      setLoading(true);
      // Check for existing submission
      const { data, error } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubmission(data);
      
      if (data) {
        setDescription(data.description || '');
        // Fetch uploaded files if submission exists
        fetchSubmittedFiles();
      }
    } catch (error) {
      console.error('Error checking submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedFiles = async () => {
    try {
      const { data, error } = await getAssignmentFiles(assignmentId, studentId);
      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error) {
      console.error('Error fetching submitted files:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    // Reset file input
    e.target.value = null;
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleDeleteFile = async (fileId) => {
    try {
      const { success, error } = await deleteAssignmentFile(fileId, studentId);
      if (error) throw error;
      
      if (success) {
        toast.success('File deleted successfully');
        // Refresh file list
        setUploadedFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      
      // First submit the assignment to get the student_assignment_id
      const submissionData = {
        description
      };
      
      const { data: submissionResult, error: submissionError } = await submitAssignment(
        assignmentId, 
        studentId, 
        submissionData
      );
      
      if (submissionError) throw submissionError;
      
      // Upload each file
      const uploadPromises = files.map(file => 
        uploadAssignmentFile(assignmentId, studentId, file, submissionResult.id)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Check for any upload errors
      const uploadErrors = uploadResults.filter(result => result.error);
      if (uploadErrors.length > 0) {
        throw new Error(`${uploadErrors.length} files failed to upload`);
      }
      
      setSubmission(submissionResult);
      setFiles([]);
      toast.success('Assignment submitted successfully!');
      
      // Refresh the file list
      fetchSubmittedFiles();
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Helper function to get the appropriate file icon based on file type
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return <FaFilePdf />;
    if (fileType.includes('image')) return <FaFileImage />;
    if (fileType.includes('word') || fileType.includes('document')) return <FaFileWord />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FaFileExcel />;
    return <FaFileAlt />;
  };

  // Helper function to format file size
  const formatFileSize = (size) => {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileDownload = async (file, e) => {
    e.preventDefault();
    try {
      setDownloading(file.id);
      console.log("Complete file object:", file);
      
      if (file.path) {
        try {
          const fullPath = file.path.startsWith('assignment_files/') 
            ? file.path 
            : `assignment_files/${file.path}`;
          
          console.log("Attempting to download with path:", fullPath);
          
          // Generate a signed URL with longer expiration time (1 hour)
          const { data, error } = await supabase
            .storage
            .from('assignments')
            .createSignedUrl(fullPath, 3600);
          
          if (error) {
            console.error("Error generating signed URL:", error);
            throw error;
          }
          
          if (data?.signedUrl) {
            console.log("Successfully generated signed URL:", data.signedUrl);
            window.open(data.signedUrl, '_blank');
            toast.success('Download started in new tab!');
            setTimeout(() => setDownloading(null), 2000);
            return;
          } else {
            throw new Error("No signed URL returned");
          }
        } catch (error) {
          console.error("Download failed:", error);
          
          // Try the URL stored in the database as a fallback
          if (file.url && file.url.startsWith('http')) {
            console.log("Trying stored URL as fallback...");
            window.open(file.url, '_blank');
            toast.success('Trying alternative download method...');
            return;
          }
          
          throw error;
        }
      } else if (file.url && file.url.startsWith('http')) {
        // If no path but URL is available
        window.open(file.url, '_blank');
        toast.success('Opening download link...');
      } else {
        toast.error('No download link available for this file');
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error('Error downloading file: ' + error.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <div className="loading-submission">Loading...</div>;
  }

  return (
    <div className="assignment-submission-container">
      {submission ? (
        <div className="submission-details">
          <div className="submission-status">
            <span className={`status-badge ${submission.status}`}>
              {submission.status === 'graded' ? (
                <>
                  <FaCheck /> Graded
                </>
              ) : (
                <>
                  <FaCheck /> Submitted
                </>
              )}
            </span>
            {submission.status === 'graded' && (
              <div className="score-display">
                Score: {submission.score}
              </div>
            )}
          </div>
          
          {submission.description && (
            <div className="submission-description">
              <h4>Your Submission:</h4>
              <p>{submission.description}</p>
            </div>
          )}
          
          {uploadedFiles.length > 0 && (
            <div className="uploaded-files-section">
              <h4>Submitted Files</h4>
              <div className="uploaded-files-list">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="uploaded-file-item">
                    <div className="file-icon">
                      {getFileIcon(file.file_type)}
                    </div>
                    <div className="file-details">
                      <div className="file-name">{file.filename}</div>
                      <div className="file-meta">
                        {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="file-actions">
                      <button
                        className={`download-btn ${downloading === file.id ? 'downloading' : ''}`}
                        onClick={(e) => handleFileDownload(file, e)}
                        disabled={downloading === file.id}
                      >
                        {downloading === file.id ? 
                          <div className="spinner-icon"></div> : 
                          <FaDownload />
                        }
                      </button>
                      <button 
                        onClick={() => handleDeleteFile(file.id)} 
                        className="delete-btn"
                        disabled={submission.status === 'graded' || downloading === file.id}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {submission.status !== 'graded' && (
            <div className="update-submission-section">
              <h4>Update Submission</h4>
              <textarea 
                placeholder="Add additional notes (optional)"
                value={description}
                onChange={handleDescriptionChange}
                className="description-input"
              />
              
              <div className="file-upload-area">
                <div className="file-upload-header">
                  <button 
                    className="select-files-btn"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <FaFileUpload /> Select Files
                  </button>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
                
                {files.length > 0 && (
                  <div className="selected-files-list">
                    {files.map((file, index) => (
                      <div key={index} className="selected-file-item">
                        <div className="file-icon">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{formatFileSize(file.size)}</div>
                        </div>
                        <button 
                          className="remove-file-btn"
                          onClick={() => removeFile(index)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      className="update-btn"
                      onClick={handleSubmit}
                      disabled={uploading}
                    >
                      {uploading ? 'Updating...' : 'Update Submission'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="new-submission">
          <h3>Submit Assignment</h3>
          <textarea 
            placeholder="Add your submission notes here (optional)"
            value={description}
            onChange={handleDescriptionChange}
            className="description-input"
          />
          
          <div className="file-upload-area">
            <div className="file-upload-header">
              <button 
                className="select-files-btn"
                onClick={() => fileInputRef.current.click()}
              >
                <FaFileUpload /> Select Files
              </button>
              <input 
                type="file" 
                multiple 
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="file-instructions">
                Select one or more files to upload
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files-list">
                {files.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <div className="file-icon">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="file-details">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatFileSize(file.size)}</div>
                    </div>
                    <button 
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="submit-btn"
          >
            {uploading ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmission; 