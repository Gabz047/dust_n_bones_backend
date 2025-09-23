import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import MovementLogEntity from './MovementLogEntity.js';

class MovementLogEntityItem extends Model {}

MovementLogEntityItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  movementLogEntityId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: MovementLogEntity, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  entity: {
    type: DataTypes.ENUM('romaneio', 'fatura', 'caixa', 'expedição'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'MovementLogEntityItem',
  tableName: 'movement_log_entity_items',
  timestamps: true,
});

// Relações


export default MovementLogEntityItem;
