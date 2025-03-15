import React from 'react';
import SigninForm from '../auth/SigninForm';

const SigninCard = () => {
  return (
    <div className="login-card">
      <div className="illustration-side">
        <img 
          src="../assets/school-management-software.png" 
          alt="Login Illustration" 
          className="img-fluid" 
        />
      </div>
      <div className="form-side">
        <SigninForm />
      </div>
    </div>
  );
};

export default SigninCard;
