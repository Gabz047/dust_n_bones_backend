import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import Project from '../Project.js';

class Invoice extends Model {}

Invoice.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  referralId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: Project, key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  type: { // por pedido, projeto ou romaneio
    type: DataTypes.ENUM('project', 'order', 'deliveryNote'),
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
}, {
  sequelize,
  modelName: 'Invoice',
  tableName: 'invoices',
  timestamps: true,
});

// Hook para gerar referralId incremental
Invoice.beforeCreate(async (invoice, options) => {
  const last = await Invoice.findOne({
    order: [['referralId', 'DESC']],
    transaction: options.transaction,
  });
  invoice.referralId = last ? last.referralId + 1 : 1;
});

// Relações


export default Invoice;
