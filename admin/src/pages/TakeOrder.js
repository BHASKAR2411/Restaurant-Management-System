import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/TakeOrder.css';

const TakeOrder = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableNo, setTableNo] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegFilter, setVegFilter] = useState('all');

  useEffect(() => {
    if (!user?.id) {
      console.error('Invalid user ID:', user?.id);
      toast.error('Invalid user ID. Please log in again.');
      setLoading(false);
      return;
    }

    const restaurantId = Number(user.id);
    if (isNaN(restaurantId) || restaurantId <= 0) {
      console.error('Invalid restaurantId:', restaurantId);
      toast.error('Invalid restaurant ID. Please try again.');
      setLoading(false);
      return;
    }

    const fetchMenu = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching menu:', error.response?.data || error.message);
        toast.error('Failed to load menu');
        setMenuItems([]);
        setLoading(false);
      }
    };
    fetchMenu();
  }, [user]);

  const handleSelect = (item, portion = 'full') => {
    if (!item.isEnabled) {
      toast.warning('This item is currently unavailable');
      return;
    }
    const itemPrice = portion === 'half' && item.hasHalf ? item.halfPrice : item.price;
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.key === itemKey);
      if (existingItem) {
        return prevItems.map((i) => (i.key === itemKey ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        return [...prevItems, { ...item, price: itemPrice, portion, quantity: 1, key: itemKey }];
      }
    });
  };

  const handleIncrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) =>
      prevItems.map((i) => (i.key === itemKey ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const handleDecrement = (item, portion) => {
    const itemKey = `${item.id}-${portion}`;
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.key === itemKey);
      if (existingItem.quantity === 1) {
        return prevItems.filter((i) => i.key !== itemKey);
      }
      return prevItems.map((i) => (i.key === itemKey ? { ...i, quantity: i.quantity - 1 } : i));
    });
  };

  const handleRemove = (itemKey) => {
    setSelectedItems((prevItems) => prevItems.filter((i) => i.key !== itemKey));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity || 0), 0);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select at least one item');
      return;
    }

    const restaurantId = Number(user.id);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token missing. Please log in again.');
      return;
    }

    const invalidItems = selectedItems.filter((item) => !menuItems.some((menuItem) => menuItem.id === item.id));
    if (invalidItems.length > 0) {
      console.error('Invalid items selected:', invalidItems);
      toast.error('Selected items are invalid. Please try again.');
      return;
    }

    const preparedItems = selectedItems.map((item) => ({
      id: item.id,
      name: item.name,
      isVeg: item.isVeg,
      price: Number(item.price),
      quantity: item.quantity,
      portion: item.portion,
    }));

    const payload = {
      tableNo: Number(tableNo) || 1,
      items: preparedItems,
      total: calculateTotal(),
      restaurantId,
    };

    setLoading(true);
    try {
      console.log('Submitting admin order payload:', JSON.stringify(payload, null, 2));
      await axios.post(`${process.env.REACT_APP_API_URL}/orders/admin`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Order placed successfully');
      setSelectedItems([]);
      navigate('/orders');
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error('Error placing admin order:', errorDetails);
      const errorMessage = errorDetails.message || 'Failed to place order';
      if (errorDetails.errors) {
        toast.error(`${errorMessage}: ${errorDetails.errors.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
    }
    setLoading(false);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg =
      vegFilter === 'all' ||
      (vegFilter === 'veg' && item.isVeg) ||
      (vegFilter === 'non-veg' && !item.isVeg);
    return matchesSearch && matchesVeg;
  });

  if (!user) return null;

  return (
    <div className="take-order-container">
      <Sidebar />
      <div className="take-order-content">
        {loading && <LoadingSpinner />}
        <h2>Take Order</h2>
        <div className="table-input">
          <label>Table Number: </label>
          <input
            type="number"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
            min="1"
            placeholder="Enter table number"
          />
        </div>
        <div className="filters">
          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
            />
          </div>
          <div className="veg-filter">
            <label>
              <input
                type="radio"
                name="vegFilter"
                value="all"
                checked={vegFilter === 'all'}
                onChange={() => setVegFilter('all')}
              />
              All
            </label>
            <label>
              <input
                type="radio"
                name="vegFilter"
                value="veg"
                checked={vegFilter === 'veg'}
                onChange={() => setVegFilter('veg')}
              />
              Veg
            </label>
            <label>
              <input
                type="radio"
                name="vegFilter"
                value="non-veg"
                checked={vegFilter === 'non-veg'}
                onChange={() => setVegFilter('non-veg')}
              />
              Non-Veg
            </label>
          </div>
        </div>
        <div className="split-container">
          <div className="menu-table">
            <h3>Menu Items</h3>
            {filteredItems.length === 0 ? (
              <p>No items found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Item ID</th>
                    <th>Category</th>
                    <th>Veg/Non-Veg</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const fullKey = `${item.id}-full`;
                    const halfKey = item.hasHalf ? `${item.id}-half` : null;
                    const fullSelected = selectedItems.find((i) => i.key === fullKey);
                    const halfSelected = halfKey ? selectedItems.find((i) => i.key === halfKey) : null;
                    const fullQuantity = fullSelected ? fullSelected.quantity : 0;
                    const halfQuantity = halfSelected ? halfSelected.quantity : 0;

                    return (
                      <tr key={item.id} className={item.isEnabled ? '' : 'disabled-item'}>
                        <td>{item.name}</td>
                        <td>{item.id}</td>
                        <td>{item.category || 'N/A'}</td>
                        <td>{item.isVeg ? 'Veg' : 'Non-Veg'}</td>
                        <td>
                          Full: ₹{Number(item.price).toFixed(2)}
                          {item.hasHalf && <br />}
                          {item.hasHalf && `Half: ₹${Number(item.halfPrice).toFixed(2)}`}
                        </td>
                        <td>
                          {item.isEnabled ? (
                            <>
                              <div className="controls">
                                {fullQuantity > 0 ? (
                                  <div>
                                    <span>Full: </span>
                                    <button onClick={() => handleDecrement(item, 'full')}>-</button>
                                    <span>{fullQuantity}</span>
                                    <button onClick={() => handleIncrement(item, 'full')}>+</button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleSelect(item, 'full')}>
                                    Add Full
                                  </button>
                                )}
                              </div>
                              {item.hasHalf && (
                                <div className="controls">
                                  {halfQuantity > 0 ? (
                                    <div>
                                      <span>Half: </span>
                                      <button onClick={() => handleDecrement(item, 'half')}>-</button>
                                      <span>{halfQuantity}</span>
                                      <button onClick={() => handleIncrement(item, 'half')}>+</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => handleSelect(item, 'half')}>
                                      Add Half
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <span>Unavailable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="selected-items">
            <h3>Selected Items</h3>
            {selectedItems.length === 0 ? (
              <p>No items selected.</p>
            ) : (
              <ul>
                {selectedItems.map((item) => (
                  <li key={item.key}>
                    <span>
                      {item.name} ({item.portion}) x {item.quantity}
                    </span>
                    <span>₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                    <button onClick={() => handleRemove(item.key)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="total">
              <strong>Total: ₹{calculateTotal().toFixed(2)}</strong>
            </div>
          </div>
        </div>
        <button className="submit-order-btn" onClick={handleSubmit}>
          Submit Order
        </button>
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default TakeOrder;