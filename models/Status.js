import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Status extends Model {}

Status.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
        model: 'users',
        key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  },
  orderId: { 
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
   status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: {
                args: [[
                    "Criado",
                    "Em produção",
                    "Em estoque",
                    "Entregue",
                ]]
            }
        }
    },
}, {
  sequelize,
  modelName: 'Status',
  tableName: 'status',
  timestamps: true,
});

export default Status;
