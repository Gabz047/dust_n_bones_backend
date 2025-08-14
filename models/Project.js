import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Company from './Company.js';
import Branch from './Branch.js';
import Customer from './Customer.js';

class Project extends Model {}

Project.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  customerId: { 
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  companyId: { 
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Company,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  branchId: { 
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Branch,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'projects',
  timestamps: true,
});

// // Relações
// Project.belongsTo(Company, { as: 'company', foreignKey: 'companyId' });
// Project.belongsTo(Branch, { as: 'branch', foreignKey: 'branchId' });

export default Project;
