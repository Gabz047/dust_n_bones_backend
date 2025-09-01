// models/ProductionOrderItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import ProductionOrder from './ProductionOrder.js';

class ProductionOrderStatus extends Model {}

ProductionOrderStatus.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
    status: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: {
        args: [
          [
            'Aberto',
            'Finalizada',
            'Parcial'
          ]
        ]
      }
    }
  },
  productionOrderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ProductionOrder,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: () => new Date().toISOString().split("T")[0],
  },
}, {
  sequelize,
  modelName: 'ProductionOrderStatus',
  tableName: 'production_order_status',
  timestamps: true
});

export default ProductionOrderStatus;
