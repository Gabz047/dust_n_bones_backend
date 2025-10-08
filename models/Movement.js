import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import MovementItem from './MovementItem.js'; // vai criar depois

class Movement extends Model {}

Movement.init({
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
  productionOrderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'production_orders', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  accountId: {
  type: DataTypes.UUID,
  allowNull: true,
  references: { model: 'accounts', key: 'id' },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
},
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  movementType: {
    type: DataTypes.ENUM('productionOrder', 'manual'),
    allowNull: false,
  },
  observation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Movement',
  tableName: 'movements',
  timestamps: true,
});

// Hook para gerar referralId incremental
Movement.beforeCreate(async (movement, options) => {
  const last = await Movement.findOne({
    order: [['referralId', 'DESC']],
    transaction: options.transaction,
  });
  movement.referralId = last ? last.referralId + 1 : 1;
});


export default Movement;
