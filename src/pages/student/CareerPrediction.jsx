import React, { useState, useEffect } from 'react';
import StudentLayout from '../../components/student/StudentLayout';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase'; // Keep supabase if needed for user info
import './styles/CareerPrediction.css'; // Import the CSS file

// Updated prediction function to take both interests and desired career
const runCareerPrediction = async (studentId, interests, desiredCareer) => {
  console.log(`Running career prediction for student: ${studentId}`);
  console.log(`Interests: ${interests}`);
  console.log(`Desired career: ${desiredCareer}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple logic that considers both inputs
  let predictions = [];
  
  // If they have a desired career, prioritize suggestions related to that field
  if (desiredCareer && desiredCareer.trim() !== '') {
    const career = desiredCareer.toLowerCase();
    
    if (career.includes('engineer') || career.includes('developer')) {
      predictions.push('Software Engineer', 'Civil Engineer', 'Mechanical Engineer');
    } else if (career.includes('doctor') || career.includes('medicine')) {
      predictions.push('Physician', 'Surgeon', 'Medical Specialist');
    } else if (career.includes('business') || career.includes('entrepreneur')) {
      predictions.push('Business Analyst', 'Entrepreneur', 'Financial Advisor');
    }
  }
  
  // If we already have predictions based on desired career but also have interests,
  // we can refine or add more options based on interests
  if (interests && interests.trim() !== '') {
    const interest = interests.toLowerCase();
    
    if (interest.includes('computer') || interest.includes('technology')) {
      if (!predictions.includes('Software Engineer')) {
        predictions.push('Software Engineer', 'Data Scientist', 'Cybersecurity Analyst');
      }
    } else if (interest.includes('art') || interest.includes('design')) {
      predictions.push('Graphic Designer', 'Illustrator', 'UX/UI Designer');
    } else if (interest.includes('health') || interest.includes('medicine')) {
      predictions.push('Nurse', 'Doctor', 'Physical Therapist');
    } else if (interest.includes('teaching') || interest.includes('helping')) {
      predictions.push('Teacher', 'Counselor', 'Social Worker');
    } else if (interest.includes('business') || interest.includes('finance')) {
      predictions.push('Marketing Manager', 'Financial Analyst', 'Project Manager');
    }
  }
  
  // Remove duplicates and limit to 5 suggestions
  const uniquePredictions = [...new Set(predictions)];
  return uniquePredictions.slice(0, 5);
};

const CareerPrediction = () => {
  const { studentId } = useParams(); // Keep if studentId is needed for the API call
  const [interests, setInterests] = useState('');
  const [desiredCareer, setDesiredCareer] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredictClick = async () => {
    if (!interests.trim() && !desiredCareer.trim()) {
      toast.error('Please enter your interests or desired career.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPredictions([]);

      const currentStudentId = studentId || 'current_user_id';
      const result = await runCareerPrediction(currentStudentId, interests, desiredCareer);
      
      if (result.length === 0) {
        setError('Unable to generate career predictions. Please try with more specific interests or career goals.');
        toast.error('No predictions found.');
      } else {
        setPredictions(result);
        toast.success('Career predictions generated!');
      }
    } catch (err) {
      console.error('Error running career prediction:', err);
      setError('Failed to generate career predictions. Please try again.');
      toast.error('Failed to generate career predictions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StudentLayout>
      <div className="career-prediction-container">
        <h1 className="career-prediction-header">Career Prediction</h1>
        <p className="career-prediction-description">
          Enter your interests and desired future career, and we'll suggest potential career paths based on our prediction model.
        </p>

        <div className="input-area">
          <label htmlFor="interests" className="interest-label">What are your interests and hobbies?</label>
          <textarea
            id="interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g., computer programming, video games, drawing, helping people..."
            rows={3}
            className="interests-textarea"
            disabled={loading}
          />
          
          <label htmlFor="desiredCareer" className="interest-label">What is your desired future career? (Optional)</label>
          <textarea
            id="desiredCareer"
            value={desiredCareer}
            onChange={(e) => setDesiredCareer(e.target.value)}
            placeholder="e.g., Software Engineer, Doctor, Business Owner..."
            rows={2}
            className="interests-textarea"
            disabled={loading}
          />
          
          <button 
            onClick={handlePredictClick} 
            disabled={loading} 
            className="predict-button"
          >
            {loading ? 'Predicting...' : 'Predict Careers'}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {predictions.length > 0 && (
          <div className="results-container">
            <h2 className="results-header">Suggested Career Paths:</h2>
            <ul className="results-list">
              {predictions.map((career, index) => (
                <li key={index} className="results-item">{career}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

// Ensure the default export is present
export default CareerPrediction; 