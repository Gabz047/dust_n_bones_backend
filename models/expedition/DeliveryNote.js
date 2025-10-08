// models/delivery/DeliveryNote.js
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
    allowNull: true,
    unique: true,
    field: 'referral_id',
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'invoice_id',
    references: { model: Invoice, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'project_id',
    references: { model: Project, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'company_id',
    references: { model: Company, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id',
    references: { model: Branch, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'customer_id',
    references: { model: Customer, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'order_id',
    references: { model: Order, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  expeditionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'expedition_id',
    references: { model: Expedition, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  boxQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'box_quantity',
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_quantity',
  },
}, {
  sequelize,
  modelName: 'DeliveryNote',
  tableName: 'delivery_notes',
  timestamps: true,
  underscored: true, // garante que todos os campos novos usem snake_case
  indexes: [
    { fields: ['invoice_id'] },
    { fields: ['project_id'] },
    { fields: ['customer_id'] },
    { fields: ['order_id'] },
    { fields: ['expedition_id'] },
    { fields: ['company_id', 'branch_id'] },
    { fields: ['project_id', 'customer_id'] },
    { fields: ['order_id', 'customer_id'] },
    { fields: ['referral_id'], unique: true },
  ],
});

// Geração incremental do referralId
DeliveryNote.beforeCreate(async (deliveryNote, options) => {
  const last = await DeliveryNote.findOne({
    order: [['referral_id', 'DESC']],
    transaction: options.transaction,
  });
  deliveryNote.referralId = last ? last.referralId + 1 : 1;
});

export default DeliveryNote;
