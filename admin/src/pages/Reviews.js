import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ReviewTable from '../components/ReviewTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/Reviews.css';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/reviews`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setReviews(res.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to fetch reviews');
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="reviews-container">
      <Sidebar />
      <div className="reviews-content">
        {loading && <LoadingSpinner />}
        <h2>Customer Reviews</h2>
        <ReviewTable reviews={reviews} />
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Reviews;