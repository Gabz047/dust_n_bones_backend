import express from 'express';
import AccountController from '../controllers/AccountController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateRequest, accountSchemas } from '../middleware/validation.js';
import { extractTenant, optionalTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Rotas públicas
router.post('/register', validateRequest(accountSchemas.create), AccountController.create);
router.post('/login', validateRequest(accountSchemas.login), AccountController.login);

// Rotas protegidas com tenant opcional
router.get('/profile', authenticateToken, optionalTenant, AccountController.profile);
router.put('/profile', authenticateToken, optionalTenant, validateRequest(accountSchemas.update), AccountController.update);

// Rotas administrativas com tenant obrigatório
router.get('/', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), AccountController.getAll);
router.get('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), AccountController.getById);
router.put('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin', 'owner'), validateRequest(accountSchemas.update), AccountController.update);
router.delete('/:id', authenticateToken, extractTenant, validateTenantAccess, authorizeRoles('admin'), AccountController.delete);

export default router;