// models/ProductionOrderItemAdditionalFeatureOption.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ProductionOrder from './ProductionOrder.js';
import Item from './Item.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';

class ProductionOrderItemAdditionalFeatureOption extends Model {}

ProductionOrderItemAdditionalFeatureOption.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  productionOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: ProductionOrder, key: 'id' },
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
}, {
  sequelize,
  modelName: 'ProductionOrderItemAdditionalFeatureOption',
  tableName: 'production_order_item_additional_feature_options',
  timestamps: false,
});

export default ProductionOrderItemAdditionalFeatureOption;
