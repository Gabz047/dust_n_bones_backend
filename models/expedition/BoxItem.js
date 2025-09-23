import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Box from './Box.js';
import OrderItem from '../OrderItem.js';
import Item from '../Item.js';
import ItemFeature from '../ItemFeature.js';
import FeatureOption from '../FeatureOption.js';
import User from '../User.js';

class BoxItem extends Model {}

BoxItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderItemId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: OrderItem, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  boxId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Box, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Item, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  itemFeatureId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: ItemFeature, key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  featureOptionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: FeatureOption, key: 'id' },
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
  modelName: 'BoxItem',
  tableName: 'box_items',
  timestamps: true,
});

// Relações


export default BoxItem;
