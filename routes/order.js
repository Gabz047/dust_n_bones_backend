import express from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, orderSchema } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(orderSchema.create), authorizeRoles('admin', 'owner'), OrderController.create);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderController.getAll);

router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderController.getById);

router.get('/project/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderController.getOrderByProject);

router.get('/customer/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderController.getOrderByCustomer);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(orderSchema.update), OrderController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderController.delete);

export default router;
