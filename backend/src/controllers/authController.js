const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const Admin = require('../models/Admin');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const valid = await admin.comparePassword(password);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role, name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    data: { token, admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.admin });
});

module.exports = { login, me };
