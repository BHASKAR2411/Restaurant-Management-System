import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState({
    dailyEarnings: [],
    monthlyEarnings: [],
    totalDaily: 0,
    totalMonthly: 0,
    dailyOrderCount: 0,
    monthlyOrderCount: 0,
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uniqueCategories = [...new Set(res.data.map(item => item.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchAnalytics = async (date = '', category = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/analytics`;
      if (date || category) {
        url += '?';
        if (date) url += `date=${date}`;
        if (category) url += `${date ? '&' : ''}category=${encodeURIComponent(category)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchCategories();
  }, []);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchAnalytics(date, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    fetchAnalytics(selectedDate, category);
  };

  // Daily Earnings Chart
  const dailyChartData = {
    labels: analytics.dailyEarnings.map((e) => e.date),
    datasets: [
      {
        label: `Daily Earnings${selectedCategory ? ` (${selectedCategory})` : ''} (₹)`,
        data: analytics.dailyEarnings.map((e) => e.total),
        backgroundColor: '#55c1ef',
        borderColor: '#1d4999',
        borderWidth: 1,
      },
    ],
  };

  // Monthly Earnings Chart
  const monthlyChartData = {
    labels: analytics.monthlyEarnings.map((e) => e.month),
    datasets: [
      {
        label: `Monthly Earnings${selectedCategory ? ` (${selectedCategory})` : ''} (₹)`,
        data: analytics.monthlyEarnings.map((e) => e.total),
        backgroundColor: '#55c1ef',
        borderColor: '#1d4999',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: '' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Earnings (₹)' } },
      x: { title: { display: true, text: 'Date/Month' } },
    },
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        {loading && <LoadingSpinner />}
        <h1>{user.restaurantName}</h1>
        <h2>Welcome, {user.ownerName || user.owner_name || 'Owner'}</h2>
        <div className="analytics-controls">
          <div className="filter-group">
            <label>
              Select Date for Daily Stats:
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={new Date().toISOString().split('T')[0]}
              />
            </label>
            <label>
              Select Menu Category:
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
              >
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="earnings-figures">
          <div className="figure-card">
            <h3>Daily Earnings{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <p>₹{analytics.totalDaily.toFixed(2)}</p>
          </div>
          <div className="figure-card">
            <h3>Monthly Earnings{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <p>₹{analytics.totalMonthly.toFixed(2)}</p>
          </div>
          <div className="figure-card">
            <h3>Daily Orders{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <p>{analytics.dailyOrderCount}</p>
          </div>
          <div className="figure-card">
            <h3>Monthly Orders{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <p>{analytics.monthlyOrderCount}</p>
          </div>
          <div className="figure-card">
            <h3>Today's Date</h3>
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="charts-container">
          <div className="chart-card">
            <h3>Earnings vs. Dates{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <Bar
              data={dailyChartData}
              options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: `Daily Earnings${selectedCategory ? ` (${selectedCategory})` : ''}` } } }}
            />
          </div>
          <div className="chart-card">
            <h3>Earnings vs. Months{selectedCategory ? ` (${selectedCategory})` : ''}</h3>
            <Bar
              data={monthlyChartData}
              options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { ...chartOptions.plugins.title, text: `Monthly Earnings${selectedCategory ? ` (${selectedCategory})` : ''}` } } }}
            />
          </div>
        </div>
        <Link to="/orders" className="view-orders-btn">
          View Orders
        </Link>
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;