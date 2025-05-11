import React, { useState } from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import './styles/CareerPrediction.css';

const CareerPrediction = () => {
  const [loading, setLoading] = useState(true);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <StudentLayout>
      <div className="career-prediction-container">
        <h1 className="career-prediction-header">Career Prediction</h1>
        <p className="career-prediction-description">
          Use the tool below to get personalized career recommendations based on your interests, strengths, and academic performance.
        </p>

        {loading && (
          <div className="loading-container">
            <p>Loading career prediction tool...</p>
            <div className="loading-spinner"></div>
          </div>
        )}
        
        <div className="gradio-container" style={{ height: '800px', width: '100%' }}>
          <iframe
            src="https://msgasu-career-recommender.hf.space"
            title="Career Prediction Tool"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            style={{ display: loading ? 'none' : 'block' }}
          ></iframe>
        </div>
      </div>
    </StudentLayout>
  );
};

export default CareerPrediction; 