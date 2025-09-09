// models/ProductionOrder.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from './Project.js';
import Customer from './Customer.js';


class ProductionOrder extends Model {}

ProductionOrder.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  referralId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  supplierId: { // fornecedor que executa
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  mainCustomerId: { // cliente principal do projeto
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
   projectId: { // cliente principal do projeto
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Project,
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: {
        args: [
          [
            'Normal',
            'Reposição'
          ]
        ]
      }
    }
  },
  plannedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  deliveredQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: () => new Date().toISOString().split("T")[0],
  },
  closeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'ProductionOrder',
  tableName: 'production_orders',
  timestamps: true
});

export default ProductionOrder;
