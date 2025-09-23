import express from 'express';
import accountRoutes from './accounts.js';
import companyRoutes from './companies.js';
import companySettingsRoutes from './company-settings.js';
import companyCustomizationRoutes from './company-customizations.js';
import tenantRoutes from './tenants.js';
import userRoutes from './users.js';
import branchRoutes from './branch.js'
import customerRoutes from './customer.js'
import customerGroupRoutes from './customer-group.js'
import userBranchRoutes from './userBranch.js'
import SignupController from '../controllers/SignupController.js';
import itemRoutes from './item.js';
import FeatureRoutes from './feature.js';
import { validateRequest, signupSchema } from '../middleware/validation.js';
import packageRoutes from './package.js'
import itemFeatureRoutes from './itemFeature.js';
import featureOptionRoutes from './featureOption.js';
import projectRoutes from './project.js'
import orderRoutes from './order.js';
import orderItemRoutes from './orderItem.js';
import ItemFeatureOptionRoutes from './itemFeatureOption.js'
import StatusRoutes from './status.js'
import ProjectItemRoutes from './projectItem.js'
import ProductionOrderRoutes from './productionOrder.js'
import ProductionOrderItemRoutes from './ProductionOrderItem.js'
import ProductionOrderStatusRoutes from './productionOrderStatus.js'
import OrderItemAdditionalFeatureOptionRoutes from './OrderItemAdditionalFeatureOption.js'
import MovementRoutes from './Movement.js'
import StockRoutes from './stock.js'
import MovementItemRoutes from './MovementItem.js'
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

// Rota de teste da API
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Estoquelogia funcionando!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            signup: '/api/signup',
            accounts: '/api/accounts',
            companies: '/api/companies',
            companySettings: '/api/company-settings',
            companyCustomizations: '/api/company-customizations',
            tenants: '/api/tenants',
            users: '/api/users',
            branches: '/api/branches',
            userBranches: '/api/userBranches',
            customers: '/api/customers',
            customers_group: '/api/customers_group',
            items: '/api/items',
            features: '/api/item-features',
            packages: '/api/packages',
            item_features: '/api/item-features',
            feature_options: '/api/feature-options',
            projects: '/api/projects',
            orders: '/api/orders',
            order_items: '/api/order-items',
            item_feature_options: '/api/item-feature-options',
            status: '/api/status',
            project_item: 'api/project_items',
            production_order: '/api/production_order',
            production_order_item: '/api/production_order_item',
            production_order_status: '/api/production_order_status',
            order_item_additional_feature_options: '/api/order-item-additional-feature-options' ,
            movements: '/api/movements',
            movementItens: '/api/movements-itens',
            stock: '/api/stocks',
            production_order_item_additional_feature_options: '/api/production-order-item-additional-feature-options',
            boxes: '/api/boxes',
            box_items: '/api/box-items',
            delivery_notes: '/api/delivery-notes',
            delivery_note_items: '/api/delivery-note-items',
            expeditions: '/api/expeditions',
            invoices: '/api/invoices',
            invoice_items: '/api/invoice-items',
            movement_log_entities: '/api/movement-log-entities',
            movement_log_entity_items: '/api/movement-log-entity-items'
        }
    });
});

// Rota de signup (criação de conta + empresa)
router.post('/signup', validateRequest(signupSchema), SignupController.signup);

// Rotas dos módulos
router.use('/movement-log-entities', MovementLogEntityRoutes)
router.use('/movement-log-entity-items', movementLogEntityItemRoutes)
router.use('/invoices', InvoiceRoutes)
router.use('/invoice-items', InvoiceItemRoutes)
router.use('/expeditions', ExpeditionRoutes)
router.use('/delivery-notes', DeliveryNoteRoutes)
router.use('/delivery-note-items', DeliveryNoteItemRoutes)
router.use('/boxes', BoxRoutes)
router.use('/box-items', BoxItemRoutes)
router.use('/production-order-item-additional-feature-options', ProductionOrderItemAdditionalFeatureOptionRoutes)
router.use('/stocks', StockRoutes)
router.use('/movements', MovementRoutes)
router.use('/movement-itens', MovementItemRoutes)
router.use('/order-item-additional-feature-options', OrderItemAdditionalFeatureOptionRoutes)
router.use('/production-order-status', ProductionOrderStatusRoutes)
router.use('/production-orders', ProductionOrderRoutes)
router.use('/production-order-items', ProductionOrderItemRoutes)
router.use('/project-items', ProjectItemRoutes)
router.use('/status', StatusRoutes)
router.use('/item-feature-options', ItemFeatureOptionRoutes)
router.use('/projects', projectRoutes);
router.use('/orders', orderRoutes);
router.use('/order-items', orderItemRoutes);
router.use('/item-features', itemFeatureRoutes);
router.use('/feature-options', featureOptionRoutes);
router.use('/items', itemRoutes);
router.use('/features', FeatureRoutes);
router.use('/customers', customerRoutes)
router.use('/customers_group', customerGroupRoutes)
router.use('/userBranches', userBranchRoutes)
router.use('/branches', branchRoutes)
router.use('/accounts', accountRoutes);
router.use('/companies', companyRoutes);
router.use('/company-settings', companySettingsRoutes);
router.use('/company-customizations', companyCustomizationRoutes);
router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/packages', packageRoutes)

export default router;