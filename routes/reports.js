import express from 'express';
import OrderReportController from '../controllers/ReportController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Buscar todos
router.get('/order/:orderId', authenticateToken, authorizeRoles('owner', 'admin'), OrderReportController.getReportData);
router.get('/project/:projectId', authenticateToken, authorizeRoles('owner', 'admin'), OrderReportController.getProjectReportData);

export default router;
