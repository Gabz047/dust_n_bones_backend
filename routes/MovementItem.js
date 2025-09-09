import express from 'express';
import MovementItemController from '../controllers/MovementItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar item de movimentação (com quantidade e additionalFeatures)
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementItemController.create
);

// Bulk create
router.post(
  '/bulk',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementItemController.bulkCreate
);

// Listar todos os itens de movimentação
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementItemController.getAll
);

// Buscar item de movimentação por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementItemController.getById
);

// Buscar itens de movimentação por Movement pai
router.get(
  '/movement/:movementId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  MovementItemController.getByMovement
);

export default router;
