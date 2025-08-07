// routes/customer.js

import express from 'express';
import CustomerController from '../controllers/CustomerController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';
import { validateRequest, customerSchemas } from '../middleware/validation.js'; 

const router = express.Router();

// Rotas protegidas para usuários autenticados (sem tenant obrigatório)
router.post('/', authenticateToken, validateRequest(customerSchemas.create), CustomerController.create);

// Rotas administrativas com tenant obrigatório
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin'),
  CustomerController.getAll
);

router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin'),
  CustomerController.getById
);

router.put(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin'),
  validateRequest(customerSchemas.update),
  CustomerController.update
);

router.delete(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin'),
  CustomerController.delete
);

export default router;
