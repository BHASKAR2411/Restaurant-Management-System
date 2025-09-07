import React from 'react';
import '../styles/Menu.css';

const MenuItem = ({ item, onToggleSelect, onIncrement, onDecrement, fullQuantity, halfQuantity, isEnabled, isFullSelected, isHalfSelected }) => {
  const handleCheckboxChange = (portion, e) => {
    onToggleSelect(item, portion, e.target.checked);
  };

  return (
    <li className={`menu-item ${isEnabled ? '' : 'disabled-item'}`}>
      <div className="menu-item-content">
        <div className="menu-item-details">
          <span className="menu-item-name">
            <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}>
              {item.isVeg ? '●' : '▲'}
            </span>
            {item.name} ({item.isVeg ? 'Veg' : 'Non-Veg'})
          </span>
          {item.description && (
            <p className="menu-item-description">{item.description}</p>
          )}
          <div className="price-portion">
            <span>Full: ₹{item.price.toFixed(2)}</span>
            {item.hasHalf && (
              <span>Half: ₹{item.halfPrice.toFixed(2)}</span>
            )}
          </div>
        </div>
        <div className="portion-controls-container">
          <div className="portion-controls">
            <label className="portion-label">
              Full
              <input
                type="checkbox"
                checked={isFullSelected}
                onChange={(e) => handleCheckboxChange('full', e)}
                disabled={!isEnabled}
                className="portion-checkbox"
              />
            </label>
            {isFullSelected && (
              <div className="quantity-controls">
                <button onClick={() => onDecrement(item, 'full')} disabled={!isEnabled} className="quantity-button">-</button>
                <span className="quantity">{fullQuantity || 0}</span>
                <button onClick={() => onIncrement(item, 'full')} disabled={!isEnabled} className="quantity-button">+</button>
              </div>
            )}
          </div>
          {item.hasHalf && (
            <div className="portion-controls">
              <label className="portion-label">
                Half
                <input
                  type="checkbox"
                  checked={isHalfSelected}
                  onChange={(e) => handleCheckboxChange('half', e)}
                  disabled={!isEnabled}
                  className="portion-checkbox"
                />
              </label>
              {isHalfSelected && (
                <div className="quantity-controls">
                  <button onClick={() => onDecrement(item, 'half')} disabled={!isEnabled} className="quantity-button">-</button>
                  <span className="quantity">{halfQuantity || 0}</span>
                  <button onClick={() => onIncrement(item, 'half')} disabled={!isEnabled} className="quantity-button">+</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default MenuItem;