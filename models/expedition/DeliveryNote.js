import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from '../Project.js';
import Customer from '../Customer.js';
import Order from '../Order.js';
import Expedition from './Expedition.js';
import Company from '../Company.js';
import Branch from '../Branch.js';
import Invoice from './Invoice.js'; // Fatura

class DeliveryNote extends Model {}

DeliveryNote.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  referralId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  invoiceId: { // fatura
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Invoice, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
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
    allowNull: false,
    references: { model: Company, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Branch, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Customer, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Order, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  expeditionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Expedition, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  boxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'DeliveryNote',
  tableName: 'delivery_notes',
  timestamps: true,
});

// Relações


export default DeliveryNote;
