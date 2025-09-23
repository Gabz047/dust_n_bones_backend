import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import DeliveryNote from './DeliveryNote.js'; // Romaneio
import Project from '../Project.js';
import Customer from '../Customer.js';
import Order from '../Order.js';
import Package from '../Package.js';
import User from '../User.js';

class Box extends Model {}

Box.init({
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
  deliveryNoteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: DeliveryNote, key: 'id' },
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
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Customer, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Order, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  packageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Package, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
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
  timestamps: true,
});

// Hook para gerar referralId incremental
Box.beforeCreate(async (box, options) => {
  const last = await Box.findOne({ order: [['referralId', 'DESC']], transaction: options.transaction });
  box.referralId = last ? last.referralId + 1 : 1;
});


export default Box;
