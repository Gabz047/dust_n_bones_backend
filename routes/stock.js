// routes/StockRouter.js
import express from 'express';
import StockController from '../controllers/StockController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { extractTenant, validateTenantAccess } from '../middleware/tenant.js';

const router = express.Router();

// Listar todos os estoques (com filtros opcionais)
router.get(
  '/',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  StockController.getAll
);

router.get('/stock-item/:id', authenticateToken, extractTenant, authorizeRoles('admin', 'owner'), StockController.getStockItemById);


// Buscar estoque por ID
router.get(
  '/:id',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  StockController.getById
);

// Buscar estoque por Item + ItemFeature + FeatureOption
router.get(
  '/item-feature-option/:itemId/:itemFeatureId/:featureOptionId',
  authenticateToken,
  extractTenant,
  validateTenantAccess,
  authorizeRoles('admin', 'owner'),
  StockController.getByItemFeatureOption
);

export default router;
