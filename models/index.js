import sequelize from '../config/database.js';
import Account from './Account.js';
import AuthProvider from './AuthProvider.js';
import Company from './Company.js';
import CompanySettings from './CompanySettings.js';
import CompanyCustomize from './CompanyCustomize.js';
import User from './User.js';
import Branch from './Branch.js';
import UserBranch from './UserBranch.js';
import Customer from './Customer.js';
import CustomerGroup from './CustomerGroup.js';
import Item from './Item.js';
import Feature from './Features.js';
import Package from './Package.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Project from './Project.js';
import ItemFeatureOption from './ItemFeatureOption.js';
import Status from './Status.js';
import ProjectItem from './ProjectItem.js';
import ProductionOrder from './ProductionOrder.js';
import ProductionOrderItem from './ProductionOrderItem.js';
import ProductionOrderStatus from './ProductionOrderStatus.js';
import OrderItemAdditionalFeatureOption from './OrderItemAdditionalFeatureOption.js';
import Movement from './Movement.js';
import MovementItem from './MovementItem.js';
import Stock from './Stock.js';
import StockItem from './StockItem.js';
import StockAdditionalItem from './StockAdditionalItem.js';
import ProductionOrderItemAdditionalFeatureOption from './ProductionOrderItemAdditionalFeatureOption.js';
import Box from './expedition/Box.js';
import BoxItem from './expedition/BoxItem.js';
import DeliveryNote from './expedition/DeliveryNote.js';
import DeliveryNoteItem from './expedition/DeliveryNoteItem.js';
import Expedition from './expedition/Expedition.js';
import Invoice from './expedition/Invoice.js';
import InvoiceItem from './expedition/InvoiceItem.js';
import MovementLogEntity from './expedition/MovementLogEntity.js';
import MovementLogEntityItem from './expedition/MovementLogEntityItem.js';

// ---------------------- ACCOUNT & AUTH ----------------------
Account.hasMany(AuthProvider, { foreignKey: 'accountId', as: 'authProviders' });
AuthProvider.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Account.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Account, { foreignKey: 'companyId', as: 'accounts' });
Company.belongsTo(Account, { foreignKey: 'ownerId', as: 'owner' });

// ---------------------- COMPANY SETTINGS & CUSTOMIZE ----------------------
Company.hasOne(CompanySettings, { foreignKey: 'companyId', as: 'settings' });
CompanySettings.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasOne(CompanyCustomize, { foreignKey: 'companyId', as: 'customization' });
CompanyCustomize.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// ---------------------- BRANCH & USER ----------------------
Branch.hasMany(User, { foreignKey: 'branchId', as: 'directUsers' });
User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Company.hasMany(Branch, { foreignKey: 'companyId', as: 'branches' });
Branch.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.belongsToMany(Branch, { through: UserBranch, foreignKey: 'userId', otherKey: 'branchId', as: 'assignedBranches' });
Branch.belongsToMany(User, { through: UserBranch, foreignKey: 'branchId', otherKey: 'userId', as: 'assignedUsers' });
UserBranch.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserBranch.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
User.hasMany(UserBranch, { foreignKey: 'userId', as: 'userBranches' });
Branch.hasMany(UserBranch, { foreignKey: 'branchId', as: 'userBranches' });

// ---------------------- CUSTOMER & CUSTOMER GROUP ----------------------
Customer.belongsTo(CustomerGroup, { foreignKey: 'customerGroup', as: 'customerGroups' });
CustomerGroup.hasMany(Customer, { foreignKey: 'customerGroup', as: 'customersInGroup' });
CustomerGroup.belongsTo(Customer, { foreignKey: 'mainCustomer', as: 'mainCustomerInGroup' });

// Customer ↔ Company
Customer.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Customer, { foreignKey: 'companyId', as: 'customers' });

// Customer ↔ Branch
Customer.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Branch.hasMany(Customer, { foreignKey: 'branchId', as: 'customers' });

// CustomerGroup ↔ Company
CustomerGroup.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(CustomerGroup, { foreignKey: 'companyId', as: 'customerGroups' });

// CustomerGroup ↔ Branch
CustomerGroup.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Branch.hasMany(CustomerGroup, { foreignKey: 'branchId', as: 'customerGroups' });

// ---------------------- ITEM & FEATURE ----------------------
Item.belongsToMany(Feature, { through: ItemFeature, foreignKey: 'itemId', otherKey: 'featureId', as: 'assignedFeatures' });
Feature.belongsToMany(Item, { through: ItemFeature, foreignKey: 'featureId', otherKey: 'itemId', as: 'assignedItems' });
Feature.hasMany(ItemFeature, { foreignKey: 'featureId', as: 'itemFeatures' });
ItemFeature.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
ItemFeature.belongsTo(Feature, { foreignKey: 'featureId', as: 'feature' });
Item.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Item.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Company.hasMany(Item, { foreignKey: 'companyId', as: 'items' });
Branch.hasMany(Item, { foreignKey: 'branchId', as: 'items' });
// Feature ↔ Company
Feature.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Feature, { foreignKey: 'companyId', as: 'features' });

// Feature ↔ Branch
Feature.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Branch.hasMany(Feature, { foreignKey: 'branchId', as: 'features' });

// Feature ↔ FeatureOption
Feature.hasMany(FeatureOption, { foreignKey: 'featureId', as: 'options' });
FeatureOption.belongsTo(Feature, { foreignKey: 'featureId', as: 'feature' });

// ItemFeature ↔ ItemFeatureOption
ItemFeature.hasMany(ItemFeatureOption, { foreignKey: 'itemFeatureId', as: 'featureOptions' });
ItemFeatureOption.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
FeatureOption.hasMany(ItemFeatureOption, { foreignKey: 'featureOptionId', as: 'itemFeatureOptions' });
ItemFeatureOption.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });

// ---------------------- PROJECT ----------------------
Project.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Project.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Company.hasMany(Project, { foreignKey: 'companyId', as: 'projects' });
Branch.hasMany(Project, { foreignKey: 'branchId', as: 'projects' });
Project.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Project, { foreignKey: 'customerId', as: 'projects' });
Project.belongsToMany(Item, { through: ProjectItem, foreignKey: 'projectId', otherKey: 'itemId', as: 'items' });
Item.belongsToMany(Project, { through: ProjectItem, foreignKey: 'itemId', otherKey: 'projectId', as: 'projects' });
ProjectItem.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Project.hasMany(ProjectItem, { foreignKey: 'projectId', as: 'projectItems' });
Item.hasMany(ProjectItem, { foreignKey: 'itemId', as: 'projectItems' });

// ---------------------- ORDER & ORDERITEM ----------------------
Order.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.hasMany(Order, { foreignKey: 'projectId', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
Order.belongsToMany(Item, { through: OrderItem, foreignKey: 'orderId', otherKey: 'itemId', as: 'items' });
Item.belongsToMany(Order, { through: OrderItem, foreignKey: 'itemId', otherKey: 'orderId', as: 'orders' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Item.hasMany(OrderItem, { foreignKey: 'itemId', as: 'orderItems' });
OrderItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
OrderItem.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
ItemFeature.hasMany(OrderItem, { foreignKey: 'itemFeatureId', as: 'orderItems' });
OrderItem.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });
FeatureOption.hasMany(OrderItem, { foreignKey: 'featureOptionId', as: 'orderItems' });

// ---------------------- STATUS ----------------------
User.hasMany(Status, { foreignKey: 'userId', as: 'statuses' });
Status.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(Status, { foreignKey: 'orderId', as: 'statuses' });
Status.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// ---------------------- PRODUCTION ORDER ----------------------
ProductionOrderItem.belongsTo(ProductionOrder, { as: 'productionOrder', foreignKey: 'productionOrderId' });
ProductionOrderItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });
ProductionOrderItem.belongsTo(ItemFeature, { as: 'itemFeature', foreignKey: 'itemFeatureId' });
ProductionOrderItem.belongsTo(FeatureOption, { as: 'featureOption', foreignKey: 'featureOptionId' });
ProductionOrder.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasOne(ProductionOrder, { as: 'productionOrder', foreignKey: 'projectId' });
ProductionOrder.belongsTo(Customer, { as: 'supplier', foreignKey: 'supplierId' });
ProductionOrder.belongsTo(Customer, { as: 'mainCustomer', foreignKey: 'mainCustomerId' });
ProductionOrder.hasMany(ProductionOrderItem, { as: 'items', foreignKey: 'productionOrderId' });
ProductionOrder.hasMany(ProductionOrderStatus, { as: 'status', foreignKey: 'productionOrderId' });
ProductionOrderStatus.belongsTo(ProductionOrder, { as: 'productionOrder', foreignKey: 'productionOrderId' });

// ---------------------- ORDER ITEM ADDITIONAL FEATURE OPTION ----------------------
OrderItemAdditionalFeatureOption.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(OrderItemAdditionalFeatureOption, { foreignKey: 'orderId', as: 'additionalOptions' });
OrderItemAdditionalFeatureOption.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Item.hasMany(OrderItemAdditionalFeatureOption, { foreignKey: 'itemId', as: 'additionalOptions' });
OrderItemAdditionalFeatureOption.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
ItemFeature.hasMany(OrderItemAdditionalFeatureOption, { foreignKey: 'itemFeatureId', as: 'additionalOptions' });
OrderItemAdditionalFeatureOption.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });
FeatureOption.hasMany(OrderItemAdditionalFeatureOption, { foreignKey: 'featureOptionId', as: 'additionalOptions' });

// ---------------------- MOVEMENT & MOVEMENT ITEM ----------------------
Movement.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Item.hasMany(Movement, { foreignKey: 'itemId', as: 'movements' });

Movement.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });
Account.hasMany(Movement, { foreignKey: 'accountId', as: 'movements' });

Movement.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
ItemFeature.hasMany(Movement, { foreignKey: 'itemFeatureId', as: 'movements' });

Movement.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Movement, { foreignKey: 'userId', as: 'movements' });

Movement.belongsTo(ProductionOrder, { foreignKey: 'productionOrderId', as: 'productionOrder' });
ProductionOrder.hasMany(Movement, { foreignKey: 'productionOrderId', as: 'movements' });

Movement.hasMany(MovementItem, { foreignKey: 'movementId', as: 'items' });
MovementItem.belongsTo(Movement, { foreignKey: 'movementId', as: 'movement' });
MovementItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Item.hasMany(MovementItem, { foreignKey: 'itemId', as: 'movementItems' });
MovementItem.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
ItemFeature.hasMany(MovementItem, { foreignKey: 'itemFeatureId', as: 'movementItems' });
MovementItem.hasMany(StockAdditionalItem, { foreignKey: 'movementItemId', as: 'additionalItems' });

MovementItem.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'movementItems' });

FeatureOption.hasMany(MovementItem, {foreignKey: 'featureOptionId', as: 'featureOptions'})

// ---------------------- STOCK & STOCKITEM ----------------------
Item.hasMany(Stock, { foreignKey: 'itemId', as: 'stocks' });
Stock.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Stock.hasMany(StockItem, { foreignKey: 'stockId', as: 'stockItems' });
StockItem.belongsTo(Stock, { foreignKey: 'stockId', as: 'stock' });
ItemFeature.hasMany(StockItem, { foreignKey: 'itemFeatureId', as: 'stockItems' });
FeatureOption.hasMany(StockItem, { foreignKey: 'featureOptionId', as: 'stockItems' });
StockItem.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
StockItem.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });

StockItem.hasMany(StockAdditionalItem, { foreignKey: 'stockItemId', as: 'additionalItems' });
StockAdditionalItem.belongsTo(StockItem, { foreignKey: 'stockItemId', as: 'stockItem' });
ItemFeature.hasMany(StockAdditionalItem, { foreignKey: 'itemFeatureId', as: 'additionalStockItems' });
FeatureOption.hasMany(StockAdditionalItem, { foreignKey: 'featureOptionId', as: 'additionalStockItems' });
StockAdditionalItem.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
StockAdditionalItem.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });

// ---------------------- PRODUCTION ORDER ITEM ADDITIONAL FEATURE OPTION ----------------------
// ProductionOrder → ProductionOrderItemAdditionalFeatureOption
ProductionOrderItemAdditionalFeatureOption.belongsTo(ProductionOrder, { foreignKey: 'productionOrderId', as: 'productionOrder' });
ProductionOrder.hasMany(ProductionOrderItemAdditionalFeatureOption, { foreignKey: 'productionOrderId', as: 'additionalOptionsByOrder' });

// Item → ProductionOrderItemAdditionalFeatureOption
ProductionOrderItemAdditionalFeatureOption.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Item.hasMany(ProductionOrderItemAdditionalFeatureOption, { foreignKey: 'itemId', as: 'additionalOptionsByItem' });

// ItemFeature → ProductionOrderItemAdditionalFeatureOption
ProductionOrderItemAdditionalFeatureOption.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });
ItemFeature.hasMany(ProductionOrderItemAdditionalFeatureOption, { foreignKey: 'itemFeatureId', as: 'additionalOptionsByFeature' });

// FeatureOption → ProductionOrderItemAdditionalFeatureOption
ProductionOrderItemAdditionalFeatureOption.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });
FeatureOption.hasMany(ProductionOrderItemAdditionalFeatureOption, { foreignKey: 'featureOptionId', as: 'additionalOptionsByOption' });

// Package ↔ Company
Package.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Package, { foreignKey: 'companyId', as: 'packages' });

// Package ↔ Branch
Package.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Branch.hasMany(Package, { foreignKey: 'branchId', as: 'packages' });

// Box - Box item

Box.belongsTo(DeliveryNote, { as: 'deliveryNote', foreignKey: 'deliveryNoteId' });
DeliveryNote.hasMany(Box, { as: 'boxes', foreignKey: 'deliveryNoteId' });

Box.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(Box, { as: 'boxes', foreignKey: 'projectId' });

Box.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
Customer.hasMany(Box, { as: 'boxes', foreignKey: 'customerId' });

Box.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
Order.hasMany(Box, { as: 'boxes', foreignKey: 'orderId' });

Box.belongsTo(Package, { as: 'package', foreignKey: 'packageId' });
Box.belongsTo(User, { as: 'user', foreignKey: 'userId' });

BoxItem.belongsTo(Box, { as: 'box', foreignKey: 'boxId' });
Box.hasMany(BoxItem, { as: 'items', foreignKey: 'boxId' });

BoxItem.belongsTo(OrderItem, { as: 'orderItem', foreignKey: 'orderItemId' });
OrderItem.hasMany(BoxItem, { as: 'boxItems', foreignKey: 'orderItemId' });

BoxItem.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });
Item.hasMany(BoxItem, { as: 'boxItems', foreignKey: 'itemId' });

BoxItem.belongsTo(ItemFeature, { as: 'itemFeature', foreignKey: 'itemFeatureId' });
ItemFeature.hasMany(BoxItem, { as: 'boxItems', foreignKey: 'itemFeatureId' });

BoxItem.belongsTo(FeatureOption, { as: 'featureOption', foreignKey: 'featureOptionId' });
FeatureOption.hasMany(BoxItem, { as: 'boxItems', foreignKey: 'featureOptionId' });

BoxItem.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Delivery Note + Delivery Note Item

DeliveryNote.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });
Invoice.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'invoiceId' });

DeliveryNote.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'projectId' });

DeliveryNote.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });
Company.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'companyId' });

DeliveryNote.belongsTo(Branch, { as: 'branch', foreignKey: 'branchId' });
Branch.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'branchId' });

DeliveryNote.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });
Customer.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'customerId' });

DeliveryNote.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
Order.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'orderId' });

DeliveryNote.belongsTo(Expedition, { as: 'expedition', foreignKey: 'expeditionId' });
Expedition.hasMany(DeliveryNote, { as: 'deliveryNotes', foreignKey: 'expeditionId' });

DeliveryNoteItem.belongsTo(DeliveryNote, { as: 'deliveryNote', foreignKey: 'deliveryNoteId' });
DeliveryNote.hasMany(DeliveryNoteItem, { as: 'items', foreignKey: 'deliveryNoteId' });

DeliveryNoteItem.belongsTo(Box, { as: 'box', foreignKey: 'boxId' });
Box.hasMany(DeliveryNoteItem, { as: 'deliveryNoteItems', foreignKey: 'boxId' });

// Expedition
Expedition.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(Expedition, { as: 'expeditions', foreignKey: 'projectId' });

Expedition.belongsTo(Customer, { as: 'mainCustomer', foreignKey: 'mainCustomerId' });
Customer.hasMany(Expedition, { as: 'mainExpeditions', foreignKey: 'mainCustomerId' });


// Invoice + Invoice Item

Invoice.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });
Company.hasMany(Invoice, { as: 'invoices', foreignKey: 'companyId' });

Invoice.belongsTo(Branch, { as: 'branch', foreignKey: 'branchId' });
Branch.hasMany(Invoice, { as: 'invoices', foreignKey: 'branchId' });

Invoice.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(Invoice, { as: 'invoices', foreignKey: 'projectId' });

Invoice.hasMany(InvoiceItem, { as: 'items', foreignKey: 'invoiceId' });
InvoiceItem.belongsTo(Invoice, { as: 'invoice', foreignKey: 'invoiceId' });

DeliveryNote.hasMany(InvoiceItem, { as: 'invoiceItems', foreignKey: 'deliveryNoteId' });
InvoiceItem.belongsTo(DeliveryNote, { as: 'deliveryNote', foreignKey: 'deliveryNoteId' });

Order.hasMany(InvoiceItem, { as: 'invoiceItems', foreignKey: 'orderId' });
InvoiceItem.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });

// Movement Log Entity + Movement Log Entity Item

User.hasMany(MovementLogEntity, { as: 'movementLogs', foreignKey: 'userId' });
Account.hasMany(MovementLogEntity, { as: 'movementLogs', foreignKey: 'accountId'})
MovementLogEntity.belongsTo(User, { as: 'user', foreignKey: 'userId' });
MovementLogEntity.belongsTo(Account, {as: 'account', foreignKey: 'accountId'});

MovementLogEntity.hasMany(MovementLogEntityItem, { as: 'items', foreignKey: 'movementLogEntityId' });
MovementLogEntityItem.belongsTo(MovementLogEntity, { as: 'movementLogEntity', foreignKey: 'movementLogEntityId' });
// ---------------------- EXPORT ----------------------
export {
  sequelize,
  Account,
  AuthProvider,
  Company,
  CompanySettings,
  CompanyCustomize,
  User,
  Branch,
  UserBranch,
  Customer,
  CustomerGroup,
  Package,
  Item,
  Feature,
  Order,
  OrderItem,
  Project,
  ItemFeature,
  FeatureOption,
  ItemFeatureOption,
  Status,
  ProjectItem,
  ProductionOrder,
  ProductionOrderItem,
  OrderItemAdditionalFeatureOption,
  ProductionOrderItemAdditionalFeatureOption,
  ProductionOrderStatus,
  Movement,
  MovementItem,
  Stock,
  StockItem,
  StockAdditionalItem,
  Box,
  BoxItem,
  DeliveryNote,
  DeliveryNoteItem,
  Expedition,
  Invoice,
  InvoiceItem,
  MovementLogEntity,
  MovementLogEntityItem
};

export default {
  sequelize,
  Account,
  AuthProvider,
  Company,
  CompanySettings,
  CompanyCustomize,
  User,
  Branch,
  UserBranch,
  Customer,
  CustomerGroup,
  Package,
  Item,
  Feature,
  Order,
  OrderItem,
  Project,
  ItemFeature,
  FeatureOption,
  ItemFeatureOption,
  Status,
  ProjectItem,
  ProductionOrder,
  ProductionOrderItem,
  OrderItemAdditionalFeatureOption,
  ProductionOrderItemAdditionalFeatureOption,
  ProductionOrderStatus,
  Movement,
  MovementItem,
  Stock,
  StockItem,
  StockAdditionalItem,
  Box,
  BoxItem,
  DeliveryNote,
  DeliveryNoteItem,
  Expedition,
  Invoice,
  InvoiceItem,
  MovementLogEntity,
  MovementLogEntityItem
};
