// admin-frontend/src/components/MenuItem.js
import React, { useState } from 'react';
import '../styles/MenuItem.css';

const MenuItem = ({ item, isSelected, onSelect, onIncrement, onDecrement, quantity, isEnabled }) => {
  const [portion, setPortion] = useState('full');

  return (
    <li className={`menu-item ${!isEnabled ? 'disabled-item' : ''}`}>
      {item.image && <img src={item.image} alt={item.name} className="menu-item-image" />}
      <h3>{item.name}</h3>
      <p className="price">Full: ₹{item.price?.toFixed(2) || '0.00'}</p>
      {item.hasHalf && (
        <p className="half-price">Half: ₹{item.halfPrice?.toFixed(2) || 'N/A'}</p>
      )}
      <p className="veg-status">{item.isVeg ? 'Veg' : 'Non-Veg'}</p>
      {!isEnabled ? (
        <p className="unavailable">Unavailable</p>
      ) : (
        <>
          {item.hasHalf && (
            <div className="portion-controls">
              <label>
                <input
                  type="radio"
                  name={`portion-${item.id}`}
                  value="full"
                  checked={portion === 'full'}
                  onChange={() => setPortion('full')}
                />
                Full
              </label>
              <label>
                <input
                  type="radio"
                  name={`portion-${item.id}`}
                  value="half"
                  checked={portion === 'half'}
                  onChange={() => setPortion('half')}
                />
                Half
              </label>
            </div>
          )}
          {isSelected ? (
            <div className="controls">
              <button onClick={() => onDecrement(item, portion)} className="control-button">-</button>
              <span className="quantity">{quantity}</span>
              <button onClick={() => onIncrement(item, portion)} className="control-button">+</button>
            </div>
          ) : (
            <button onClick={() => onSelect(item, portion)} className="add-button">
              Add to Order
            </button>
          )}
        </>
      )}
    </li>
  );
};

export default MenuItem;