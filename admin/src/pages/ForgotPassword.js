import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/ForgotPassword.css';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schema.validate({ email }, { abortEarly: false });
      await axios.post(`${process.env.REACT_APP_API_URL}/users/forgot-password`, { email });
      toast.success('OTP sent to your email');
      localStorage.setItem('resetEmail', email);
      navigate('/reset-password');
    } catch (error) {
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || 'Request failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className="forgot-password-container">
      {loading && <LoadingSpinner />}
      <div className="forgot-password-box">
        <h2>Forgot Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send OTP</button>
        </form>
        <p>
          Back to <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;