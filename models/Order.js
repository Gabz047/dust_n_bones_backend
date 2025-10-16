import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from './Project.js';
import Customer from './Customer.js';

class Order extends Model {}

Order.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  referralId: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: false,
  },
  projectId: { 
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Project,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  customerId: { 
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  deliveryDate: {
  type: DataTypes.DATEONLY,
  allowNull: true,
  defaultValue: () => new Date().toISOString().split("T")[0],
},
}, {
  sequelize,
  modelName: 'Order',
  tableName: 'orders',
  timestamps: true
});

// Relações
// Order.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });


export default Order;
