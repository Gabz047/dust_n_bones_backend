import express from 'express';
import ProductionOrderController from '../controllers/ProductionOrderController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, productionOrderSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar OP
router.post(
  '/',
  authenticateToken,
  validateRequest(productionOrderSchemas.create),
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.create
);


// Buscar todas OPs
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getAll
);

router.get(
  '/open',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getOpenOrders
);


// Buscar OP por projeto
router.get(
  '/project/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getByProject
);

// Buscar OP por fornecedor
router.get(
  '/supplier/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getBySupplier
);

// Buscar OP por cliente principal
router.get(
  '/customer/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getByCustomer
);

// Buscar OP por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.getById
);

// Atualizar OP
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(productionOrderSchemas.update),
  ProductionOrderController.update
);

router.patch('/id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.patch
)

// Deletar OP
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ProductionOrderController.delete
);

export default router;
