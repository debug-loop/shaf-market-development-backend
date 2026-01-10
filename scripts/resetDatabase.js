const mongoose = require('mongoose');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    console.log('⚠️  WARNING: This will DELETE ALL DATA!');
    console.log('🗑️  Dropping all collections...');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      console.log(`  Dropping: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log('✅ All collections dropped');
    console.log('✅ Database reset complete');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run seed:all');
    console.log('  2. Start server: npm run dev');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetDatabase();
