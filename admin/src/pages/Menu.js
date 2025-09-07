// admin-frontend/src/pages/Menu.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as yup from "yup";
import Sidebar from "../components/Sidebar";
import MenuTable from "../components/MenuTable";
import LoadingSpinner from "../components/LoadingSpinner";
import { toast } from "react-toastify";
import "../styles/Menu.css";

const schema = yup.object().shape({
  category: yup.string().required("Category is required"),
  name: yup.string().required("Name is required"),
  description: yup.string().optional(),
  isVeg: yup.boolean().required("Veg/non-veg status is required"),
  price: yup
    .number()
    .positive("Price must be positive")
    .required("Price is required"),
  hasHalf: yup.boolean().optional().default(false),
  halfPrice: yup.number().when("hasHalf", {
    is: true,
    then: (schema) =>
      schema
        .positive("Half price must be positive")
        .required("Half price is required"),
    otherwise: (schema) => schema.nullable(),
  }),
  isEnabled: yup.boolean().optional(),
});

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState({
    category: "",
    name: "",
    description: "",
    isVeg: true,
    price: "",
    hasHalf: false,
    halfPrice: "",
    isEnabled: true,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/menu?restaurantId=${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMenuItems(res.data);
      } catch (error) {
        toast.error("Failed to fetch menu");
      }
      setLoading(false);
    };
    fetchMenu();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let sanitizedValue = value;
    if (type === "number") {
      sanitizedValue =
        value === ""
          ? ""
          : /^[0-9]*\.?[0-9]*$/.test(value) && parseFloat(value) > 0
          ? value
          : formData[name];
    }
    setFormData({
      ...formData,
      [name]:
        type === "checkbox"
          ? checked
          : type === "radio"
          ? value === "true"
          : sanitizedValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate price
      const parsedPrice = parseFloat(formData.price);
      if (!formData.price || isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error("Price must be a positive number greater than 0");
        setLoading(false);
        return;
      }
      // Validate halfPrice if hasHalf is true
      const parsedHalfPrice = formData.hasHalf
        ? parseFloat(formData.halfPrice)
        : null;
      if (
        formData.hasHalf &&
        (!formData.halfPrice || isNaN(parsedHalfPrice) || parsedHalfPrice <= 0)
      ) {
        toast.error("Half price must be a positive number greater than 0");
        setLoading(false);
        return;
      }
      const userId = parseInt(localStorage.getItem("userId")); // Parse userId to integer
      if (isNaN(userId)) {
        toast.error("Invalid user ID");
        setLoading(false);
        return;
      }
      const data = {
        ...formData,
        price: parsedPrice,
        halfPrice: parsedHalfPrice,
        userId,
      };
      console.log("Submitting payload:", JSON.stringify(data, null, 2));
      await schema.validate(data, { abortEarly: false });
      let res;
      if (editingItem) {
        console.log("Updating menu item with ID:", editingItem.id);
        res = await axios.put(
          `${process.env.REACT_APP_API_URL}/menu/${editingItem.id}`,
          data,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setMenuItems(
          menuItems.map((item) =>
            item.id === editingItem.id ? res.data : item
          )
        );
        toast.success("Menu item updated");
        setEditingItem(null);
      } else {
        console.log("Creating new menu item");
        res = await axios.post(`${process.env.REACT_APP_API_URL}/menu`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("Server response:", JSON.stringify(res.data, null, 2));
        setMenuItems([...menuItems, res.data]);
        toast.success("Menu item added");
      }
      setFormData({
        category: "",
        name: "",
        description: "",
        isVeg: true,
        price: "",
        hasHalf: false,
        halfPrice: "",
        isEnabled: true,
      });
    } catch (error) {
      console.error("Submission error:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
        payload: JSON.stringify(formData, null, 2),
      });
      if (error.name === "ValidationError") {
        error.inner.forEach((err) => toast.error(err.message));
      } else {
        toast.error(
          error.response?.data?.details ||
            error.response?.data?.error ||
            "Failed to add/update menu item"
        );
      }
    }
    setLoading(false);
  };

  const handleEdit = (item) => {
    setFormData({
      category: item.category,
      name: item.name,
      description: item.description || "",
      isVeg: item.isVeg,
      price: item.price.toString(),
      hasHalf: item.hasHalf,
      halfPrice: item.halfPrice ? item.halfPrice.toString() : "",
      isEnabled: item.isEnabled,
    });
    setEditingItem(item);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/menu/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success("Menu item deleted");
    } catch (error) {
      toast.error("Failed to delete menu item");
    }
    setLoading(false);
  };

  const handleToggleEnable = async (id) => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/menu/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setMenuItems(menuItems.map((item) => (item.id === id ? res.data : item)));
      toast.success(
        `Menu item ${res.data.isEnabled ? "enabled" : "disabled"} successfully`
      );
    } catch (error) {
      toast.error("Failed to toggle menu item");
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
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              type="text"
              id="category"
              name="category"
              placeholder="e.g., Appetizer"
              value={formData.category}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Item Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g., Paneer Tikka"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              placeholder="e.g., Spicy grilled paneer with herbs"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-group radio-group">
            <label>Veg/Non-Veg</label>
            <div className="radio-options">
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
          </div>
          <div className="form-group">
            <label htmlFor="price">Full Price (₹)</label>
            <input
              type="number"
              id="price"
              name="price"
              placeholder="e.g., 250.00"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
            />
          </div>
          <div className="form-group checkbox-group">
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
            <div className="form-group">
              <label htmlFor="halfPrice">Half Price (₹)</label>
              <input
                type="number"
                id="halfPrice"
                name="halfPrice"
                placeholder="e.g., 150.00"
                value={formData.halfPrice}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                required
              />
            </div>
          )}
          <div className="form-group checkbox-group">
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
          <button type="submit">
            {editingItem ? "Update Item" : "Add Item"}
          </button>
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