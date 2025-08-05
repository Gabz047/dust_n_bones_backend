import sequelize from '../config/database.js';
import Account from './Account.js';
import AuthProvider from './AuthProvider.js';
import Company from './Company.js';
import CompanySettings from './CompanySettings.js';
import CompanyCustomize from './CompanyCustomize.js';
import User from './User.js';

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

// Associações User
Company.hasMany(User, {
    foreignKey: 'companyId',
    as: 'users'
});

User.belongsTo(Company, {
    foreignKey: 'companyId',
    as: 'company'
});

// Auto-referência para convites
User.hasMany(User, {
    foreignKey: 'invitedBy',
    as: 'invitedUsers'
});

User.belongsTo(User, {
    foreignKey: 'invitedBy',
    as: 'inviter'
});

// Exportar modelos e sequelize
export {
    sequelize,
    Account,
    AuthProvider,
    Company,
    CompanySettings,
    CompanyCustomize,
    User
};

export default {
    sequelize,
    Account,
    AuthProvider,
    Company,
    CompanySettings,
    CompanyCustomize,
    User
};