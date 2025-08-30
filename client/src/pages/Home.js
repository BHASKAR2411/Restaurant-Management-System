"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"  // Added import for useNavigate
import LoadingSpinner from "../components/LoadingSpinner"
import { setTableData, getTableData } from "../utils/storage"
import "../styles/Home.css"

const Home = () => {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // Added useNavigate hook

  // Extract tableNo and restaurantId from URL or local storage
  const urlParams = new URLSearchParams(window.location.search)
  const tableFromUrl = urlParams.get("table")
  const restaurantFromUrl = urlParams.get("restaurant")
  const { tableNo: storedTableNo, restaurantId: storedRestaurantId } = getTableData()

  const tableNo = tableFromUrl || storedTableNo
  const restaurantId = restaurantFromUrl || storedRestaurantId

  useEffect(() => {
    if (tableFromUrl && restaurantFromUrl) {
      setTableData(tableFromUrl, restaurantFromUrl)
    }

    const fetchRestaurant = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/users/${restaurantId}`)
        setRestaurant(res.data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching restaurant:", error)
        setLoading(false)
      }
    }

    if (restaurantId) {
      fetchRestaurant()
    } else {
      setLoading(false)
    }
  }, [restaurantId, tableFromUrl, restaurantFromUrl])

  if (loading) return <LoadingSpinner />
  if (!restaurant || !tableNo) {
    return (
      <div className="error-container">
        Error: Invalid table or restaurant. <br />
        Table: {tableNo || "Not provided"} <br />
        Restaurant ID: {restaurantId || "Not provided"}
      </div>
    )
  }

  const navigateTo = (path) => {
    navigate(`${path}?table=${tableNo}&restaurant=${restaurantId}`)  // Updated to use navigate instead of window.location.href
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>{restaurant.restaurantName}</h1>
      </div>
      {tableNo && <div className="table-indicator">Table {tableNo}</div>}
      <div className="home-content">
        <div className="restaurant-header">
          {restaurant.profilePicture ? (
            <img
              src={restaurant.profilePicture}
              alt={`${restaurant.restaurantName} logo`}
              className="restaurant-logo"
            />
          ) : (
            <div className="restaurant-logo-placeholder">
              {restaurant.restaurantName[0]}
            </div>
          )}
        </div>
        <div className="feature-cards">
          <button className="feature-card" onClick={() => navigateTo("/menu")}>
            <h3>Browse Menu</h3>
          </button>
          <button className="feature-card" onClick={() => navigateTo("/payment")}>
            <h3>Pay Bill</h3>
          </button>
          <button className="feature-card" onClick={() => navigateTo("/review")}>
            <h3>Leave Review</h3>
          </button>
        </div>
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  )
}

export default Home