import React from 'react';
import SigninForm from '../auth/SigninForm';

const SigninCard = () => {
  return (
    <div className="login-card signin-card">
      <div className="form-side">
        <div className="logo-container">
          <h1 className="app-logo">Smart<span>ED</span></h1>
        </div>
        <SigninForm />
      </div>
    </div>
  );
};

export default SigninCard;
