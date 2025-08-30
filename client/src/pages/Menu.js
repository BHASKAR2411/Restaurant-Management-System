// client-frontend/src/pages/Menu.js
"use client"

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MenuItem from '../components/MenuItem';
import LoadingSpinner from '../components/LoadingSpinner';
import { setTableData, getTableData, clearTableData } from '../utils/storage';
import '../styles/Menu.css';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemPortions, setItemPortions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('default');
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  const restaurantFromUrl = urlParams.get('restaurant');
  const { tableNo: storedTableNo, restaurantId: storedRestaurantId } = getTableData();

  const tableNo = tableFromUrl || storedTableNo;
  let restaurantId = restaurantFromUrl || storedRestaurantId;

  console.log('Raw restaurantId (from URL or storage):', restaurantId);

  restaurantId = Number(restaurantId);

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

    const fetchMenu = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${restaurantId}`);
        setMenuItems(res.data);
        const initialPortions = {};
        const initialExpanded = {};
        res.data.forEach((item) => {
          initialPortions[item.id] = 'full';
          if (!initialExpanded[item.category]) {
            initialExpanded[item.category] = false; // Collapse all categories by default
          }
        });
        setItemPortions(initialPortions);
        setExpandedCategories(initialExpanded);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching menu:', error);
        toast.error('Failed to load menu');
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId, tableFromUrl, restaurantFromUrl]);

  const handleToggleSelect = (item, isChecked) => {
    const portion = itemPortions[item.id] || 'full';
    const itemPrice = portion === 'half' && item.hasHalf ? item.halfPrice : item.price;
    const itemKey = `${item.id}-${portion}`;

    setSelectedItems((prevItems) => {
      if (isChecked) {
        const existingItem = prevItems.find((i) => i.key === itemKey);
        if (!existingItem) {
          return [...prevItems, { ...item, price: itemPrice, portion, quantity: 1, key: itemKey }];
        }
        return prevItems;
      } else {
        return prevItems.filter((i) => i.key !== itemKey);
      }
    });
  };

  const handlePortionChange = (item, newPortion) => {
    const oldPortion = itemPortions[item.id] || 'full';
    const oldItemKey = `${item.id}-${oldPortion}`;
    const newItemKey = `${item.id}-${newPortion}`;
    const itemPrice = newPortion === 'half' && item.hasHalf ? item.halfPrice : item.price;

    setItemPortions((prev) => ({
      ...prev,
      [item.id]: newPortion,
    }));

    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.key === oldItemKey);
      if (existingItem && !prevItems.find((i) => i.key === newItemKey)) {
        return [
          ...prevItems,
          { ...existingItem, portion: newPortion, price: itemPrice, key: newItemKey, quantity: 1 },
        ];
      }
      return prevItems;
    });
  };

  const handleIncrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) =>
      prevItems.map((i) =>
        i.key === itemKey ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  };

  const handleDecrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.key === itemKey);
      if (!existingItem) return prevItems;
      if (existingItem.quantity === 1) {
        return prevItems.filter((i) => i.key === itemKey);
      }
      return prevItems.map((i) =>
        i.key === itemKey ? { ...i, quantity: i.quantity - 1 } : i
      )
    });
  };

  const handleRemoveItem = (itemKey) => {
    setSelectedItems((prevItems) => prevItems.filter((i) => i.key !== itemKey));
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.warn('Please select at least one item');
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

  const navigateToHome = () => {
    navigate(`/?table=${tableNo}&restaurant=${restaurantId}`);
  };

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

  const groupedMenu = filteredAndSortedItems.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (!tableNo || !restaurantId) {
    return (
      <div className="error-container">
        Error: Invalid table or restaurant. <br />
        Table: {tableNo || 'Not provided'} <br />
        Restaurant ID: {restaurantId || 'Not provided'}
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="menu-container">
      <div className="menu-header">
        <button className="back-button" onClick={navigateToHome}>
          ← Back
        </button>
        <h2>Our Menu</h2>
      </div>
      {tableNo && <div className="table-indicator">Table {tableNo}</div>}
      <div className="menu-controls">
        <div className="controls-card">
          <div className="dropdowns">
            <div className="filter-control">
              <select
                id="vegFilter"
                value={vegFilter}
                onChange={(e) => setVegFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
            </div>
            <div className="sort-control">
              <select
                id="sortOption"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="default">Sort</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
              </select>
            </div>
          </div>
          <div className="search-control">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
            />
          </div>
        </div>
      </div>
      <div className="menu-content">
        {Object.keys(groupedMenu).length === 0 ? (
          <p className="no-items">No menu items available</p>
        ) : (
          Object.keys(groupedMenu).map((category) => (
            <div key={category} className="menu-category">
              <h3 className="category-title" onClick={() => toggleCategory(category)}>
                {category}
                <span className="toggle-icon">{expandedCategories[category] ? '▲' : '▼'}</span>
              </h3>
              {expandedCategories[category] && (
                <ul>
                  {groupedMenu[category].map((item) => {
                    const selectedPortion = itemPortions[item.id] || 'full';
                    const itemKey = `${item.id}-${selectedPortion}`;
                    const selectedItem = selectedItems.find((i) => i.key === itemKey);
                    const isSelected = !!selectedItem;
                    const itemQuantity = selectedItem ? selectedItem.quantity : 0;

                    return (
                      <div key={item.id} className={`menu-item-wrapper ${item.isEnabled ? '' : 'disabled-item'}`}>
                        <MenuItem
                          item={item}
                          onToggleSelect={handleToggleSelect}
                          onPortionChange={handlePortionChange}
                          onIncrement={handleIncrement}
                          onDecrement={handleDecrement}
                          selectedPortion={selectedPortion}
                          quantity={itemQuantity}
                          isEnabled={item.isEnabled}
                          isSelected={isSelected}
                        />
                      </div>
                    );
                  })}
                </ul>
              )}
            </div>
          ))
        )}
        {selectedItems.length > 0 && (
          <div className="order-summary">
            <h4>Selected Items: {selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}</h4>
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
                  <button onClick={() => handleRemoveItem(item.key)} className="remove-button">Remove</button>
                </li>
              ))}
            </ul>
            <p className="order-total">Total: ₹{selectedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 0)), 0).toFixed(2)}</p>
            <button onClick={handleSubmit} className="submit-order-button">Submit Order</button>
          </div>
        )}
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};
export default Menu;