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
    referralId: {
    type: DataTypes.TEXT,
    allowNull: true,
    unique: true,
    field: 'referral_id',
  },
  name: {
    type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 255],
        },
        unique: 'unique_name_per_project',
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
  deliveryDate: {
  type: DataTypes.DATEONLY,
  allowNull: false,
  defaultValue: () => new Date().toISOString().split("T")[0],
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
