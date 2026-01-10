const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('../models/Category');

const categories = [
  { name: 'Digital Marketing', icon: '📢', description: 'SEO, Social Media, Content Marketing' },
  { name: 'Graphics & Design', icon: '🎨', description: 'Logo Design, Branding, Illustrations' },
  { name: 'Writing & Translation', icon: '✍️', description: 'Content Writing, Copywriting, Translation' },
  { name: 'Video & Animation', icon: '🎥', description: 'Video Editing, Animation, Motion Graphics' },
  { name: 'Music & Audio', icon: '🎵', description: 'Voice Over, Music Production, Audio Editing' },
  { name: 'Programming & Tech', icon: '💻', description: 'Web Development, Mobile Apps, Software' },
  { name: 'Data', icon: '📊', description: 'Data Entry, Analysis, Database Management' },
  { name: 'Business', icon: '💼', description: 'Virtual Assistant, Business Plans, Consulting' },
  { name: 'Lifestyle', icon: '🌟', description: 'Gaming, Fitness, Travel Planning' },
  { name: 'AI Services', icon: '🤖', description: 'ChatGPT, AI Art, Machine Learning' }
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Category.deleteMany({});
    await Category.insertMany(categories);

    console.log(`✅ ${categories.length} categories seeded successfully`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedCategories();
