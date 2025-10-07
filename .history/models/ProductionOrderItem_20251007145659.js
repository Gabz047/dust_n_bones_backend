// models/ProductionOrderItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ProductionOrder from './ProductionOrder.js';
import Item from './Item.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';
import OrderItem from './OrderItem.js';

class ProductionOrderItem extends Model {}

ProductionOrderItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  productionOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ProductionOrder,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Item,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },

  itemFeatureId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: ItemFeature,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  featureOptionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: FeatureOption,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  sequelize,
  modelName: 'ProductionOrderItem',
  tableName: 'production_order_items',
  timestamps: true,
  indexes: [
    { fields: ['productionOrderId'] },
    { fields: ['itemId'] },
    { fields: ['itemFeatureId'] },
    { fields: ['featureOptionId'] },
    { fields: ['productionOrderId', 'itemId'] } 
  ]
});

export default ProductionOrderItem;
