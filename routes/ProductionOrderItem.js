import express from 'express';
import ProductionOrderItemController from '../controllers/ProductionOrderItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, productionOrderItemSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar item da OP
router.post(
  '/',
  authenticateToken,
  validateRequest(productionOrderItemSchemas.create),
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.create
);

router.post(
  '/batch',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.createBatch
);
router.put('/batch/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ProductionOrderItemController.updateBatch);


router.delete('/batch/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), ProductionOrderItemController.deleteBatch);


// Buscar todos os itens da OP
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getAll
);

// Buscar itens por OP
router.get(
  '/order/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getByProductionOrder
);

router.get(
  '/order-item/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getByOrderItem
);

// Buscar itens por projeto
router.get(
  '/project/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getByProject
);

// Buscar itens por item
router.get(
  '/item/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getByItem
);

// Buscar itens por feature
router.get(
  '/feature/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getByFeature
);

// Buscar item por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.getById
);

// Atualizar item da OP
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(productionOrderItemSchemas.update),
  ProductionOrderItemController.update
);

// Deletar item da OP
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderItemController.delete
);

export default router;
