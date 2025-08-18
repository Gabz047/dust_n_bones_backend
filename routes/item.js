import express from 'express';
import ItemController from '../controllers/ItemController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, itemSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';


const router = express.Router();

// Criar item
router.post(
  '/',
  authenticateToken,
  validateRequest(itemSchemas.create),
  ItemController.create
);

// Listar todos os itens
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemController.getAll
);

// Buscar item por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  ItemController.getById
);

// Atualizar item
router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'owner'),
  validateRequest(itemSchemas.update),
  ItemController.update
);

// Deletar item
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  ItemController.delete
);

export default router;
