import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import Invoice from './Invoice.js';
import Order from '../Order.js';
import DeliveryNote from './DeliveryNote.js'; // romaneio

class InvoiceItem extends Model {}

InvoiceItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => require('uuid').v4(),
    primaryKey: true,
    allowNull: false,
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


export default InvoiceItem;
