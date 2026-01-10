const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
let adminToken = '';

console.log('🧪 Complete API Test Suite\n');

const testHealth = async () => {
  try {
    const res = await axios.get(`${API_URL}/health`);
    console.log('✅ 1. Health Check:', res.data.message);
    return true;
  } catch (error) {
    console.log('❌ 1. Health Check Failed:', error.message);
    return false;
  }
};

const testAdminLogin = async () => {
  try {
    const res = await axios.post(`${API_URL}/admin/login`, {
      email: 'admin@shahmarket.com',
      password: 'Admin@123456'
    });
    if (res.data.success && res.data.data.token) {
      adminToken = res.data.data.token;
      console.log('✅ 2. Admin Login: Success');
      return true;
    }
  } catch (error) {
    console.log('❌ 2. Admin Login Failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testCategories = async () => {
  try {
    const res = await axios.get(`${API_URL}/categories`);
    console.log(`✅ 3. Categories: ${res.data.data.categories.length} categories found`);
    return true;
  } catch (error) {
    console.log('❌ 3. Categories Failed:', error.message);
    return false;
  }
};

const runTests = async () => {
  const results = [];
  results.push(await testHealth());
  results.push(await testAdminLogin());
  results.push(await testCategories());

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  process.exit(passed === total ? 0 : 1);
};

axios.get(`${API_URL}/health`)
  .then(() => runTests())
  .catch(() => {
    console.log('❌ Server is not running!\nPlease start: npm run dev\n');
    process.exit(1);
  });
