import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as yup from 'yup';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo.png';
import '../styles/Signup.css';

const otpSchema = yup.object().shape({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
});

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleChange = (e) => {
    setOtp(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await otpSchema.validate({ otp }, { abortEarly: false });
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/users/verify-otp`, {
        email,
        otp,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      toast.success('Email verified successfully');
      navigate('/dashboard');
    } catch (error) {
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || 'OTP verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/users/resend-otp`, { email });
      toast.info('A new OTP has been sent to your email.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    navigate('/login');
    return null;
  }

  return (
    <div className="signup-container">
      {loading && <LoadingSpinner />}
      <div className="signup-box">
        <img src={logo} alt="Logo" className="signup-logo" />
        <h2>Verify OTP</h2>
        <p>An OTP has been sent to {email}.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="otp"
            placeholder="Enter OTP"
            value={otp}
            onChange={handleChange}
            required
          />
          <button type="submit">Verify OTP</button>
        </form>
        <p>
          Didn't receive the OTP?{' '}
          <button onClick={handleResendOtp} className="resend-otp-button">
            Resend OTP
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOtp;