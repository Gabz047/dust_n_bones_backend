import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from '../Project.js';
import Company from '../Company.js';
import Branch from '../Branch.js';
class Invoice extends Model {}

Invoice.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  referralId: {
    type: DataTypes.TEXT,
    allowNull: true,
    unique: false,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Project, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
    companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Company, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Branch, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  type: { // por pedido, projeto ou romaneio
    type: DataTypes.ENUM('project', 'order', 'deliveryNote'),
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.0,
  },
}, {
  sequelize,
  modelName: 'Invoice',
  tableName: 'invoices',
  timestamps: true,
});

// Relações


export default Invoice;
