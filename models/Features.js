import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Feature extends Model {}

Feature.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 255],
    },
    unique: 'unique_feature',
  },
}, {
  sequelize,
  modelName: 'Feature',
  tableName: 'features',
  timestamps: true,
});

export default Feature;
