import React from 'react';
import '../styles/Orders.css';

const OrderTable = ({ orders, title, onComplete, onDelete, onPrintKitchenReceipt, onReprint, onMoveToRecurring, isPast = false }) => {
  const showActions = onComplete || onDelete || onPrintKitchenReceipt || onReprint || onMoveToRecurring;

  return (
    <div className="order-table">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Table No.</th>
            <th>Items</th>
            <th>{isPast ? 'Grand Total' : 'Total'}</th>
            <th>Date & Time</th>
            {showActions && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={showActions ? 5 : 4}>No orders</td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id}>
                <td>{order.tableNo}</td>
                <td>
                  {order.items.map((item) => `${item.name}${item.portion ? ` (${item.portion})` : ''} (x${item.quantity})`).join(', ')}
                </td>
                <td>₹{(isPast && order.receiptDetails ? order.receiptDetails.total : order.total).toFixed(2)}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                {showActions && (
                  <td>
                    {onComplete && (
                      <button
                        onClick={() => {
                          onPrintKitchenReceipt(order);
                          onComplete(order.id);
                        }}
                        style={{ marginRight: '5px' }}
                      >
                        ✔ Accept
                      </button>
                    )}
                    {onReprint && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to reprint this receipt?')) {
                            onReprint(order.id); // Changed from order.tableNo to order.id
                          }
                        }}
                        style={{ marginRight: '5px' }}
                      >
                        🖨 Reprint
                      </button>
                    )}
                    {onMoveToRecurring && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to move this order to recurring?')) {
                            onMoveToRecurring(order.id);
                          }
                        }}
                        style={{ marginRight: '5px' }}
                      >
                        ↻ Move to Recurring
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this order?')) {
                            onDelete(order.id);
                          }
                        }}
                        style={{ backgroundColor: '#ff4444', color: 'white' }}
                      >
                        ✗ Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;