import express from 'express';
import ItemFeatureController from '../controllers/ItemFeatureController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, itemFeatureSchema } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(itemFeatureSchema.create), authorizeRoles('admin', 'owner'), ItemFeatureController.create);

router.get('/item/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ItemFeatureController.getByItemId);

router.get('/item-ids', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ItemFeatureController.getByItemIds);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ItemFeatureController.getAll);

router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ItemFeatureController.getById);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(itemFeatureSchema.update), ItemFeatureController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ItemFeatureController.delete);

export default router;
