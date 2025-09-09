// models/StockAdditionalItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Stock from './Stock.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';

class StockAdditionalItem extends Model {}

StockAdditionalItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
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
  }
}, {
  sequelize,
  modelName: 'StockAdditionalItem',
  tableName: 'stock_additional_items',
  timestamps: true,
});

export default StockAdditionalItem;
