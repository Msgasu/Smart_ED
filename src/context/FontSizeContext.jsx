import React, { createContext, useState, useContext, useEffect } from 'react';

const FontSizeContext = createContext();

export const FontSizeProvider = ({ children }) => {
  const [fontSizeLevel, setFontSizeLevel] = useState(0);
  
  const cycleFontSize = () => {
    setFontSizeLevel((prevLevel) => (prevLevel + 1) % 3);
  };
  
  useEffect(() => {
    // Apply font size styling to the root element
    const html = document.documentElement;
    
    if (fontSizeLevel === 0) {
      // Default size
      html.style.fontSize = ''; 
    } else if (fontSizeLevel === 1) {
      // Medium increase (1.3x)
      html.style.fontSize = '1.3rem'; 
    } else if (fontSizeLevel === 2) {
      // Larger increase (1.6x)
      html.style.fontSize = '1.6rem';
    }
  }, [fontSizeLevel]);
  
  return (
    <FontSizeContext.Provider value={{ fontSizeLevel, cycleFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}; 