import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class ItemFeature extends Model {}

ItemFeature.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'items', // ou Item se o modelo estiver importado e associado
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    unique: 'unique_feature_per_item',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 255],
    },
    unique: 'unique_feature_per_item',
  },
  options: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  }
}, {
  sequelize,
  modelName: 'ItemFeature',
  tableName: 'item_features',
  timestamps: true,
});

export default ItemFeature;
