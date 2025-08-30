import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as yup from 'yup';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo.png';
import '../styles/Signup.css';

const signupSchema = yup.object().shape({
  restaurantName: yup.string().required('Restaurant name is required'),
  ownerName: yup.string().required('Owner name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const otpSchema = yup.object().shape({
  otp: yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
});

const Signup = () => {
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!otpSent) {
        console.log('Submitting signup form:', formData);
        const signupData = {
          restaurantName: formData.restaurantName,
          ownerName: formData.ownerName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };
        await signupSchema.validate(signupData, { abortEarly: false });
        console.log('Validation passed for signup');

        const response = await axios.post(`${process.env.REACT_APP_API_URL}/users/signup`, signupData);
        console.log('Signup response:', response.data);
        setOtpSent(true);
        toast.info('OTP sent to your email');
      } else {
        console.log('Submitting OTP:', formData.otp);
        await otpSchema.validate({ otp: formData.otp }, { abortEarly: false });
        console.log('OTP validation passed');

        const res = await axios.post(`${process.env.REACT_APP_API_URL}/users/verify-otp`, {
          email: formData.email,
          otp: formData.otp,
        });
        console.log('OTP verification response:', res.data);

        if (!res.data.token) {
          console.error('No token received in verify-otp response');
          throw new Error('Authentication failed: No token received');
        }

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        console.log('Token saved to localStorage:', res.data.token);

        // Verify localStorage persistence
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          console.error('Failed to persist token in localStorage');
          throw new Error('Failed to save authentication token');
        }

        toast.success('Account verified successfully');

        if (res.data.requiresPlan) {
          navigate('/plans', { state: { hasUsedFreeTrial: res.data.user.hasUsedFreeTrial, email: formData.email } });
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error during signup:', error);
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.message || error.message || 'Signup failed');
        setOtpSent(false);
      }
    } finally {
      setLoading(false);
      console.log('Current otpSent state:', otpSent);
    }
  };

  return (
    <div className="signup-container">
      {loading && <LoadingSpinner />}
      <div className="signup-box">
        <img src={logo} alt="Logo" className="signup-logo" />
        <h2>{otpSent ? 'Verify OTP' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit}>
          {!otpSent ? (
            <>
              <input
                type="text"
                name="restaurantName"
                placeholder="Restaurant Name"
                value={formData.restaurantName}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="ownerName"
                placeholder="Owner Name"
                value={formData.ownerName}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
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
            </>
          ) : (
            <input
              type="text"
              name="otp"
              placeholder="Enter OTP"
              value={formData.otp}
              onChange={handleChange}
              required
            />
          )}
          <button type="submit">{otpSent ? 'Verify OTP' : 'Sign Up'}</button>
        </form>
        <p>
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;