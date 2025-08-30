import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isUserUpdated, setIsUserUpdated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-otp', '/plans'];

    console.log('AuthContext useEffect: token=', storedToken, 'userId=', userId, 'path=', location.pathname);

    if (storedToken && userId && !isUserUpdated) {
      axios
        .get(`${process.env.REACT_APP_API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((res) => {
          console.log('Fetched user data:', res.data);
          setUser(res.data);
          setToken(storedToken);
          setLoading(false);
          if (!res.data.planType || (res.data.planEndDate && new Date(res.data.planEndDate) < new Date())) {
            navigate('/plans', { state: { hasUsedFreeTrial: res.data.hasUsedFreeTrial } });
          }
        })
        .catch((error) => {
          console.error('Auth check error:', error);
          setLoading(false);
          if (!publicRoutes.includes(location.pathname)) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            setUser(null);
            setToken(null);
            toast.error('Session expired. Please log in again.');
            navigate('/login');
          }
        });
    } else {
      setLoading(false);
      if (!publicRoutes.includes(location.pathname)) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setUser(null);
        setToken(null);
        navigate('/login');
      }
    }
  }, [navigate, isUserUpdated, location.pathname]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/users/login`, { email, password });
      console.log('Login response:', res.data);

      if (res.data.requiresOtp) {
        console.log('Redirecting to verify-otp with email:', res.data.email);
        navigate('/verify-otp', { state: { email: res.data.email } });
        toast.info('An OTP has been sent to your email for verification.');
        return { requiresOtp: true, email: res.data.email };
      }

      if (res.data.requiresPlan) {
        console.log('Login requires plan selection, hasUsedFreeTrial:', res.data.hasUsedFreeTrial);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user.id);
        setUser(res.data.user);
        setToken(res.data.token);
        setIsUserUpdated(false);
        navigate('/plans', { state: { hasUsedFreeTrial: res.data.hasUsedFreeTrial } });
        return { requiresPlan: true, hasUsedFreeTrial: res.data.hasUsedFreeTrial };
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      console.log('User after login:', res.data.user);
      setUser(res.data.user);
      setToken(res.data.token);
      setIsUserUpdated(false);
      toast.success('Logged in successfully');
      navigate('/dashboard');
      return res.data;
    } catch (error) {
      console.error('Login error:', error.response?.data);
      const message = error.response?.data?.message || 'Login failed';
      if (error.response?.data?.requiresOtp) {
        console.log('Redirecting to verify-otp with error case:', error.response.data.email);
        navigate('/verify-otp', { state: { email: error.response.data.email } });
        toast.info('An OTP has been sent to your email for verification.');
        return { requiresOtp: true, email: error.response.data.email };
      }
      if (error.response?.data?.requiresPlan) {
        console.log('Login requires plan selection (error case), hasUsedFreeTrial:', error.response.data.hasUsedFreeTrial);
        localStorage.setItem('token', error.response.data.token);
        localStorage.setItem('userId', error.response.data.user.id);
        setUser(error.response.data.user);
        setToken(error.response.data.token);
        setIsUserUpdated(false);
        navigate('/plans', { state: { hasUsedFreeTrial: error.response.data.hasUsedFreeTrial } });
        return { requiresPlan: true, hasUsedFreeTrial: error.response.data.hasUsedFreeTrial };
      }
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    setToken(null);
    setIsUserUpdated(false);
    toast.info('Logged out successfully');
    navigate('/login');
  };

  const updateUser = (updatedUser) => {
    console.log('Updating user in AuthContext:', updatedUser);
    setUser(updatedUser);
    setIsUserUpdated(true);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};