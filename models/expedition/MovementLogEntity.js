import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import User from '../User.js';
import Account from '../Account.js';

class MovementLogEntity extends Model {}

MovementLogEntity.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
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
    type: DataTypes.ENUM('romaneio', 'fatura', 'caixa', 'expedição', 'projeto', 'movimentacao'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
    accountId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Account, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
   companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id',
    },
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

  // ✅ Índices
  indexes: [
    {
      name: 'idx_movement_entity_search',
      fields: ['entity', 'entity_id', 'created_at'],
    },
  ],
});

// Relações


export default MovementLogEntity;
