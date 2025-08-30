const QRCode = require('qrcode');
const Table = require('../models/Table');
const User = require('../models/User');

exports.generateQR = async (req, res) => {
  console.log('Generating QR...');
  const { tableNo } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user.upiId || !user.googleReviewLink) {
      return res.status(400).json({ message: 'Please add UPI ID and Google Review Link in account settings' });
    }

    // Check if table already exists
    const existingTable = await Table.findOne({ where: { tableNo, userId: req.user.id } });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    // Generate QR code linking to client frontend
    const qrData = `${process.env.CLIENT_URL}/?table=${tableNo}&restaurant=${req.user.id}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const table = await Table.create({
      tableNo,
      qrCode,
      userId: req.user.id,
    });

    res.json(table);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ where: { userId: req.user.id } });
    res.json(tables);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTable = async (req, res) => {
  const { id } = req.params;
  try {
    const table = await Table.findOne({ where: { id, userId: req.user.id } });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    await table.destroy();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ message: 'Server error' });
  }
};