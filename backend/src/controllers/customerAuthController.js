const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');

function createToken(customer) {
  return jwt.sign(
    { id: customer._id, email: customer.email, name: customer.name, phone: customer.phone, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicCustomer(customer) {
  return {
    id: customer._id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    defaultAddress: customer.defaultAddress,
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'Name, email, password and phone are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  const existing = await Customer.findOne({ $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] });
  if (existing) return res.status(409).json({ success: false, message: 'An account already exists for that email or phone' });

  const customer = await Customer.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    defaultAddress: address?.trim() || null,
    addresses: address?.trim() ? [address.trim()] : [],
    passwordHash: await bcrypt.hash(password, 10),
  });

  res.status(201).json({ success: true, data: { token: createToken(customer), customer: publicCustomer(customer) } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
  if (!customer || !customer.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
    return res.status(401).json({ success: false, message: 'Invalid customer credentials' });
  }

  res.json({ success: true, data: { token: createToken(customer), customer: publicCustomer(customer) } });
});

module.exports = { register, login, publicCustomer };
