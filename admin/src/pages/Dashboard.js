import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthOptions = monthNames.map((name, index) => ({ value: (index + 1).toString().padStart(2, '0'), name }));

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState({
    totalPrimary: 0,
    totalSecondary: 0,
    primaryDate: null,
    orderPrimary: 0,
    orderSecondary: 0,
    orderPrimaryDate: null,
    earningsByDate: [],
    earningsByMonth: [],
    earningsByCategory: [],
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uniqueCategories = [...new Set(res.data.map(item => item.category.trim()))];
      console.log('Fetched categories:', uniqueCategories);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchAnalytics = async (year = '', month = '', day = '', category = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      if (day) params.append('day', day);
      if (category) params.append('category', category);
      const url = `${process.env.REACT_APP_API_URL}/analytics?${params.toString()}`;
      console.log('Fetching analytics with URL:', url);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API Response:', res.data);
      setAnalytics({
        totalPrimary: res.data.totalPrimary || 0,
        totalSecondary: res.data.totalSecondary || 0,
        primaryDate: res.data.primaryDate || null,
        orderPrimary: res.data.orderPrimary || 0,
        orderSecondary: res.data.orderSecondary || 0,
        orderPrimaryDate: res.data.orderPrimaryDate || null,
        earningsByDate: res.data.earningsByDate || [],
        earningsByMonth: res.data.earningsByMonth || [],
        earningsByCategory: res.data.earningsByCategory || [],
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Failed to load analytics data');
      setAnalytics({
        totalPrimary: 0,
        totalSecondary: 0,
        primaryDate: null,
        orderPrimary: 0,
        orderSecondary: 0,
        orderPrimaryDate: null,
        earningsByDate: [],
        earningsByMonth: [],
        earningsByCategory: [],
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    setSelectedYear(currentYear.toString());
    fetchAnalytics(currentYear.toString(), '', '', '');
  }, []);

  const handleYearChange = (e) => {
    const year = e.target.value;
    setSelectedYear(year);
    setSelectedMonth('');
    setSelectedDay('');
    fetchAnalytics(year, '', '', selectedCategory);
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setSelectedMonth(month);
    setSelectedDay('');
    fetchAnalytics(selectedYear, month, '', selectedCategory);
  };

  const handleDayChange = (e) => {
    const day = e.target.value;
    setSelectedDay(day);
    fetchAnalytics(selectedYear, selectedMonth, day, selectedCategory);
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    console.log('Selected category:', category);
    setSelectedCategory(category);
    fetchAnalytics(selectedYear, selectedMonth, selectedDay, category);
  };

  const mode = selectedDay ? 'day' : selectedMonth ? 'month' : selectedYear ? 'year' : 'default';
  const catSuffix = selectedCategory ? ` (${selectedCategory})` : '';

  // Primary Chart (Dates)
  const primaryChartData = {
    labels: (analytics.earningsByDate || []).map((e) => e.date || ''),
    datasets: [
      {
        label: `Earnings vs. Dates${catSuffix} (₹)`,
        data: (analytics.earningsByDate || []).map((e) => e.total || 0),
        backgroundColor: '#55c1ef',
        borderColor: '#1d4999',
        borderWidth: 1,
      },
    ],
  };

  // Secondary Chart (Months)
  const secondaryChartData = {
    labels: (analytics.earningsByMonth || []).map((e) =>
      monthNames[parseInt((e.month || '').split('-')[1]) - 1] || ''
    ),
    datasets: [
      {
        label: `Earnings vs. Months${catSuffix} (₹)`,
        data: (analytics.earningsByMonth || []).map((e) => e.total || 0),
        backgroundColor: '#55c1ef',
        borderColor: '#1d4999',
        borderWidth: 1,
      },
    ],
  };

  // Pie Chart
  const pieChartData = {
    labels: (analytics.earningsByCategory || []).map((e) => e.category || ''),
    datasets: [
      {
        data: (analytics.earningsByCategory || []).map((e) => e.total || 0),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
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

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: `Category vs. Earnings${catSuffix}` },
    },
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-content">
        <div className="today-date">
          Today's Date: {new Date().toLocaleDateString()}
        </div>
        {loading && <LoadingSpinner />}
        <h1>{user.restaurantName}</h1>
        <h2>Welcome, {user.ownerName || user.owner_name || 'Owner'}</h2>
        <div className="analytics-controls">
          <div className="filter-group">
            <label>
              Select Year:
              <select value={selectedYear} onChange={handleYearChange}>
                <option value="">Select Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Select Month:
              <select value={selectedMonth} onChange={handleMonthChange} disabled={!selectedYear}>
                <option value="">Select Month</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Select Day:
              <select value={selectedDay} onChange={handleDayChange} disabled={!selectedMonth}>
                <option value="">Select Day</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Select Menu Category:
              <select value={selectedCategory} onChange={handleCategoryChange}>
                <option value="">All Categories</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="earnings-figures">
          <div className="figure-card">
            <h3>{mode === 'day' ? `Daily Earnings${catSuffix}` : `Max Earnings${catSuffix}`}</h3>
            <p>₹{analytics.totalPrimary.toFixed(2)}</p>
            {mode !== 'day' && analytics.primaryDate && <small>{analytics.primaryDate}</small>}
          </div>
          {mode !== 'day' && (
            <div className="figure-card">
              <h3>{mode === 'year' ? `Yearly Earnings${catSuffix}` : `Monthly Earnings${catSuffix}`}</h3>
              <p>₹{analytics.totalSecondary.toFixed(2)}</p>
            </div>
          )}
          <div className="figure-card">
            <h3>{mode === 'day' ? `Daily Orders${catSuffix}` : `Max Orders${catSuffix}`}</h3>
            <p>{analytics.orderPrimary}</p>
            {mode !== 'day' && analytics.orderPrimaryDate && <small>{analytics.orderPrimaryDate}</small>}
          </div>
          {mode !== 'day' && (
            <div className="figure-card">
              <h3>{mode === 'year' ? `Yearly Orders${catSuffix}` : `Monthly Orders${catSuffix}`}</h3>
              <p>{analytics.orderSecondary}</p>
            </div>
          )}
        </div>
        <div className="charts-container">
          {(mode === 'year' || mode === 'month') && analytics.earningsByDate?.length > 0 ? (
            <div className="chart-card">
              <h3>
                Earnings vs. {mode === 'year' ? 'Dates in Year' : 'Dates in Month'}
                {catSuffix}
              </h3>
              <Bar
                data={primaryChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: `Earnings vs. ${mode === 'year' ? 'Dates in Year' : 'Dates in Month'}${catSuffix}`,
                    },
                  },
                }}
              />
            </div>
          ) : (
            (mode === 'year' || mode === 'month') && <p>No earnings data available for this period.</p>
          )}
          {mode === 'year' && analytics.earningsByMonth?.length > 0 ? (
            <div className="chart-card">
              <h3>Earnings vs. Months in Year{catSuffix}</h3>
              <Bar
                data={secondaryChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: `Earnings vs. Months in Year${catSuffix}`,
                    },
                  },
                }}
              />
            </div>
          ) : (
            mode === 'year' && <p>No monthly earnings data available.</p>
          )}
          {analytics.earningsByCategory?.length > 0 ? (
            <div className="chart-card">
              <h3>Category vs. Earnings{catSuffix}</h3>
              <Pie data={pieChartData} options={pieOptions} />
            </div>
          ) : (
            <p>No category data available for this period.</p>
          )}
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