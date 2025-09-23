import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import DeliveryNote from './DeliveryNote.js';
import Box from './Box.js';

class DeliveryNoteItem extends Model {}

DeliveryNoteItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  deliveryNoteId: { // id do romaneio
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: DeliveryNote, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  boxId: { // id da caixa
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Box, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
}, {
  sequelize,
  modelName: 'DeliveryNoteItem',
  tableName: 'delivery_note_items',
  timestamps: true,
});

// Relações


export default DeliveryNoteItem;
