import React from 'react';
import { NavLink } from 'react-router-dom';
import { getTableData } from '../utils/storage';
import '../styles/Footer.css';

const Footer = () => {
  const { tableNo, restaurantId } = getTableData();
  const queryParams = tableNo && restaurantId ? `?table=${tableNo}&restaurant=${restaurantId}` : '';

  return (
    <nav className="footer">
      <NavLink
        to={`/${queryParams}`}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Home
      </NavLink>
      <NavLink
        to={`/menu${queryParams}`}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Menu
      </NavLink>
      <NavLink
        to={`/payment${queryParams}`}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Pay
      </NavLink>
      <NavLink
        to={`/review${queryParams}`}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        Review
      </NavLink>
    </nav>
  );
};

export default Footer;