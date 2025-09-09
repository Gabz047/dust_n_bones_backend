// models/Stock.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Item from './Item.js';

class Stock extends Model {}

Stock.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Item, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0, // opcional: soma de todos StockItems
  },
}, {
  sequelize,
  modelName: 'Stock',
  tableName: 'stocks',
  timestamps: true,
});

export default Stock;
