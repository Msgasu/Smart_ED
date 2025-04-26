import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { useFontSize } from '../context/FontSizeContext';
import './styles/FontSizeToggle.css';

const FontSizeToggle = () => {
  const { fontSizeLevel, cycleFontSize } = useFontSize();
  
  return (
    <button 
      className="font-size-toggle" 
      onClick={cycleFontSize}
      aria-label={`Toggle font size. Current level: ${fontSizeLevel + 1} of 3`}
      title="Increase font size for easier reading"
    >
      <FaPlus />
      <span className="font-size-level">{fontSizeLevel + 1}</span>
      <span className="sr-only">Adjust font size</span>
    </button>
  );
};

export default FontSizeToggle; 