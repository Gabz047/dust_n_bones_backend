import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from '../Project.js';
import Customer from '../Customer.js';

class Expedition extends Model {}

Expedition.init({
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
  mainCustomerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Customer,
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
}, {
  sequelize,
  modelName: 'Expedition',
  tableName: 'expeditions',
  timestamps: true
});

// Relações


// Hook para gerar referralId incremental
Expedition.beforeCreate(async (expedition, options) => {
  const last = await Expedition.findOne({
    order: [['referralId', 'DESC']],
    transaction: options.transaction
  });
  expedition.referralId = last ? last.referralId + 1 : 1;
});

export default Expedition;
