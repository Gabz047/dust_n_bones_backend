import express from 'express';
import InvoiceController from '../controllers/InvoiceController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, invoiceSchemas } from '../middleware/validation.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Criar fatura
router.post(
  '/',
  authenticateToken,
  validateRequest(invoiceSchemas.create),
  InvoiceController.create
);

// Atualizar fatura
router.put(
  '/:id',
  authenticateToken,
  validateRequest(invoiceSchemas.update),
  InvoiceController.update
);

// Deletar fatura
router.delete(
  '/:id',
  authenticateToken,
  validateRequest(invoiceSchemas.delete),
  InvoiceController.delete
);

router.get('/:id/pdf', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), InvoiceController.generatePDF);

// Listar todas as faturas
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  InvoiceController.getAll
);

// Buscar fatura por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceController.getById
);

// Buscar faturas por projeto
router.get(
  '/project/:projectId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceController.getByProject
);

// Buscar faturas por tipo
router.get(
  '/type/:type',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'manager', 'employee', 'owner'),
  InvoiceController.getByType
);

export default router;
