const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop all indexes on users collection except _id
    console.log('🔧 Fixing User collection indexes...');
    
    const collection = db.collection('users');
    const indexes = await collection.indexes();
    
    console.log('Current indexes:', indexes.map(i => i.name));
    
    // Drop all indexes except _id
    for (const index of indexes) {
      if (index.name !== '_id_') {
        console.log(`  Dropping index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
    
    console.log('✅ Old indexes dropped');
    
    // The correct indexes will be created automatically when the server starts
    console.log('✅ Indexes will be recreated on server start');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixIndexes();
