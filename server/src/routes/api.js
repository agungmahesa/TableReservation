const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const tableController = require('../controllers/tableController');
const authController = require('../controllers/authController');
const configController = require('../controllers/configController');
const uploadController = require('../controllers/uploadController');

// Public Routes
router.post('/auth/login', authController.login);
router.get('/availability', reservationController.checkAvailability);
router.post('/reservations', reservationController.createReservation);
router.get('/reservations/:id', reservationController.getReservation);
router.get('/settings', configController.getSettings);
router.get('/menu', configController.getMenu);
router.get('/health', configController.healthCheck);

// Admin Routes (Simplified Auth for now)
router.get('/admin/reservations', reservationController.getAllReservations);
router.post('/admin/reservations', reservationController.createReservation); // Admin can use existing create logic
router.patch('/admin/reservations/status/:id', reservationController.updateReservationStatus);
router.patch('/admin/reservations/deposit/:id', reservationController.updateDepositStatus);
router.patch('/admin/reservations/:id', reservationController.updateReservation);
router.delete('/admin/reservations/:id', reservationController.deleteReservation);

router.get('/admin/tables', tableController.getAllTables);
router.post('/admin/tables', tableController.addTable);
router.patch('/admin/tables/:id', tableController.updateTable);
router.delete('/admin/tables/:id', tableController.deleteTable);

router.post('/admin/settings', configController.updateSettings);
router.post('/admin/upload', uploadController.uploadImage);
router.get('/admin/db-init', configController.initializeDatabase);
router.get('/admin/menu', configController.getAllMenuAdmin);
router.post('/admin/menu', configController.addMenuItem);
router.patch('/admin/menu/:id', configController.updateMenuItem);
router.delete('/admin/menu/:id', configController.deleteMenuItem);

module.exports = router;
