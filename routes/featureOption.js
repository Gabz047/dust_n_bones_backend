import express from 'express';
import FeatureOptionController from '../controllers/FeatureOptionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, featureOptionSchema } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas protegidas para usuários (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(featureOptionSchema.create), authorizeRoles('admin', 'owner'), FeatureOptionController.create);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), FeatureOptionController.getAll);

router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), FeatureOptionController.getById);

router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(featureOptionSchema.update), FeatureOptionController.update);

router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), FeatureOptionController.delete);

export default router;
