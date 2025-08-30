import React from 'react';
import '../styles/LoadingSpinner.css';

const LoadingSpinner = () => (
  <div className="spinner-container">
    <div className="spinner">
      <div className="double-bounce1"></div>
      <div className="double-bounce2"></div>
    </div>
  </div>
);

export default LoadingSpinner;