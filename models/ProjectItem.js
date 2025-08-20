import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';


class ProjectItem extends Model {}

ProjectItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'items',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
}, {
  sequelize,
  modelName: 'ProjectItem',
  tableName: 'project_items',
  timestamps: true
});

// Relações
// OrderItemFeatureOption.belongsTo(Order, { as: 'order', foreignKey: 'orderId' });
// OrderItemFeatureOption.belongsTo(Item, { as: 'item', foreignKey: 'itemId' });
// OrderItemFeatureOption.belongsTo(ItemFeature, { as: 'itemFeature', foreignKey: 'itemFeatureId' });
// OrderItemFeatureOption.belongsTo(FeatureOption, { as: 'featureOption', foreignKey: 'featureOptionId' });

export default ProjectItem;