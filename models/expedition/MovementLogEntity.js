import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import User from '../User.js';

class MovementLogEntity extends Model {}

MovementLogEntity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => require('uuid').v4(),
    primaryKey: true,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('aberto', 'finalizado'),
    allowNull: false,
    defaultValue: 'aberto',
  },
  method: {
    type: DataTypes.ENUM('edição', 'criação', 'remoção'),
    allowNull: false,
  },
  entity: {
    type: DataTypes.ENUM('romaneio', 'fatura', 'caixa', 'expedição'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  sequelize,
  modelName: 'MovementLogEntity',
  tableName: 'movement_log_entities',
  timestamps: true,
});

// Relações


export default MovementLogEntity;
