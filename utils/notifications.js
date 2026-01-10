const notificationController = require('../controllers/notificationController');

const createNotification = async (userId, type, title, message, link = null, metadata = null) => {
  await notificationController.createNotification(userId, type, title, message, link, metadata);
};

module.exports = { createNotification };
