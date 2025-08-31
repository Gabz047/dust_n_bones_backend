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
import Package from './Package.js'
import ItemFeature from './ItemFeature.js'
import FeatureOption from './FeatureOption.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Project from './Project.js';
import ItemFeatureOption from './ItemFeatureOption.js';
import Status from './Status.js';
import ProjectItem from './ProjectItem.js'
import ProductionOrder from './ProductionOrder.js';
import ProductionOrderItem from './ProductionOrderItem.js';

// Definir associações
Account.hasMany(AuthProvider, {
    foreignKey: 'accountId',
    as: 'authProviders'
});

AuthProvider.belongsTo(Account, {
    foreignKey: 'accountId',
    as: 'account'
});

// Associações da Company
Account.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

Company.hasMany(Account, {
    foreignKey: 'companyId',
    as: 'accounts'
});

Company.belongsTo(Account, {
    foreignKey: 'ownerId',
    as: 'owner'
});

// Associações Company Settings
Company.hasOne(CompanySettings, {
    foreignKey: 'companyId',
    as: 'settings'
});

CompanySettings.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

// Associações Company Customize
Company.hasOne(CompanyCustomize, {
    foreignKey: 'companyId',
    as: 'customization'
});

CompanyCustomize.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

//Associações Branch

Branch.hasMany(User, {
    foreignKey: 'branchId',
    as: 'directUsers'
})

User.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
})

Company.hasMany(Branch, {
    foreignKey: 'companyId',
    as: 'branches'
})

Branch.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
})


// Associações User
Company.hasMany(User, {
    foreignKey: 'companyId',
    as: 'users'
});

User.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

//Associação User - Branch (muitos para muitos) via UserBranch

User.belongsToMany(Branch, {
    through: UserBranch,
    foreignKey: 'userId',
    otherKey: 'branchId',
    as: 'assignedBranches'
});

Branch.belongsToMany(User, {
    through: UserBranch,
    foreignKey: 'branchId',
    otherKey: 'userId',
    as: 'assignedUsers'
});

UserBranch.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

UserBranch.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

User.hasMany(UserBranch, {
    foreignKey: 'userId',
    as: 'userBranches'
});

Branch.hasMany(UserBranch, {
    foreignKey: 'branchId',
    as: 'userBranches'
});


// Associações Cliente - Grupo Cliente

Customer.belongsTo(CustomerGroup, {
    foreignKey: 'id',
    as: 'customerGroups'
})

CustomerGroup.hasMany(Customer, {
    foreignKey: 'customerGroup',
    as: 'customersInGroup'
})

CustomerGroup.belongsTo(Customer, {
    foreignKey: 'mainCustomer',
    as: 'mainCustomerInGroup'
})

// Associações Item e Feature

Item.belongsToMany(Feature, {
    through: ItemFeature,
    foreignKey: 'itemId',
    otherKey: 'featureId',
    as: 'assignedFeatures'
}); 

Feature.belongsToMany(Item, {
    through: ItemFeature,
    foreignKey: 'featureId',
    otherKey: 'itemId',
    as: 'assignedItems'
});

Feature.hasMany(ItemFeature, {
    foreignKey: 'featureId',
    as: 'itemFeatures'
})

ItemFeature.belongsTo(Item, {
    foreignKey: 'itemId',
    as: 'item'
});

ItemFeature.belongsTo(Feature, {
    foreignKey: 'featureId',
    as: 'feature'
});

Item.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

Item.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

Company.hasMany(Item, {
    foreignKey: 'companyId',
    as: 'items'
});

Branch.hasMany(Item, {
    foreignKey: 'branchId',
    as: 'items'
});

// Associações Características e opções

Feature.hasMany(FeatureOption, {
    foreignKey: 'featureId',
    as: 'options'
});

FeatureOption.belongsTo(Feature, {
    foreignKey: 'featureId',
    as: 'feature'
});


// Asssociações Projeto, cliente, empresa e filial

Project.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

Project.belongsTo(Branch, {
    foreignKey: 'branchId',
    as: 'branch'
});

Company.hasMany(Project, {
    foreignKey: 'companyId',
    as: 'projects'
});

Branch.hasMany(Project, {
    foreignKey: 'branchId',
    as: 'projects'
});

Project.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

Customer.hasMany(Project, {
    foreignKey: 'customerId',
    as: 'projects'
});

// ItemFeature -> ItemFeatureOption
ItemFeature.hasMany(ItemFeatureOption, { foreignKey: 'itemFeatureId', as: 'featureOptions' });
ItemFeatureOption.belongsTo(ItemFeature, { foreignKey: 'itemFeatureId', as: 'itemFeature' });

// FeatureOption -> ItemFeatureOption
FeatureOption.hasMany(ItemFeatureOption, { foreignKey: 'featureOptionId', as: 'itemFeatureOptions' });
ItemFeatureOption.belongsTo(FeatureOption, { foreignKey: 'featureOptionId', as: 'featureOption' });

// Associações pedido e projeto, pedido e cliente, pedido e ordem de produção

Order.belongsTo(Project, {
    foreignKey: 'projectId',
    as: 'project'
});

Project.hasMany(Order, {
    foreignKey: 'projectId',
    as: 'orders'
});

Order.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer'
});

Customer.hasMany(Order, {
    foreignKey: 'customerId',
    as: 'orders'
});

// Associações pedido e item do pedido


Order.belongsToMany(Item, {
    through: OrderItem,
    foreignKey: 'orderId',
    otherKey: 'itemId',
    as: 'items'
});

Item.belongsToMany(Order, {
    through: OrderItem,
    foreignKey: 'itemId',
    otherKey: 'orderId',
    as: 'orders'
});

OrderItem.belongsTo(Order, {
    foreignKey: 'orderId',
    as: 'order'
});

OrderItem.belongsTo(Item, {
    foreignKey: 'itemId',
    as: 'item'
});

// Associações OrderItem com ItemFeature
OrderItem.belongsTo(ItemFeature, {
    foreignKey: 'itemFeatureId',
    as: 'itemFeature'
});
    
ItemFeature.hasMany(OrderItem, {
    foreignKey: 'itemFeatureId',
    as: 'orderItems'
});

// Associações OrderItem com FeatureOption
OrderItem.belongsTo(FeatureOption, {
    foreignKey: 'featureOptionId',
    as: 'featureOption'
});

FeatureOption.hasMany(OrderItem, {
    foreignKey: 'featureOptionId',
    as: 'orderItems'
});


User.hasMany(Status, {
  foreignKey: 'userId',
  as: 'statuses'
});

Status.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Status ↔ Order
Order.hasMany(Status, {
  foreignKey: 'orderId',
  as: 'statuses'
});

Status.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

// Project ↔ Item (muitos para muitos através de ProjectItem)
Project.belongsToMany(Item, {
  through: ProjectItem,
  foreignKey: 'projectId',
  otherKey: 'itemId',
  as: 'items'
});

Item.belongsToMany(Project, {
  through: ProjectItem,
  foreignKey: 'itemId',
  otherKey: 'projectId',
  as: 'projects'
});

// Para acessos diretos
ProjectItem.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
Project.hasMany(ProjectItem, { foreignKey: 'projectId', as: 'projectItems' });
Item.hasMany(ProjectItem, { foreignKey: 'itemId', as: 'projectItems' });

// Associações Itens da Ordem de Produção

// Cada item pertence a uma Ordem de Produção
ProductionOrderItem.belongsTo(ProductionOrder, {
  as: 'productionOrder',
  foreignKey: 'productionOrderId'
});

// Cada item aponta para o cadastro do item base
ProductionOrderItem.belongsTo(Item, {
  as: 'item',
  foreignKey: 'itemId'
});

// Se houver uma característica específica
ProductionOrderItem.belongsTo(ItemFeature, {
  as: 'itemFeature',
  foreignKey: 'itemFeatureId'
});

// Se houver uma opção da característica selecionada
ProductionOrderItem.belongsTo(FeatureOption, {
  as: 'featureOption',
  foreignKey: 'featureOptionId'
});


// Associações de ordem de produção

// ProductionOrder.js

// Uma OP pertence a um Projeto
ProductionOrder.belongsTo(Project, {
  as: 'project',
  foreignKey: 'projectId'
});

// Uma OP pode ter um fornecedor associado
ProductionOrder.belongsTo(Customer, {
  as: 'supplier',
  foreignKey: 'supplierId'
});


// Uma OP tem um cliente principal associado
ProductionOrder.belongsTo(Customer, {
  as: 'mainCustomer',
  foreignKey: 'mainCustomerId'
});

// Uma OP possui vários itens
ProductionOrder.hasMany(ProductionOrderItem, {
  as: 'items',
  foreignKey: 'productionOrderId'
});


// Exportar modelos e sequelize
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
};