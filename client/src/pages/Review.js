// client-frontend/src/pages/Review.js
"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import LoadingSpinner from "../components/LoadingSpinner"
import { getTableData } from "../utils/storage"
import "../styles/Review.css"

const Review = () => {
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleReviewLink, setGoogleReviewLink] = useState("")
  const [restaurant, setRestaurant] = useState(null)
  const { tableNo, restaurantId } = getTableData()

  useEffect(() => {
    if (!restaurantId) {
      toast.error("Invalid restaurant ID")
      return
    }

    const fetchRestaurant = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/users/${restaurantId}`)
        setGoogleReviewLink(res.data.googleReviewLink)
        setRestaurant(res.data)
      } catch (error) {
        console.error("Error fetching restaurant:", error)
      }
    }
    fetchRestaurant()
  }, [restaurantId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (stars === 0) {
      toast.warn("Please select a rating")
      return
    }

    setLoading(true)
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/reviews`, {
        tableNo: Number(tableNo),
        stars,
        comment,
        restaurantId,
      })
      toast.success("Review submitted")
      if (stars >= 4 && googleReviewLink) {
        window.location.href = googleReviewLink
      }
      setStars(0)
      setComment("")
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit review")
    }
    setLoading(false)
  }

  const handleNext = () => {
    if (stars === 0) {
      toast.warn("Please select a rating")
      return
    }
    if (googleReviewLink) {
      window.location.href = googleReviewLink
    } else {
      toast.success("Review submitted")
      setStars(0)
    }
  }

  if (!tableNo || !restaurantId) {
    return <div className="error-container">Error: Invalid table or restaurant</div>
  }

  const isLowRating = stars > 0 && stars <= 3
  const isHighRating = stars >= 4
  const showCommentBox = isLowRating || (isHighRating && !googleReviewLink)

  return (
    <div className="review-container">
      {loading && <LoadingSpinner />}
      <div className="review-header">
        <div className="restaurant-info">
          {restaurant?.profilePicture ? (
            <img
              src={restaurant.profilePicture}
              alt={`${restaurant.restaurantName} logo`}
              className="restaurant-logo"
            />
          ) : (
            <div className="restaurant-logo-placeholder">
              {restaurant?.restaurantName[0] || 'R'}
            </div>
          )}
          <span className="restaurant-name">{restaurant?.restaurantName || 'Restaurant'}</span>
        </div>
        {tableNo && <div className="table-indicator">Table {tableNo}</div>}
      </div>
      <div className="review-content">
        <div className="review-card">
          <h3>How was your experience?</h3>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`star ${star <= stars ? "active" : ""}`} onClick={() => setStars(star)}>
                ★
              </span>
            ))}
          </div>
          {showCommentBox && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Please share your feedback to help us improve (optional)"
                rows="4"
              />
              <button type="button" onClick={handleSubmit}>
                Submit Review
              </button>
            </>
          )}
          {isHighRating && googleReviewLink && (
            <button type="button" className="next-button" onClick={handleNext}>
              Next
            </button>
          )}
        </div>
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
export default Review