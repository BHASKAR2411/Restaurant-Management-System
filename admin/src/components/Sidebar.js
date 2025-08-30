import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom'; // Replace Link with NavLink
import { AuthContext } from '../context/AuthContext';
import '../styles/Sidebar.css';
import sae from '../assets/sae.png';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);

  return (
    <div className="sidebar">
      <div className="saelogo-container">
        <img src={sae} alt="Bottom Right" className="saelogo" />
      </div>
      <ul>
        <li>
          <NavLink to="/dashboard" activeClassName="active">Home</NavLink>
        </li>
        <li>
          <NavLink to="/menu" activeClassName="active">Menu</NavLink>
        </li>
        <li>
          <NavLink to="/orders" activeClassName="active">Orders</NavLink>
        </li>
        <li>
          <NavLink to="/account" activeClassName="active">Account</NavLink>
        </li>
        <li>
          <NavLink to="/reviews" activeClassName="active">Reviews</NavLink>
        </li>
        <li>
          <NavLink to="/qr-code" activeClassName="active">QR Generation</NavLink>
        </li>
        <li className="logout-item">
          <button onClick={logout}>Log Out</button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;