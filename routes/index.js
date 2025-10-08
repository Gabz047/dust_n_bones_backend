import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { resolveEntityContext } from '../middleware/userContext.js';
import { validateRequest, signupSchema } from '../middleware/validation.js';

import SignupController from '../controllers/SignupController.js';

import accountRoutes from './accounts.js';
import companyRoutes from './companies.js';
import companySettingsRoutes from './company-settings.js';
import companyCustomizationRoutes from './company-customizations.js';
import tenantRoutes from './tenants.js';
import userRoutes from './users.js';
import branchRoutes from './branch.js';
import customerRoutes from './customer.js';
import customerGroupRoutes from './customer-group.js';
import userBranchRoutes from './userBranch.js';
import itemRoutes from './item.js';
import FeatureRoutes from './feature.js';
import packageRoutes from './package.js';
import itemFeatureRoutes from './itemFeature.js';
import featureOptionRoutes from './featureOption.js';
import projectRoutes from './project.js';
import orderRoutes from './order.js';
import orderItemRoutes from './orderItem.js';
import ItemFeatureOptionRoutes from './itemFeatureOption.js';
import StatusRoutes from './status.js';
import ProjectItemRoutes from './projectItem.js';
import ProductionOrderRoutes from './productionOrder.js';
import ProductionOrderItemRoutes from './ProductionOrderItem.js';
import ProductionOrderStatusRoutes from './productionOrderStatus.js';
import OrderItemAdditionalFeatureOptionRoutes from './OrderItemAdditionalFeatureOption.js';
import MovementRoutes from './Movement.js';
import StockRoutes from './stock.js';
import MovementItemRoutes from './MovementItem.js';
import ProductionOrderItemAdditionalFeatureOptionRoutes from './productionOrderItemAdditionalFeatureOption.js';
import BoxRoutes from './box.js';
import BoxItemRoutes from './box-item.js';
import DeliveryNoteRoutes from './delivery-note.js';
import DeliveryNoteItemRoutes from './delivery-note-item.js';
import ExpeditionRoutes from './expedition.js';
import InvoiceRoutes from './invoice.js';
import InvoiceItemRoutes from './invoice-item.js';
import MovementLogEntityRoutes from './movement-log-entity.js';
import movementLogEntityItemRoutes from './movement-log-entity-item.js';

const router = express.Router();

// Rota de teste da API (pública)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Estoquelogia funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Signup não precisa de autenticação
router.post('/signup', validateRequest(signupSchema), SignupController.signup);

// Sub-routers que precisam de autenticação + resolveEntityContext
const protectedRouters = {
  '/accounts': accountRoutes,
  '/companies': companyRoutes,
  '/company-settings': companySettingsRoutes,
  '/company-customizations': companyCustomizationRoutes,
  '/tenants': tenantRoutes,
  '/users': userRoutes,
  '/branches': branchRoutes,
  '/userBranches': userBranchRoutes,
  '/customers': customerRoutes,
  '/customers_group': customerGroupRoutes,
  '/items': itemRoutes,
  '/item-features': itemFeatureRoutes,
  '/features': FeatureRoutes,
  '/packages': packageRoutes,
  '/projects': projectRoutes,
  '/orders': orderRoutes,
  '/order-items': orderItemRoutes,
  '/item-feature-options': ItemFeatureOptionRoutes,
  '/status': StatusRoutes,
  '/project-items': ProjectItemRoutes,
  '/production-orders': ProductionOrderRoutes,
  '/production-order-items': ProductionOrderItemRoutes,
  '/production-order-status': ProductionOrderStatusRoutes,
  '/order-item-additional-feature-options': OrderItemAdditionalFeatureOptionRoutes,
  '/movements': MovementRoutes,
  '/movement-itens': MovementItemRoutes,
  '/stocks': StockRoutes,
  '/production-order-item-additional-feature-options': ProductionOrderItemAdditionalFeatureOptionRoutes,
  '/boxes': BoxRoutes,
  '/box-items': BoxItemRoutes,
  '/delivery-notes': DeliveryNoteRoutes,
  '/delivery-note-items': DeliveryNoteItemRoutes,
  '/expeditions': ExpeditionRoutes,
  '/invoices': InvoiceRoutes,
  '/invoice-items': InvoiceItemRoutes,
  '/movement-log-entities': MovementLogEntityRoutes,
  '/movement-log-entity-items': movementLogEntityItemRoutes,
};

// Aplica autenticação + resolveEntityContext a todos os sub-routers protegidos
for (const [path, subRouter] of Object.entries(protectedRouters)) {
  router.use(path, authenticateToken, resolveEntityContext, subRouter);
}

export default router;
