import React from 'react';
import { FaGraduationCap, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import SigninForm from '../auth/SigninForm';

const SigninCard = () => {
  return (
    <div className="signin-shell">
      <aside className="signin-brand" aria-hidden="true">
        <div className="signin-brand__glow signin-brand__glow--one" />
        <div className="signin-brand__glow signin-brand__glow--two" />
        <div className="signin-brand__content">
          <p className="signin-brand__eyebrow">SmartED Platform</p>
          <h1 className="signin-brand__logo">
            Smart<span>ED</span>
          </h1>
          <p className="signin-brand__tagline">
            Teaching, learning, and progress — in one place.
          </p>
          <ul className="signin-brand__features">
            <li>
              <span className="signin-brand__feature-icon">
                <FaGraduationCap />
              </span>
              <span>Course & assignment management</span>
            </li>
            <li>
              <span className="signin-brand__feature-icon">
                <FaChartLine />
              </span>
              <span>Grades and student insights</span>
            </li>
            <li>
              <span className="signin-brand__feature-icon">
                <FaShieldAlt />
              </span>
              <span>Secure access for every role</span>
            </li>
          </ul>
        </div>
      </aside>

      <div className="signin-panel">
        <div className="signin-panel__logo-mobile">
          <h1 className="signin-brand__logo signin-brand__logo--compact">
            Smart<span>ED</span>
          </h1>
        </div>
        <SigninForm />
      </div>
    </div>
  );
};

export default SigninCard;
