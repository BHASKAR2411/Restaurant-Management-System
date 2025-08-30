// admin-frontend/src/components/MenuTable.js
import React from 'react';
import '../styles/Menu.css';

const MenuTable = ({ menuItems, onDelete, onToggleEnable, onEdit }) => {
  return (
    <div className="menu-table">
      <h3>Menu Items</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Category</th>
            <th>Name</th>
            <th>Veg/Non-Veg</th>
            <th>Full Price</th>
            <th>Half Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {menuItems.length === 0 ? (
            <tr>
              <td colSpan={8}>No menu items</td>
            </tr>
          ) : (
            menuItems.map((item) => (
              <tr key={item.id} className={item.isEnabled ? '' : 'disabled-item'}>
                <td>{item.id}</td>
                <td>{item.category}</td>
                <td>{item.name}</td>
                <td>{item.isVeg ? 'Veg' : 'Non-Veg'}</td>
                <td>₹{item.price.toFixed(2)}</td>
                <td>{item.hasHalf ? `₹${item.halfPrice.toFixed(2)}` : '-'}</td>
                <td>{item.isEnabled ? 'Enabled' : 'Disabled'}</td>
                <td>
                  <button
                    onClick={() => onToggleEnable(item.id)}
                    className={item.isEnabled ? 'disable-button' : 'enable-button'}
                  >
                    {item.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => onEdit(item)}
                    className="edit-button"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MenuTable;