import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Specie extends Model {}

Specie.init({
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
  },
  scientificName: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [2, 255],
    },
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  sequelize,
  modelName: 'Specie',
  tableName: 'species',
  timestamps: true,
  indexes: [
    {
      fields: ['name'],
    },
    {
      fields: ['active'],
    },
  ],
});

export default Specie;
