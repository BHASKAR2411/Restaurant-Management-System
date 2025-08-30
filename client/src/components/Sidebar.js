// client-frontend/src/components/Sidebar.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="sidebar-container">
      <button className="hamburger" onClick={toggleSidebar}>
        ☰
      </button>
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <ul>
          <li>
            <Link to="/" onClick={toggleSidebar}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/menu" onClick={toggleSidebar}>
              Menu
            </Link>
          </li>
          <li>
            <Link to="/review" onClick={toggleSidebar}>
              Review
            </Link>
          </li>
          <li>
            <Link to="/payment" onClick={toggleSidebar}>
              Pay Bill
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;