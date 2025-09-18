import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyOtp from './components/VerifyOtp';
import Plans from './pages/Plans';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Account from './pages/Account';
import Reviews from './pages/Reviews';
import QRCode from './pages/QRCode';
import TakeOrder from './pages/TakeOrder';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (!user.planType || (user.planEndDate && new Date(user.planEndDate) < new Date())) {
    return <Navigate to="/plans" state={{ hasUsedFreeTrial: user.hasUsedFreeTrial }} />;
  }
  return children;
};

const App = () => {
  return (
    <Router basename='/app'>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/plans" element={<Plans />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <PrivateRoute>
                  <Orders />
                </PrivateRoute>
              }
            />
            <Route
              path="/menu"
              element={
                <PrivateRoute>
                  <Menu />
                </PrivateRoute>
              }
            />
            <Route
              path="/account"
              element={
                <PrivateRoute>
                  <Account />
                </PrivateRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <PrivateRoute>
                  <Reviews />
                </PrivateRoute>
              }
            />
            <Route
              path="/qr-code"
              element={
                <PrivateRoute>
                  <QRCode />
                </PrivateRoute>
              }
            />
            <Route
              path="/take-order"
              element={
                <PrivateRoute>
                  <TakeOrder />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;