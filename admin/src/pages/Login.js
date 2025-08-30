import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo.png';
import '../styles/Login.css';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await schema.validate(formData, { abortEarly: false });
      const response = await login(formData.email, formData.password);
      console.log('Login response in Login.js:', response);
      if (response?.requiresPlan) {
        const storedToken = localStorage.getItem('token');
        console.log('Token after login:', storedToken);
        if (!storedToken) {
          throw new Error('Token not stored after login');
        }
        navigate('/plans', { state: { hasUsedFreeTrial: response.hasUsedFreeTrial } });
      }
    } catch (error) {
      console.error('Login error in Login.js:', error);
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {loading && <LoadingSpinner />}
      <div className="login-box">
        <img src={logo} alt="Logo" className="login-logo" />
        <h2>Log In</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Log In</button>
        </form>
        <p>
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
        <p>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;