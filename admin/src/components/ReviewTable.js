import React from 'react';
import '../styles/Reviews.css';

const ReviewTable = ({ reviews }) => {
  return (
    <div className="review-table">
      <h3>Customer Reviews</h3>
      <table>
        <thead>
          <tr>
            <th>Table No.</th>
            <th>Date & Time</th>
            <th>Stars</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr>
              <td colSpan={4}>No reviews</td>
            </tr>
          ) : (
            reviews.map((review) => (
              <tr key={review.id}>
                <td>{review.tableNo}</td>
                <td>{new Date(review.createdAt).toLocaleString()}</td>
                <td>{'★'.repeat(review.stars) + '☆'.repeat(5 - review.stars)}</td>
                <td>{review.comment || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ReviewTable;