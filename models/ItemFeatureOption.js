import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class ItemFeatureOption extends Model {}

ItemFeatureOption.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  itemFeatureId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'item_features',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  featureOptionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'feature_options',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  dateJoined: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'ItemFeatureOption',
  tableName: 'item_feature_options',
  timestamps: true,
});

export default ItemFeatureOption;
