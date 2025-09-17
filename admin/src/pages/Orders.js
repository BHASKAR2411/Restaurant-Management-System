import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import OrderTable from '../components/OrderTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import '../styles/Orders.css';

const Orders = () => {
  const { user } = useContext(AuthContext);
  const [liveOrders, setLiveOrders] = useState([]);
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState('');
  const [gstRate, setGstRate] = useState(localStorage.getItem('gstRate') || '0');
  const [gstType, setGstType] = useState([]);
  const [serviceCharge, setServiceCharge] = useState('');
  const [discount, setDiscount] = useState('');
  const [message, setMessage] = useState('Have a nice day!');
  const [restaurantDetails, setRestaurantDetails] = useState({
    name: 'Unnamed Restaurant',
    fssai: 'N/A',
    gst: 'N/A',
    phoneNumber: 'N/A',
    address: 'N/A',
  });
  const [pastOrderDateFilter, setPastOrderDateFilter] = useState('');
  const [visiblePastOrders, setVisiblePastOrders] = useState(20);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('month');
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const years = [];
  for (let y = 2020; y <= new Date().getFullYear() + 1; y++) {
    years.push(y);
  }

  useEffect(() => {
    const fetchOrdersAndRestaurantDetails = async () => {
      try {
        const [liveRes, recurringRes, pastRes, restaurantRes, submitDisabledRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/orders/live`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/orders/recurring`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/orders/past`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/orders/restaurant/details`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).catch(() => ({ data: {} })),
          axios.get(`${process.env.REACT_APP_API_URL}/orders/submit-disabled?restaurantId=${user.id}`),
        ]);
        setLiveOrders(liveRes.data);
        setRecurringOrders(recurringRes.data);
        setPastOrders(pastRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setRestaurantDetails({
          name: restaurantRes.data.name || 'Unnamed Restaurant',
          fssai: restaurantRes.data.fssai || 'N/A',
          gst: restaurantRes.data.gst || 'N/A',
          phoneNumber: restaurantRes.data.phoneNumber || 'N/A',
          address: restaurantRes.data.address || 'N/A',
        });
        setIsSubmitDisabled(submitDisabledRes.data.isSubmitDisabled);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch orders or restaurant details');
        setLoading(false);
      }
    };
    fetchOrdersAndRestaurantDetails();

    const socket = io(process.env.REACT_APP_API_URL.replace('/api', ''), {
      auth: { token: localStorage.getItem('token') },
    });

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
    });
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });
    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('submitDisabledUpdate', (data) => {
      if (data.restaurantId === user.id) {
        setIsSubmitDisabled(data.isSubmitDisabled);
        toast.info(`Order submission ${data.isSubmitDisabled ? 'disabled' : 'enabled'}`);
      }
    });

    socket.on('newOrder', (order) => {
      console.log('Received newOrder:', order, 'for restaurantId:', order.restaurantId);
      if (order.restaurantId === user.id) {
        setLiveOrders((prevOrders) => {
          if (prevOrders.some((o) => o.id === order.id)) {
            console.log('Order already exists, skipping:', order.id);
            return prevOrders;
          }
          console.log('Adding new order to liveOrders:', order.id);
          const newOrders = [...prevOrders, order];
          console.log('Updated liveOrders:', newOrders);
          return newOrders;
        });
        toast.info(`New order #${order.id} received for Table ${order.tableNo === 0 ? 'Counter' : order.tableNo}`);
      } else {
        console.log('Order ignored, restaurantId mismatch:', order.restaurantId, 'vs', user.id);
      }
    });

    socket.on('orderUpdated', (order) => {
      if (order.restaurantId === user.id) {
        console.log('Received orderUpdated:', order);
        setLiveOrders((prev) => prev.filter((o) => o.id !== order.id));
        setPastOrders((prev) => prev.filter((o) => o.id !== order.id));
        setRecurringOrders((prev) => {
          const existing = prev.find((o) => o.id === order.id);
          if (existing) {
            return prev.map((o) => (o.id === order.id ? order : o));
          } else {
            return [...prev, order];
          }
        });
        toast.info(`Order #${order.id} updated to recurring`);
      }
    });

    socket.on('ordersCompleted', (data) => {
      console.log('Received ordersCompleted:', data);
      if (data.restaurantId === user.id) {
        setRecurringOrders((prev) => prev.filter((o) => o.tableNo !== parseInt(data.tableNo)));
        setPastOrders((prev) => [...prev, ...data.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        toast.info(`Orders for table ${data.tableNo} moved to past`);
      }
    });

    socket.on('orderDeleted', (data) => {
      console.log('Received orderDeleted:', data);
      if (data.restaurantId === user.id) {
        setLiveOrders((prev) => prev.filter((o) => o.id !== data.id));
        setRecurringOrders((prev) => prev.filter((o) => o.id !== data.id));
        setPastOrders((prev) => prev.filter((o) => o.id !== data.id));
        toast.info(`Order #${data.id} deleted`);
      }
    });

    const pollOrders = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/live`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setLiveOrders((prevOrders) => {
          const newOrders = res.data.filter((order) => !prevOrders.some((o) => o.id === order.id));
          if (newOrders.length > 0) {
            console.log('Polling added new orders:', newOrders);
            newOrders.forEach((order) => {
              toast.info(`New order #${order.id} received for Table ${order.tableNo === 0 ? 'Counter' : order.tableNo} (via polling)`);
            });
          }
          return [...prevOrders, ...newOrders];
        });
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    const pollInterval = setInterval(pollOrders, 10000);

    return () => {
      console.log('Cleaning up WebSocket connection and polling');
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [user]);

  const handleToggleSubmitDisabled = async () => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/orders/toggle-submit-disabled`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsSubmitDisabled(res.data.isSubmitDisabled);
      toast.success(`Order submission ${res.data.isSubmitDisabled ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Error toggling submit disabled:', error);
      toast.error('Failed to toggle submit button state');
    }
    setLoading(false);
  };

  const handleComplete = async (id) => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/orders/${id}/recurring`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setLiveOrders(liveOrders.filter((order) => order.id !== id));
      setRecurringOrders([...recurringOrders, res.data]);
      toast.success('Order moved to recurring');
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to process order');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/orders/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setLiveOrders(liveOrders.filter((order) => order.id !== id));
      setRecurringOrders(recurringOrders.filter((order) => order.id !== id));
      setPastOrders(pastOrders.filter((order) => order.id !== id));
      toast.success('Order deleted successfully');
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
    setLoading(false);
  };

  const handleMoveToRecurring = async (id) => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/orders/${id}/recurring`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setPastOrders(pastOrders.filter((order) => order.id !== id));
      setRecurringOrders([...recurringOrders, res.data]);
      toast.success('Order moved back to recurring');
    } catch (error) {
      console.error('Error moving to recurring:', error);
      toast.error('Failed to move order to recurring');
    }
    setLoading(false);
  };

  const handlePrintKitchenReceipt = (order) => {
    const receiptContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 5mm;
              line-height: 1.5;
            }
            .receipt-container {
              border: 1px solid #000;
              padding: 5px;
            }
            .header {
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .details {
              margin-bottom: 5px;
            }
            .details p {
              margin: 2px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 5px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px;
              text-align: left;
            }
            th {
              background-color: #eee;
            }
            .qty { width: 15%; }
            .item { width: 55%; word-wrap: break-word; }
            .price { width: 30%; text-align: right; }
            .total { text-align: right; font-weight: bold; }
            .instructions {
              margin-top: 5px;
              font-style: italic;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">KITCHEN RECEIPT</div>
            <div class="divider"></div>
            <div class="details">
              <p>Order ID: ${order.id}</p>
              <p>Table No: ${order.tableNo === 0 ? 'Counter' : order.tableNo}</p>
              <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <table>
              <tr>
                <th class="qty">Qty</th>
                <th class="item">Item</th>
                <th class="price">Price</th>
              </tr>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td class="qty">${item.quantity}</td>
                  <td class="item">${item.name}</td>
                  <td class="price">₹${item.price.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </table>
            <div class="total">Total: ₹${order.total.toFixed(2)}</div>
            ${
              order.items.some((item) => item.specialInstructions)
                ? `
              <div class="instructions">
                Instructions:<br>
                ${order.items
                  .filter((item) => item.specialInstructions)
                  .map((item) => `- ${item.specialInstructions}`)
                  .join('<br>')}
              </div>
            `
                : ''
            }
            <div class="divider"></div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintCustomerReceipt = async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    const tableOrders = recurringOrders.filter((order) => order.tableNo === parseInt(selectedTable));
    if (tableOrders.length === 0) {
      toast.error('No orders for selected table');
      return;
    }

    if (!localStorage.getItem('gstRate')) {
      localStorage.setItem('gstRate', gstRate);
    }

    const allItems = tableOrders.flatMap((order) => order.items);
    const groupedItems = allItems.reduce((acc, item) => {
      const existingItem = acc.find((i) => i.name === item.name && i.price === item.price);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);

    const originalSubtotal = groupedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rate = parseFloat(gstRate) / 100;
    let discountAmount = discount ? (originalSubtotal * parseFloat(discount)) / 100 : 0;
    const serviceChargeAmount = parseFloat(serviceCharge) || 0;
    let gstAmount = 0;
    let taxableAmount = 0;

    if (gstType === 'inclusive') {
      const baseSubtotal = originalSubtotal / (1 + rate);
      discountAmount = discount ? (baseSubtotal * parseFloat(discount)) / 100 : 0;
      taxableAmount = baseSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    } else {
      taxableAmount = originalSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    }

    const grandTotal = taxableAmount + gstAmount + serviceChargeAmount;

    const receiptContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 400px;
              margin: 0;
              padding: 5mm;
              line-height: 1.5;
            }
            .receipt-container {
              margin: 10px;
              padding: 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
              color: #2c3e50;
            }
            .logo-placeholder {
              text-align: center;
              margin-bottom: 5px;
              font-size: 10px;
              color: #7f8c8d;
            }
            .details {
              margin-bottom: 10px;
              font-size: 11px;
              color: #34495e;
            }
            .details p {
              margin: 2px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              padding: 5px;
              text-align: left;
              border-bottom: 1px solid #ecf0f1;
            }
            th {
              background-color: #ecf0f1;
              font-weight: bold;
            }
            .qty { width: 15%; }
            .item { width: 50%; word-wrap: break-word; }
            .price, .amount { width: 17.5%; text-align: right; }
            .totals {
              margin-top: 10px;
            }
            .totals p {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
              color: #34495e;
            }
            .totals .grand-total {
              font-weight: bold;
              color: #2c3e50;
              border-top: 2px solid #ecf0f1;
              padding-top: 5px;
            }
            .message {
              text-align: center;
              font-style: italic;
              margin-top: 10px;
              font-size: 11px;
              color: #7f8c8d;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 10px;
              color: #7f8c8d;
              border-top: 1px dashed #ecf0f1;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="logo-placeholder">[Restaurant Logo]</div>
            <div class="header">${restaurantDetails.name}</div>
            <div class="details">
              <p>Address: ${restaurantDetails.address}</p>
              <p>Phone: ${restaurantDetails.phoneNumber}</p>
              <p>GST: ${restaurantDetails.gst}</p>
              <p>FSSAI: ${restaurantDetails.fssai}</p>
            </div>
            <div class="details">
              <p>Table No: ${selectedTable}</p>
              <p>Date: ${new Date().toLocaleString()}</p>
            </div>
            <table>
              <tr>
                <th class="qty">Qty</th>
                <th class="item">Item</th>
                <th class="price">Price</th>
                <th class="amount">Amount</th>
              </tr>
              ${groupedItems
                .map(
                  (item) => `
                <tr>
                  <td class="qty">${item.quantity}</td>
                  <td class="item">${item.name}</td>
                  <td class="price">₹${item.price.toFixed(2)}</td>
                  <td class="amount">₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </table>
            <div class="totals">
              <p><span>Subtotal:</span><span>₹${originalSubtotal.toFixed(2)}</span></p>
              ${discount ? `<p><span>Discount (${discount}%):</span><span>-₹${discountAmount.toFixed(2)}</span></p>` : ''}
              <p><span>Service Charge:</span><span>₹${serviceChargeAmount.toFixed(2)}</span></p>
              <p><span>Taxable Amount:</span><span>₹${taxableAmount.toFixed(2)}</span></p>
              ${gstRate !== '0' ? `<p><span>GST (${gstRate}% ${gstType}):</span><span>₹${gstAmount.toFixed(2)}</span></p>` : ''}
              <p class="grand-total"><span>Grand Total:</span><span>₹${grandTotal.toFixed(2)}</span></p>
            </div>
            ${message ? `<div class="message">${message}</div>` : ''}
            <div class="footer">Thank You! Visit Again!</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();

    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/orders/complete`,
        {
          tableNo: selectedTable,
          discount: parseFloat(discount) || 0,
          message,
          serviceCharge: serviceChargeAmount,
          gstRate: parseFloat(gstRate),
          gstType,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setRecurringOrders(recurringOrders.filter((o) => o.tableNo !== parseInt(selectedTable)));
      setPastOrders([...pastOrders, ...tableOrders.map((o) => ({ ...o, status: 'past' }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      toast.success('Receipt printed and orders moved to past');
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Failed to complete order');
    }

    setSelectedTable('');
    setServiceCharge('');
    setDiscount('');
    setMessage('Have a nice day!');
  };

  const handleReprint = async (orderId) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/reprint/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const { items, originalSubtotal, discountPercent, discountAmount, serviceCharge, gstRate, gstType, gstAmount, taxableAmount, total, message, tableNo, completionDate } = res.data;

      const receiptContent = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                width: 400px;
                margin: 0;
                padding: 5mm;
                line-height: 1.5;
              }
              .receipt-container {
                margin: 10px;
                padding: 0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: #2c3e50;
              }
              .logo-placeholder {
                text-align: center;
                margin-bottom: 5px;
                font-size: 10px;
                color: #7f8c8d;
              }
              .details {
                margin-bottom: 10px;
                font-size: 11px;
                color: #34495e;
              }
              .details p {
                margin: 2px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
              }
              th, td {
                padding: 5px;
                text-align: left;
                border-bottom: 1px solid #ecf0f1;
              }
              th {
                background-color: #ecf0f1;
                font-weight: bold;
              }
              .qty { width: 15%; }
              .item { width: 50%; word-wrap: break-word; }
              .price, .amount { width: 17.5%; text-align: right; }
              .totals {
                margin-top: 10px;
              }
              .totals p {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-size: 12px;
                color: #34495e;
              }
              .totals .grand-total {
                font-weight: bold;
                color: #2c3e50;
                border-top: 2px solid #ecf0f1;
                padding-top: 5px;
              }
              .message {
                text-align: center;
                font-style: italic;
                margin-top: 10px;
                font-size: 11px;
                color: #7f8c8d;
              }
              .footer {
                text-align: center;
                margin-top: 10px;
                font-size: 10px;
                color: #7f8c8d;
                border-top: 1px dashed #ecf0f1;
                padding-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              <div class="logo-placeholder">[Restaurant Logo]</div>
              <div class="header">${restaurantDetails.name}</div>
              <div class="details">
                <p>Address: ${restaurantDetails.address}</p>
                <p>Phone: ${restaurantDetails.phoneNumber}</p>
                <p>GST: ${restaurantDetails.gst}</p>
                <p>FSSAI: ${restaurantDetails.fssai}</p>
              </div>
              <div class="details">
                <p>Table No: ${tableNo}</p>
                <p>Date: ${new Date(completionDate).toLocaleString()}</p>
              </div>
              <table>
                <tr>
                  <th class="qty">Qty</th>
                  <th class="item">Item</th>
                  <th class="price">Price</th>
                  <th class="amount">Amount</th>
                </tr>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td class="qty">${item.quantity}</td>
                    <td class="item">${item.name}</td>
                    <td class="price">₹${item.price.toFixed(2)}</td>
                    <td class="amount">₹${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </table>
              <div class="totals">
                <p><span>Subtotal:</span><span>₹${originalSubtotal.toFixed(2)}</span></p>
                ${discountPercent ? `<p><span>Discount (${discountPercent}%):</span><span>-₹${discountAmount.toFixed(2)}</span></p>` : ''}
                <p><span>Service Charge:</span><span>₹${serviceCharge.toFixed(2)}</span></p>
                <p><span>Taxable Amount:</span><span>₹${taxableAmount.toFixed(2)}</span></p>
                ${gstRate !== 0 ? `<p><span>GST (${gstRate}% ${gstType}):</span><span>₹${gstAmount.toFixed(2)}</span></p>` : ''}
                <p class="grand-total"><span>Grand Total:</span><span>₹${total.toFixed(2)}</span></p>
              </div>
              ${message ? `<div class="message">${message}</div>` : ''}
              <div class="footer">Thank You! Visit Again!</div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
      toast.success('Receipt reprinted');
    } catch (error) {
      console.error('Error reprinting receipt:', error);
      toast.error('Failed to reprint receipt');
    }
  };

  const getReceiptPreview = () => {
    if (!selectedTable) {
      return '<div class="preview-placeholder">Select a table to preview receipt</div>';
    }

    const tableOrders = recurringOrders.filter((order) => order.tableNo === parseInt(selectedTable));
    if (tableOrders.length === 0) {
      return '<div class="preview-placeholder">No orders for selected table</div>';
    }

    const allItems = tableOrders.flatMap((order) => order.items);
    const groupedItems = allItems.reduce((acc, item) => {
      const existingItem = acc.find((i) => i.name === item.name && i.price === item.price);
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);

    const originalSubtotal = groupedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const rate = parseFloat(gstRate) / 100;
    let discountAmount = discount ? (originalSubtotal * parseFloat(discount)) / 100 : 0;
    const serviceChargeAmount = parseFloat(serviceCharge) || 0;
    let gstAmount = 0;
    let taxableAmount = 0;

    if (gstType === 'inclusive') {
      const baseSubtotal = originalSubtotal / (1 + rate);
      discountAmount = discount ? (baseSubtotal * parseFloat(discount)) / 100 : 0;
      taxableAmount = baseSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    } else {
      taxableAmount = originalSubtotal - discountAmount;
      gstAmount = taxableAmount * rate;
    }

    const grandTotal = taxableAmount + gstAmount + serviceChargeAmount;

    return `
      <div class="receipt-container">
        <div class="logo-placeholder">[Restaurant Logo]</div>
        <div class="header">${restaurantDetails.name}</div>
        <div class="details">
          <p>Address: ${restaurantDetails.address}</p>
          <p>Phone: ${restaurantDetails.phoneNumber}</p>
          <p>GST: ${restaurantDetails.gst}</p>
          <p>FSSAI: ${restaurantDetails.fssai}</p>
        </div>
        <div class="details">
          <p>Table No: ${selectedTable}</p>
          <p>Date: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <tr>
            <th class="qty">Qty</th>
            <th class="item">Item</th>
            <th class="price">Price</th>
            <th class="amount">Amount</th>
          </tr>
          ${groupedItems
            .map(
              (item) => `
            <tr>
              <td class="qty">${item.quantity}</td>
              <td class="item">${item.name}</td>
              <td class="price">₹${item.price.toFixed(2)}</td>
              <td class="amount">₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </table>
        <div class="totals">
          <p><span>Subtotal:</span><span>₹${originalSubtotal.toFixed(2)}</span></p>
          ${discount ? `<p><span>Discount (${discount}%):</span><span>-₹${discountAmount.toFixed(2)}</span></p>` : ''}
          <p><span>Service Charge:</span><span>₹${serviceChargeAmount.toFixed(2)}</span></p>
          <p><span>Taxable Amount:</span><span>₹${taxableAmount.toFixed(2)}</span></p>
          ${gstRate !== '0' ? `<p><span>GST (${gstRate}% ${gstType}):</span><span>₹${gstAmount.toFixed(2)}</span></p>` : ''}
          <p class="grand-total"><span>Grand Total:</span><span>₹${grandTotal.toFixed(2)}</span></p>
        </div>
        ${message ? `<div class="message">${message}</div>` : ''}
        <div class="footer">Thank You! Visit Again!</div>
      </div>
    `;
  };

  const uniqueTables = [...new Set(recurringOrders.map((order) => order.tableNo))];

  const filteredPastOrders = pastOrderDateFilter
    ? pastOrders.filter((order) =>
        new Date(order.createdAt).toISOString().slice(0, 10) === pastOrderDateFilter
      )
    : pastOrders;

  const handleShowMore = () => {
    setVisiblePastOrders((prev) => prev + 20);
  };

  const handleExportClick = () => {
    console.log('Export button clicked, opening modal');
    setShowExportModal(true);
  };

  const handleCloseModal = () => {
    console.log('Closing export modal');
    setShowExportModal(false);
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value);
    console.log('Month toggled:', month, 'checked:', e.target.checked);
    if (e.target.checked) {
      setSelectedMonths([...selectedMonths, month]);
    } else {
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    }
  };

  const handleDownload = async () => {
    console.log('Initiating download with type:', exportType, 'year:', exportYear, 'months:', selectedMonths, 'from:', fromDate, 'to:', toDate);
    try {
      let params = `type=${exportType}&year=${exportYear}`;
      if (exportType === 'month') {
        if (selectedMonths.length === 0) {
          toast.error('Please select at least one month');
          console.log('No months selected for export');
          return;
        }
        params += `&months=${selectedMonths.join(',')}`;
      } else if (exportType === 'custom') {
        if (!fromDate || !toDate) {
          toast.error('Please select date range');
          console.log('Missing date range for custom export');
          return;
        }
        params = `type=custom&from=${fromDate}&to=${toDate}`;
      }
      console.log('Sending export request with params:', params);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/orders/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      });
      console.log('Export request successful, received response');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `past_orders_${exportType}_${exportType === 'custom' ? `${fromDate}_to_${toDate}` : exportYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Error exporting orders:', error);
      if (error.response) {
        console.log('Error response:', error.response.status, error.response.data);
        toast.error(`Failed to export orders: ${error.response.data.message || 'Server error'}`);
      } else {
        toast.error('Failed to export orders: Network error');
      }
    }
  };

  return (
    <div className="orders-container">
      <Sidebar />
      <div className="orders-content">
        {loading && <LoadingSpinner />}
        <div className="orders-header">
          <h2>Orders</h2>
          <div className="orders-header-buttons">
            <Link to="/take-order" className="take-order-btn">
              Take Order
            </Link>
            <button
              className={`disable-submit-btn ${isSubmitDisabled ? '' : 'enabled'}`}
              onClick={handleToggleSubmitDisabled}
            >
              {isSubmitDisabled ? 'Enable Submit' : 'Disable Submit'}
            </button>
          </div>
        </div>
        <div className="order-table-container">
          <OrderTable
            title="Live Orders"
            orders={liveOrders.slice(0, 5)}
            onComplete={handleComplete}
            onDelete={handleDelete}
            onPrintKitchenReceipt={handlePrintKitchenReceipt}
          />
        </div>

        <div className="recurring-receipt-container">
          <div className="recurring-orders">
            <div className="order-table-container recurring-orders-table">
              <OrderTable title="Recurring Orders" orders={recurringOrders} onDelete={handleDelete} />
            </div>
          </div>

          <div className="receipt-section">
            <div className="receipt-form-container">
              <h3>Receipt Settings</h3>
              <div className="receipt-form">
                <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                  <option value="">Select Table</option>
                  {uniqueTables.map((tableNo) => (
                    <option key={tableNo} value={tableNo}>
                      Table {tableNo === 0 ? 'Counter' : tableNo}
                    </option>
                  ))}
                </select>
                <select value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                  <option value="0">0% GST</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                </select>
                <div className="gst-type">
                  <label>
                    <input
                      type="radio"
                      value="inclusive"
                      checked={gstType === 'inclusive'}
                      onChange={(e) => setGstType(e.target.value)}
                    />
                    Inclusive
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="exclusive"
                      checked={gstType === 'exclusive'}
                      onChange={(e) => setGstType(e.target.value)}
                    />
                    Exclusive
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="Service Charge (₹)"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Discount %"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min="0"
                  max="100"
                />
                <textarea
                  placeholder="Message for receipt"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={handlePrintCustomerReceipt}>Print Receipt</button>
              </div>
            </div>
            <div className="receipt-preview">
              <h3>Receipt Preview</h3>
              <div
                className="receipt-preview-content"
                dangerouslySetInnerHTML={{ __html: getReceiptPreview() }}
              />
            </div>
          </div>
        </div>

        <div className="past-orders-container">
          <div className="past-orders-header">
            <h3>Past Orders</h3>
            <div className="date-filter-container">
              <label htmlFor="past-order-date-filter">Filter by Date:</label>
              <input
                id="past-order-date-filter"
                type="date"
                value={pastOrderDateFilter}
                onChange={(e) => setPastOrderDateFilter(e.target.value)}
              />
              <button className="export-btn" onClick={handleExportClick}>Export to Excel</button>
            </div>
          </div>
          <div className="order-table-container past-orders-table">
            <OrderTable
              title=""
              orders={filteredPastOrders.slice(0, visiblePastOrders)}
              onDelete={handleDelete}
              onReprint={handleReprint}
              onMoveToRecurring={handleMoveToRecurring}
              isPast={true}
            />
          </div>
          {filteredPastOrders.length > visiblePastOrders && (
            <button className="see-more-button" onClick={handleShowMore}>
              See More
            </button>
          )}
        </div>
        {showExportModal && (
          <div className="export-modal">
            <div className="modal-content">
              <h3>Export Past Orders</h3>
              <select value={exportType} onChange={(e) => setExportType(e.target.value)}>
                <option value="month">By Month</option>
                <option value="year">By Year</option>
                <option value="custom">Custom Range</option>
              </select>
              {(exportType === 'month' || exportType === 'year') && (
                <select value={exportYear} onChange={(e) => setExportYear(e.target.value)}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}
              {exportType === 'month' && (
                <div className="months-selection">
                  {monthNames.map((name, index) => (
                    <label key={index}>
                      <input
                        type="checkbox"
                        value={index + 1}
                        checked={selectedMonths.includes(index + 1)}
                        onChange={handleMonthChange}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              )}
              {exportType === 'custom' && (
                <div className="custom-date">
                  <label>From:</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  <label>To:</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              )}
              <div className="modal-buttons">
                <button onClick={handleDownload}>Download</button>
                <button onClick={handleCloseModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <footer className="page-footer">Powered by SAE. All rights reserved.</footer>
      </div>
    </div>
  );
};

export default Orders;