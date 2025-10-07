// models/StockItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Stock from './Stock.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';
import Item from './Item.js';

class StockItem extends Model {}

StockItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Item, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  stockId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Stock, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  itemFeatureId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: ItemFeature, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  featureOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: FeatureOption, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'StockItem',
  tableName: 'stock_items',
  timestamps: true,
  indexes: [
    { fields: ['itemId'] },
    { fields: ['stockId'] },
    { fields: ['itemFeatureId'] },
    { fields: ['featureOptionId'] },
    { fields: ['stockId', 'itemId'] }, // útil se você filtra por stock + item
    { fields: ['itemId', 'itemFeatureId', 'featureOptionId'] } // útil se você filtra por item + feature + option
  ]
});

export default StockItem;
