import express from 'express';
import CustomerGroupController from '../controllers/CustomerGroupController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';
import { validateRequest, customerGroupSchemas } from '../middleware/validation.js'; 

const router = express.Router();

// Criar grupo
router.post(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(customerGroupSchemas.create.body),
  CustomerGroupController.create
);

// Buscar todos os grupos com seus clientes
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  CustomerGroupController.getAll
);

// Atualizar os clientes comuns de um grupo
router.put(
  '/:id/customers',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(customerGroupSchemas.updateCustomers),
  CustomerGroupController.updateGroupCustomers
);

// Atualizar o cliente principal de um grupo
router.put(
  '/:id/main-customer',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  validateRequest(customerGroupSchemas.updateMainCustomer),
  CustomerGroupController.updateGroupMainCustomer
);

// Deletar grupo
router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  CustomerGroupController.delete
);

export default router;
