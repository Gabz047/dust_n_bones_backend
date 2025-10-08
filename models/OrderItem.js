import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Order from './Order.js';
import Item from './Item.js';
import ItemFeature from './ItemFeature.js';
import FeatureOption from './FeatureOption.js';

class OrderItem extends Model {}

OrderItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Order,
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
    allowNull: false, 
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
  modelName: 'OrderItem',
  tableName: 'order_items',
  indexes: [{  fields: ['order_id', 'item_id', 'item_feature_id', 'feature_option_id'] }],
  timestamps: true
});

// Relações
// OrderItemFeatureOption.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
// OrderItemFeatureOption.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });
// OrderItemFeatureOption.belongsTo(ItemFeature, { as: 'itemFeature', foreignKey: 'itemFeatureId' });
// OrderItemFeatureOption.belongsTo(FeatureOption, { as: 'featureOption', foreignKey: 'featureOptionId' });

export default OrderItem;