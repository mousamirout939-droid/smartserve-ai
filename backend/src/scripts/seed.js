require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const MenuItem = require('../models/MenuItem');
const Faq = require('../models/Faq');
const Admin = require('../models/Admin');
const Category = require('../models/Category');

const dnsServers = (process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

const categories = ['Burger', 'Chicken', 'Beverages', 'Desserts', 'Sides'];

const menuItems = [
  {
    itemCode: 'M001',
    name: 'Chicken Burger',
    category: 'Burger',
    description: 'Crispy chicken burger with lettuce, mayo and pickles.',
    price: 149,
    ingredients: ['Chicken patty', 'Bun', 'Lettuce', 'Mayo', 'Pickles'],
    tags: ['bestseller'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
  },
  {
    itemCode: 'M002',
    name: 'Veg Burger',
    category: 'Burger',
    description: 'Grilled veggie patty burger with fresh vegetables.',
    price: 119,
    ingredients: ['Veg patty', 'Bun', 'Lettuce', 'Tomato', 'Mayo'],
    tags: ['vegetarian'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=600',
  },
  {
    itemCode: 'M003',
    name: 'Spicy Chicken Burger',
    category: 'Burger',
    description: 'Crispy chicken with spicy sauce and jalapenos.',
    price: 169,
    ingredients: ['Spicy chicken patty', 'Bun', 'Jalapenos', 'Spicy mayo'],
    tags: ['spicy', 'bestseller'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600',
  },
  {
    itemCode: 'M004',
    name: 'Chicken Wings (6 pcs)',
    category: 'Chicken',
    description: 'Fried chicken wings tossed in your choice of sauce.',
    price: 199,
    ingredients: ['Chicken wings', 'Choice of sauce'],
    tags: ['spicy'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=600',
    customizationOptions: [{ name: 'Sauce', options: ['BBQ', 'Buffalo Hot', 'Honey Garlic'] }],
  },
  {
    itemCode: 'M005',
    name: 'Grilled Chicken Bowl',
    category: 'Chicken',
    description: 'Grilled chicken breast over rice with vegetables.',
    price: 189,
    ingredients: ['Grilled chicken', 'Rice', 'Mixed vegetables'],
    tags: ['healthy'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1598515214146-dab39da1243d?w=600',
  },
  {
    itemCode: 'M006',
    name: 'Pepsi (500ml)',
    category: 'Beverages',
    description: 'Chilled Pepsi.',
    price: 60,
    ingredients: [],
    tags: [],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600',
  },
  {
    itemCode: 'M007',
    name: 'Fresh Lemonade',
    category: 'Beverages',
    description: 'Freshly squeezed lemonade.',
    price: 79,
    ingredients: ['Lemon', 'Sugar', 'Mint'],
    tags: ['refreshing'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600',
  },
  {
    itemCode: 'M008',
    name: 'French Fries',
    category: 'Sides',
    description: 'Crispy golden fries, salted.',
    price: 89,
    ingredients: ['Potato', 'Salt'],
    tags: ['vegetarian', 'bestseller'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600',
  },
  {
    itemCode: 'M009',
    name: 'Chocolate Brownie',
    category: 'Desserts',
    description: 'Warm fudge brownie with a gooey center.',
    price: 99,
    ingredients: ['Chocolate', 'Flour', 'Butter'],
    tags: ['dessert'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600',
  },
  {
    itemCode: 'M010',
    name: 'Vanilla Milkshake',
    category: 'Desserts',
    description: 'Creamy vanilla milkshake topped with whipped cream.',
    price: 129,
    ingredients: ['Milk', 'Vanilla ice cream', 'Whipped cream'],
    tags: ['dessert'],
    available: true,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600',
  },
];

const faqs = [
  {
    question: 'What are your opening hours?',
    answer: 'We are open every day from 11:00 AM to 11:00 PM.',
    category: 'hours',
  },
  {
    question: 'Do you deliver?',
    answer: 'Yes, we deliver within a 7 km radius of our restaurant. Delivery usually takes 30-45 minutes.',
    category: 'delivery',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Cash on Delivery, Pay on Pickup, and online payment via Razorpay (card/UPI/wallet).',
    category: 'payment',
  },
  {
    question: 'What is your refund policy?',
    answer:
      'If there is an issue with your order (wrong item, quality issue), contact us within 24 hours with your order ID and we will arrange a refund or replacement.',
    category: 'refund',
  },
  {
    question: 'Which areas do you deliver to?',
    answer: 'We currently deliver across the city center and surrounding neighborhoods within 7 km.',
    category: 'delivery',
  },
  {
    question: 'Can I pick up my order myself?',
    answer: 'Yes! Choose "Pickup" when ordering and we will have it ready at our counter within 15-20 minutes.',
    category: 'pickup',
  },
];

async function seed() {
  await connectDB();

  for (const cat of categories) {
    await Category.findOneAndUpdate({ name: cat }, { name: cat }, { upsert: true });
  }
  console.log(`Seeded ${categories.length} categories.`);

  for (const item of menuItems) {
    await MenuItem.findOneAndUpdate({ itemCode: item.itemCode }, item, { upsert: true, new: true });
  }
  console.log(`Seeded ${menuItems.length} menu items.`);

  for (const faq of faqs) {
    const exists = await Faq.findOne({ question: faq.question });
    if (!exists) await Faq.create(faq);
  }
  console.log(`Seeded ${faqs.length} FAQs.`);

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@smartserve.ai').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await Admin.create({ name: 'Restaurant Admin', email: adminEmail, passwordHash, role: 'SUPER_ADMIN' });
    console.log(`Created admin user: ${adminEmail} (password from .env ADMIN_PASSWORD)`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  console.log('Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
