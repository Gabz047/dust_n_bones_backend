import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import Invoice from './Invoice.js';
import Order from '../Order.js';
import DeliveryNote from './DeliveryNote.js'; // romaneio
import { v4 as uuidv4 } from 'uuid';

class InvoiceItem extends Model {}

InvoiceItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
   referralId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: false,
  },
  invoiceId: { 
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Invoice, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  deliveryNoteId: { // romaneio
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: DeliveryNote, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Order, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  price: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: false,
    defaultValue: 0.0,
  },
}, {
  sequelize,
  modelName: 'InvoiceItem',
  tableName: 'invoice_items',
  timestamps: true,
});

// Relações

InvoiceItem.beforeCreate(async (box, options) => {
  const last = await InvoiceItem.findOne({ order: [['referralId', 'DESC']], transaction: options.transaction });
  box.referralId = last ? last.referralId + 1 : 1;
});

export default InvoiceItem;
