import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/ResetPassword.css';

const schema = yup.object().shape({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const ResetPassword = () => {
  const [formData, setFormData] = useState({ otp: '', password: '', confirmPassword: '' });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedEmail = localStorage.getItem('resetEmail');
    if (!storedEmail) {
      toast.error('Please request a password reset first');
      navigate('/forgot-password');
    } else {
      setEmail(storedEmail);
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schema.validate(formData, { abortEarly: false });
      await axios.post(`${process.env.REACT_APP_API_URL}/users/reset-password`, {
        email,
        otp: formData.otp,
        password: formData.password,
      });
      localStorage.removeItem('resetEmail');
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (error) {
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || 'Reset failed');
      }
    }
    setLoading(false);
  };

  return (
    <div className="reset-password-container">
      {loading && <LoadingSpinner />}
      <div className="reset-password-box">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="otp"
            placeholder="Enter OTP"
            value={formData.otp}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="New Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <button type="submit">Reset Password</button>
        </form>
        <p>
          Back to <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;