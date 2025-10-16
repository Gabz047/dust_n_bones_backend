import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import DeliveryNote from './DeliveryNote.js'; // Romaneio
import Project from '../Project.js';
import Customer from '../Customer.js';
import Order from '../Order.js';
import Package from '../Package.js';


class Box extends Model {}

Box.init({
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
  orderReferralId:{
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: false,
  },
  deliveryNoteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: DeliveryNote, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    field: 'delivery_note_id',
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Project, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    field: 'project_id',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Customer, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    field: 'customer_id',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Order, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    field: 'order_id',
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'total_quantity',
  },
  packageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Package, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    field: 'package_id',
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'Box',
  tableName: 'boxes',
  underscored: true, // converte camelCase para snake_case automaticamente
  timestamps: true,
  indexes: [
    { fields: ['delivery_note_id'] },
    { fields: ['project_id'] },
    { fields: ['customer_id'] },
    { fields: ['order_id'] },
    { fields: ['referral_id'] },
    { fields: ['date'] },
    { fields: ['project_id', 'customer_id'] }
  ]
});


export default Box;
