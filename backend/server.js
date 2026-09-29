require('dotenv').config();
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const dnsServers = (process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const webhookRoutes = require('./src/routes/webhookRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const faqRoutes = require('./src/routes/faqRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const authRoutes = require('./src/routes/authRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const n8nRoutes = require('./src/routes/n8nRoutes');
const customerAuthRoutes = require('./src/routes/customerAuthRoutes');
const customerPortalRoutes = require('./src/routes/customerPortalRoutes');

const app = express();

app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// WhatsApp sends JSON; keep a generous body limit for base64 media edge cases
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic rate limiting on public webhook + API
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({ service: 'SmartServe AI Backend', status: 'running' });
});

app.use('/api/webhook/whatsapp', webhookRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/customer-auth', customerAuthRoutes);
app.use('/api/customer', customerPortalRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`SmartServe AI backend listening on port ${PORT}`);
  });
});

module.exports = app;
