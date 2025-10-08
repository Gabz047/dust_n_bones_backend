import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
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
    field: 'delivery_note_id', // ⚠️ corrige o nome da coluna no DB
  },
  boxId: { // id da caixa
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Box, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    field: 'box_id', // ⚠️ corrige o nome da coluna no DB
  },
}, {
  sequelize,
  modelName: 'DeliveryNoteItem',
  tableName: 'delivery_note_items',
  timestamps: true,
  underscored: true, // ⚠️ transforma automaticamente camelCase em snake_case

  // Índices para otimizar consultas
  indexes: [
    { fields: ['delivery_note_id'] }, // ⚠️ nomes em snake_case
    { fields: ['box_id'] },
    { unique: true, fields: ['delivery_note_id', 'box_id'] },
  ],
});

export default DeliveryNoteItem;
