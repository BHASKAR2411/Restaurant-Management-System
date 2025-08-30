import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo.png';
import '../styles/Plans.css';

const Plans = () => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const { hasUsedFreeTrial } = location.state || {};
    if (hasUsedFreeTrial) {
      setHasUsedFreeTrial(true);
    }
  }, [location.state]);

  const plans = [
    { type: 'free_trial', name: '10 Days Free Trial', price: 0, duration: '10 days' },
    { type: '1_month', name: '1 Month Plan', price: 599, duration: '30 days' },
    { type: '6_months', name: '6 Months Plan', price: 2999, duration: '180 days' },
    { type: '1_year', name: '1 Year Plan', price: 4499, duration: '365 days' },
  ];

  const handlePlanSelect = (planType) => {
    setSelectedPlan(planType);
  };

  const handleProceed = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    if (selectedPlan === 'free_trial' && hasUsedFreeTrial) {
      toast.error('You have already used your free trial');
      return;
    }

    const localToken = localStorage.getItem('token') || token;
    console.log('Token for plan request:', localToken);
    if (!localToken) {
      toast.error('Authentication required. Please log in again.');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending plan selection request with token:', localToken);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/plans`,
        { planType: selectedPlan },
        { headers: { Authorization: `Bearer ${localToken}` } }
      );
      console.log('Plan selection response:', response.data);

      if (selectedPlan === 'free_trial') {
        toast.success('Free trial activated');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
      } else {
        navigate('/payment', {
          state: {
            planType: selectedPlan,
            amount: response.data.amount,
            durationDays: response.data.durationDays,
          },
        });
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to select plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plans-container">
      {loading && <LoadingSpinner />}
      <div className="plans-box">
        <img src={logo} alt="Logo" className="plans-logo" />
        <h2>Select a Plan</h2>
        <div className="plans-list">
          {plans.map((plan) => (
            <div
              key={plan.type}
              className={`plan-card ${selectedPlan === plan.type ? 'selected' : ''}`}
              onClick={() => handlePlanSelect(plan.type)}
            >
              <h3>{plan.name}</h3>
              <p className="price">₹{plan.price}</p>
              <p className="duration">Duration: {plan.duration}</p>
            </div>
          ))}
        </div>
        <button onClick={handleProceed} disabled={loading}>
          Proceed
        </button>
      </div>
    </div>
  );
};

export default Plans;