import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class MovementItem extends Model {}

MovementItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  movementId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'movements', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'items', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  itemFeatureId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'item_features', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  featureOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'feature_options', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  additionalFeatures: {
    type: DataTypes.JSON, // [{ itemFeatureId, value }]
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'MovementItem',
  tableName: 'movement_items',
  timestamps: true,
});

export default MovementItem;
