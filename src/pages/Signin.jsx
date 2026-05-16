import React from 'react';
import SigninCard from '../components/layout/SigninCard';
import '../styles/AuthPage.css';
import '../styles/Signin.css';

const Signin = () => {
  return (
    <div className="auth-page signin-page">
      <SigninCard />
    </div>
  );
};

export default Signin;