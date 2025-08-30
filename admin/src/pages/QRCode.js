import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';
import '../styles/QRCode.css';
import s1 from '../assets/s1.png';
import s2 from '../assets/s2.png';
import s3 from '../assets/s3.png';

const QRCode = () => {
  const { user } = useContext(AuthContext);
  const [tableNo, setTableNo] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState('');

  const fetchTables = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/tables`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setTables(res.data);
    } catch (error) {
      toast.error('Failed to fetch tables');
    }
  };

  useEffect(() => {
    fetchTables();

    if (!user?.upiId) {
      setAlert('Please add UPI ID in Account settings to generate QR codes.');
    } else {
      setAlert('');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tableNo || isNaN(tableNo) || tableNo <= 0) {
      toast.error('Please enter a valid table number');
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/tables/generate-qr`,
        { tableNo: parseInt(tableNo) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      await fetchTables();
      setTableNo('');
      toast.success('QR code generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) return;
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/tables/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      await fetchTables();
      toast.success('QR code deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete QR code');
    }
    setLoading(false);
  };

  const handlePrint = (tableNo, qrCode) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=80mm, initial-scale=1.0">
        <title>Print QR Code</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 80mm; /* 80mm for receipt paper (~300px at 96 DPI) */
            font-family: Arial, sans-serif;
            text-align: center;
            box-sizing: border-box;
          }
          .container {
            width: 80mm;
            height: 130mm; /* Match original height */
            padding: 0;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .top-left {
            position: absolute;
            top: 0;
            left: 0;
            width: 20mm;
            height: 30mm;
          }
          .bottom-left {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 40mm;
            height: 20mm;
          }
          .bottom-right {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20mm;
            height: 30mm;
          }
          .center-image-wrapper {
            position: absolute;
            top: 5mm;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .center-image {
            width: 20mm;
            height: 20mm;
            margin-bottom: 1mm;
          }
          .name {
            font-size: 16px;
            font-weight: bold;
            color: purple;
            margin: 1mm 0;
            word-wrap: break-word;
            max-width: 70mm;
          }
          .table-no {
            font-size: 12px;
            margin: 0; /* Remove extra vertical space */
            padding: 0;
            word-wrap: break-word;
            max-width: 70mm;
            text-align: center; /* Optional: center-align text if needed */
          }

          .qrcode {
            position: relative; 
            margin-top: 0mm;    
            width: 65mm;
            height: 65mm;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }

          .features {
            position: absolute;
            top: 95mm;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            width: max-content;
            max-width: 70mm;
          }
          .features h3 {
            font-size: 12px;
            margin: 2mm 0;
            font-family: sans-serif;
          }
          .features ul {
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 10px;
            color: rgb(21, 131, 196);
            text-align: left;
            display: inline-block;
          }
          .features li {
            margin: 1mm 0;
          }
          @media print {
            body, html {
              margin: 0;
              padding: 0;
              width: 80mm;
              height: 130mm;
              overflow: hidden;
            }
            @page {
              margin: 0;
              size: 80mm 130mm;
            }
            .container {
              margin: 0;
              padding: 0;
              width: 80mm;
              height: 130mm;
              background-color: transparent;
              border: none;
            }
            body > *:not(.container) {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${s1}" alt="Top Left Image" class="top-left">
          <img src="${s3}" alt="Bottom Left Image" class="bottom-left">
          <img src="${s2}" alt="Bottom Right Image" class="bottom-right">
          <div class="center-image-wrapper">
            <img src="${user.profilePicture || ''}" alt="Center Image" class="center-image">
            <div class="name">${user.restaurantName || 'Apex Restaurant'}</div>
            <div class="table-no">Table ${tableNo}</div>
            <img src="${qrCode}" alt="QR" class="qrcode">
          </div>
          
          <div class="features">
            <h3>One QR for All</h3>
            <ul>
              <li>View Menu</li>
              <li>Make Payment</li>
              <li>Leave a Google Review</li>
              <li>Share Your Opinion</li>
            </ul>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="qrcode-container">
      <Sidebar />
      <div className="qrcode-content">
        {loading && <LoadingSpinner />}
        <h2>Generate QR Codes</h2>
        {alert && <p class="alert">{alert}</p>}
        <form onSubmit={handleSubmit} className="qrcode-form">
          <input
            type="number"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
            placeholder="Table Number"
            disabled={!!alert}
            required
          />
          <button type="submit" disabled={!!alert}>
            Generate QR
          </button>
        </form>
        <div className="qr-list">
          {tables.map((table) => (
            <div key={table.id} className="qr-item">
              <p>Table {table.tableNo}</p>
              <img src={table.qrCode} alt={`QR for Table ${table.tableNo}`} />
              <div className="qr-actions">
                <button
                  onClick={() => handlePrint(table.tableNo, table.qrCode)}
                  style={{ backgroundColor: '#28a745', color: 'white', marginRight: '5px' }}
                >
                  Print
                </button>
                <button
                  onClick={() => handleDelete(table.id)}
                  style={{ backgroundColor: '#ff4444', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <footer className="page-footer">
          Powered by SAE. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default QRCode;