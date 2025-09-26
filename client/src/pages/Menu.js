import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import MenuItem from '../components/MenuItem';
import LoadingSpinner from '../components/LoadingSpinner';
import { setTableData, getTableData, clearTableData } from '../utils/storage';
import '../styles/Menu.css';

// Main Menu component
const Menu = () => {
  // State declarations
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('default');
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState(false);
  const [restaurant, setRestaurant] = useState(null);

  // Extract table and restaurant ID from URL or storage
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  const restaurantFromUrl = urlParams.get('restaurant');
  const { tableNo: storedTableNo, restaurantId: storedRestaurantId } = getTableData();

  const tableNo = tableFromUrl || storedTableNo;
  let restaurantId = restaurantFromUrl || storedRestaurantId;

  console.log('Raw restaurantId (from URL or storage):', restaurantId);

  restaurantId = Number(restaurantId);

  // Effect for fetching menu, restaurant details, and setting up WebSocket
  useEffect(() => {
    if (tableFromUrl && restaurantFromUrl) {
      setTableData(tableFromUrl, restaurantFromUrl);
    }

    if (isNaN(restaurantId) || restaurantId <= 0) {
      console.error('Invalid restaurantId:', restaurantId);
      toast.error('Invalid restaurant ID. Please try again.');
      clearTableData();
      setLoading(false);
      return;
    }

    const fetchMenuAndStatus = async () => {
      try {
        const [menuRes, submitDisabledRes, restaurantRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${restaurantId}`),
          axios.get(`${process.env.REACT_APP_API_URL}/orders/submit-disabled?restaurantId=${restaurantId}`),
          axios.get(`${process.env.REACT_APP_API_URL}/users/${restaurantId}`)
        ]);
        setMenuItems(menuRes.data);
        setIsSubmitDisabled(submitDisabledRes.data.isSubmitDisabled);
        setRestaurant(restaurantRes.data);
        const initialExpanded = {};
        menuRes.data.forEach((item) => {
          if (initialExpanded[item.category] === undefined) {
            initialExpanded[item.category] = true;
          }
        });
        setExpandedCategories(initialExpanded);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load menu or submit status');
        setLoading(false);
      }
    };
    fetchMenuAndStatus();

    const socketUrl = process.env.REACT_APP_API_URL.replace(/\/api$/, '') + '/socket.io';
    console.log('Intended WebSocket URL:', socketUrl);
    const socket = io(socketUrl, { path: '/socket.io' }); // Ensure path is explicit
    console.log('Actual WebSocket connection attempt:', socket.io.uri);
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
    });
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('submitDisabledUpdate', (data) => {
      if (data.restaurantId === restaurantId) {
        setIsSubmitDisabled(data.isSubmitDisabled);
        toast.info(`Order submission ${data.isSubmitDisabled ? 'disabled' : 'enabled'}`);
      }
    });

    return () => {
      console.log('Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [restaurantId, tableFromUrl, restaurantFromUrl]);

  // Handle selecting/unselecting a portion
  const handleToggleSelect = (item, portion, isChecked) => {
    const itemPrice = portion === 'half' && item.hasHalf ? item.halfPrice : item.price;
    const itemKey = `${item.id}-${portion}`;

    setSelectedItems((prevItems) => {
      if (isChecked) {
        const existingItem = prevItems.find((i) => i.key === itemKey);
        if (!existingItem) {
          return [...prevItems, { ...item, price: itemPrice, portion, quantity: 1, key: itemKey }];
        }
        return prevItems;
      }
      return prevItems.filter((i) => i.key !== itemKey);
    });
  };

  // Increment quantity for a specific portion
  const handleIncrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) =>
      prevItems.map((i) =>
        i.key === itemKey ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  };

  // Decrement quantity for a specific portion
  const handleDecrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.key === itemKey);
      if (!existingItem) return prevItems;
      if (existingItem.quantity === 1) {
        return prevItems.filter((i) => i.key !== itemKey);
      }
      return prevItems.map((i) =>
        i.key === itemKey ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  // Remove an item from selected items
  const handleRemoveItem = (itemKey) => {
    setSelectedItems((prevItems) => prevItems.filter((i) => i.key !== itemKey));
  };

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Toggle order summary expansion
  const toggleOrderSummary = () => {
    setIsOrderSummaryExpanded((prev) => !prev);
  };

  // Submit order
  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.warn('Please select at least one item');
      return;
    }

    if (isSubmitDisabled) {
      toast.error('Order submission is currently disabled');
      return;
    }

    const preparedItems = selectedItems.map((item) => ({
      id: item.id,
      name: item.name,
      isVeg: item.isVeg,
      price: item.price,
      quantity: item.quantity,
      portion: item.portion,
    }));

    const payload = {
      tableNo: Number(tableNo),
      items: preparedItems,
      total: selectedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 0)), 0),
      restaurantId,
    };
    console.log('Order payload:', payload);

    if (!restaurantId || restaurantId <= 0) {
      toast.error('Restaurant ID is invalid. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await axios.get(`${process.env.REACT_APP_API_URL}/users/${restaurantId}`);
      await axios.post(`${process.env.REACT_APP_API_URL}/orders`, payload);
      toast.success('Order placed successfully');
      setSelectedItems([]);
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to place order';
      toast.error(errorMessage);
    }
    setLoading(false);
  };

  // Filter and sort menu items
  const filteredAndSortedItems = menuItems
    .filter((item) => {
      if (vegFilter === 'veg') return item.isVeg;
      if (vegFilter === 'non-veg') return !item.isVeg;
      return true;
    })
    .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOption === 'lowToHigh') return a.price - b.price;
      if (sortOption === 'highToLow') return b.price - a.price;
      return 0;
    });

  // Group menu items by category
  const groupedMenu = filteredAndSortedItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Handle invalid table or restaurant ID
  if (!tableNo || !restaurantId) {
    return (
      <div className="error-container">
        Error: Invalid table or restaurant. <br />
        Table: {tableNo || 'Not provided'} <br />
        Restaurant ID: {restaurantId || 'Not provided'}
      </div>
    );
  }

  // Show loading spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // Main render
  return (
    <div className="menu-container">
      <div className="menu-header">
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
      <div className="menu-controls">
        <div className="controls-card">
          <div className="filter-group">
            <select
              id="vegFilter"
              value={vegFilter}
              onChange={(e) => setVegFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
            </select>
            <select
              id="sortOption"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="filter-select"
            >
              <option value="default">Sort</option>
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="filter-input"
            />
          </div>
        </div>
      </div>
      <div className="menu-content">
        <div className="menu-items-scrollable">
          {Object.keys(groupedMenu).length === 0 ? (
            <p className="no-items">No menu items available</p>
          ) : (
            Object.keys(groupedMenu).map((category) => (
              <div key={category} className="menu-category">
                <h3 className="category-title" onClick={() => toggleCategory(category)}>
                  {category}
                  <span className="toggle-icon">{expandedCategories[category] ? '▼' : '▲'}</span>
                </h3>
                {expandedCategories[category] && (
                  <ul>
                    {groupedMenu[category].map((item) => {
                      const fullItemKey = `${item.id}-full`;
                      const halfItemKey = `${item.id}-half`;
                      const fullSelectedItem = selectedItems.find((i) => i.key === fullItemKey);
                      const halfSelectedItem = selectedItems.find((i) => i.key === halfItemKey);
                      const isFullSelected = !!fullSelectedItem;
                      const isHalfSelected = !!halfSelectedItem;
                      const fullQuantity = fullSelectedItem ? fullSelectedItem.quantity : 0;
                      const halfQuantity = halfSelectedItem ? halfSelectedItem.quantity : 0;

                      return (
                        <div
                          key={item.id}
                          className={`menu-item-wrapper ${item.isEnabled ? '' : 'disabled-item'}`}
                        >
                          <MenuItem
                            item={item}
                            onToggleSelect={handleToggleSelect}
                            onIncrement={handleIncrement}
                            onDecrement={handleDecrement}
                            fullQuantity={fullQuantity}
                            halfQuantity={halfQuantity}
                            isEnabled={item.isEnabled}
                            isFullSelected={isFullSelected}
                            isHalfSelected={isHalfSelected}
                          />
                        </div>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
        {selectedItems.length > 0 && (
          <div className="order-summary sticky">
            <div className="order-summary-title" onClick={toggleOrderSummary}>
              <span className="toggle-icon">{isOrderSummaryExpanded ? '▲' : '▼'}</span>
              <span className="order-summary-text">
                Selected Items: {selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </span>
            </div>
            {isOrderSummaryExpanded && (
              <ul>
                {selectedItems.map((item) => (
                  <li key={item.key} className="order-summary-item">
                    <span>
                      <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}>
                        {item.isVeg ? '●' : '▲'}
                      </span>
                      {item.name} ({item.portion}) x {item.quantity}
                    </span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => handleRemoveItem(item.key)} className="remove-button">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="order-total">
              Total: ₹{selectedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 0)), 0).toFixed(2)}
            </p>
            <button
              onClick={handleSubmit}
              className="submit-order-button"
              disabled={isSubmitDisabled || loading}
            >
              Submit Order
            </button>
          </div>
        )}
      </div>
      <footer className="page-footer">
        Powered by SAE. All rights reserved.
      </footer>
    </div>
  );
};

export default Menu;