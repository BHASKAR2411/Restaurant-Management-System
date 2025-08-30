// client-frontend/src/components/MenuItem.js
import React, { useState } from 'react';
import '../styles/Menu.css';

const MenuItem = ({ item, onToggleSelect, onPortionChange, onIncrement, onDecrement, selectedPortion, quantity, isEnabled, isSelected }) => {
  const handleCheckboxChange = (e) => {
    onToggleSelect(item, e.target.checked);
  };

  const handlePortionChange = (newPortion) => {
    onPortionChange(item, newPortion);
  };

  return (
    <li className={`menu-item ${isEnabled ? '' : 'disabled-item'}`}>
      <label className="menu-item-label">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          disabled={!isEnabled}
          className="menu-item-checkbox"
        />
        <span className="menu-item-name">
          <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}>
            {item.isVeg ? '●' : '▲'}
          </span>
          {item.name} ({item.isVeg ? 'Veg' : 'Non-Veg'})
        </span>
      </label>
      <div className="price-portion">
        <span>Full: ₹{item.price.toFixed(2)}</span>
        {item.hasHalf && (
          <span>Half: ₹{item.halfPrice.toFixed(2)}</span>
        )}
      </div>
      {item.hasHalf && (
        <div className="portion-controls">
          <label>
            <input
              type="radio"
              name={`portion-${item.id}`}
              value="full"
              checked={selectedPortion === 'full'}
              onChange={() => handlePortionChange('full')}
              disabled={!isEnabled}
              className="portion-radio"
            />
            Full
          </label>
          <label>
            <input
              type="radio"
              name={`portion-${item.id}`}
              value="half"
              checked={selectedPortion === 'half'}
              onChange={() => handlePortionChange('half')}
              disabled={!isEnabled}
              className="portion-radio"
            />
            Half
          </label>
        </div>
      )}
      {isSelected && (
        <div className="quantity-controls">
          <button onClick={() => onDecrement(item, selectedPortion)} disabled={!isEnabled} className="quantity-button">-</button>
          <span className="quantity">{quantity || 0}</span>
          <button onClick={() => onIncrement(item, selectedPortion)} disabled={!isEnabled} className="quantity-button">+</button>
        </div>
      )}
    </li>
  );
};

export default MenuItem;