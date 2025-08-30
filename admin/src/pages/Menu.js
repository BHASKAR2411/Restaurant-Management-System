import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as yup from 'yup';
import Sidebar from '../components/Sidebar';
import MenuTable from '../components/MenuTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/Menu.css';

const schema = yup.object().shape({
  category: yup.string().required('Category is required'),
  name: yup.string().required('Name is required'),
  isVeg: yup.boolean().required('Veg/non-veg status is required'),
  price: yup.number().positive('Price must be positive').required('Price is required'),
  hasHalf: yup.boolean().optional().default(false),
  halfPrice: yup.number().when('hasHalf', {
    is: true,
    then: (schema) => schema.positive('Half price must be positive').required('Half price is required'),
    otherwise: (schema) => schema.nullable(),
  }),
  isEnabled: yup.boolean().optional(),
});

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    isVeg: true,
    price: '',
    hasHalf: false,
    halfPrice: '',
    isEnabled: true,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/menu?restaurantId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenuItems(res.data);
      } catch (error) {
        toast.error('Failed to fetch menu');
      }
      setLoading(false);
    };
    fetchMenu();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'radio' ? value === 'true' : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        halfPrice: formData.hasHalf ? parseFloat(formData.halfPrice) || 0 : null,
      };
      await schema.validate(data, { abortEarly: false });
      let res;
      if (editingItem) {
        res = await axios.put(
          `${process.env.REACT_APP_API_URL}/menu/${editingItem.id}`,
          data,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMenuItems(menuItems.map((item) => (item.id === editingItem.id ? res.data : item)));
        toast.success('Menu item updated');
        setEditingItem(null);
      } else {
        res = await axios.post(
          `${process.env.REACT_APP_API_URL}/menu`,
          data,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMenuItems([...menuItems, res.data]);
        toast.success('Menu item added');
      }
      setFormData({ category: '', name: '', isVeg: true, price: '', hasHalf: false, halfPrice: '', isEnabled: true });
    } catch (error) {
      if (error.name === 'ValidationError') {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to add/update menu item');
      }
    }
    setLoading(false);
  };

  const handleEdit = (item) => {
    setFormData({
      category: item.category,
      name: item.name,
      isVeg: item.isVeg,
      price: item.price.toString(),
      hasHalf: item.hasHalf,
      halfPrice: item.halfPrice ? item.halfPrice.toString() : '',
      isEnabled: item.isEnabled,
    });
    setEditingItem(item);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/menu/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success('Menu item deleted');
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
    setLoading(false);
  };

  const handleToggleEnable = async (id) => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/menu/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMenuItems(menuItems.map((item) => (item.id === id ? res.data : item)));
      toast.success(`Menu item ${res.data.isEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error('Failed to toggle menu item');
    }
    setLoading(false);
  };

  return (
    <div className="menu-container">
      <Sidebar />
      <div className="menu-content">
        {loading && <LoadingSpinner />}
        <h2>Menu Management</h2>
        <form onSubmit={handleSubmit} className="menu-form">
          <input
            type="text"
            name="category"
            placeholder="Category (e.g., Appetizer)"
            value={formData.category}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="name"
            placeholder="Item Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="isVeg"
                value="true"
                checked={formData.isVeg}
                onChange={handleChange}
              />
              Veg
            </label>
            <label>
              <input
                type="radio"
                name="isVeg"
                value="false"
                checked={!formData.isVeg}
                onChange={handleChange}
              />
              Non-Veg
            </label>
          </div>
          <input
            type="number"
            name="price"
            placeholder="Full Price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            required
          />
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="hasHalf"
                checked={formData.hasHalf}
                onChange={handleChange}
              />
              Enable Half Portion
            </label>
          </div>
          {formData.hasHalf && (
            <input
              type="number"
              name="halfPrice"
              placeholder="Half Price"
              value={formData.halfPrice}
              onChange={handleChange}
              step="0.01"
              required
            />
          )}
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isEnabled"
                checked={formData.isEnabled}
                onChange={handleChange}
              />
              Enabled
            </label>
          </div>
          <button type="submit">{editingItem ? 'Update Item' : 'Add Item'}</button>
        </form>
        <MenuTable
          menuItems={menuItems}
          onDelete={handleDelete}
          onToggleEnable={handleToggleEnable}
          onEdit={handleEdit}
        />
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default Menu;