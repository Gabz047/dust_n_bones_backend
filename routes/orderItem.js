import express from 'express';
import OrderItemController from '../controllers/OrderItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, orderItemSchema } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(orderItemSchema.create), authorizeRoles('admin', 'owner'), OrderItemController.create);

router.post(
  '/batch',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  OrderItemController.createBatch
);


router.put('/batch/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.updateBatch);
5

router.delete('/batch/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.deleteBatch);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.getAll);

router.get('/feature/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.getByFeature);


router.get('/item/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.getByItem);

router.get('/order/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.getByOrder);

router.get('/project/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.getByProject);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(orderItemSchema.update), OrderItemController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), OrderItemController.delete);

export default router;
