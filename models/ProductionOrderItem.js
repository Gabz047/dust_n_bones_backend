// models/ProductionOrderItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ProductionOrder from './ProductionOrder.js';
import Item from './Item.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';

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
    field: 'production_order_id',
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
    field: 'item_id',
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
    field: 'item_feature_id',
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
    field: 'feature_option_id',
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
    { fields: ['production_order_id'], name: 'production_order_items_production_order_id_idx' },
    { fields: ['item_id'], name: 'production_order_items_item_id_idx' },
    { fields: ['item_feature_id'], name: 'production_order_items_item_feature_id_idx' },
    { fields: ['feature_option_id'], name: 'production_order_items_feature_option_id_idx' },
    { fields: ['production_order_id', 'item_id'], name: 'production_order_items_prod_order_item_idx' }
  ]
});

export default ProductionOrderItem;
