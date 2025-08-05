import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Account from './Account.js';
import { v4 as uuidv4 } from 'uuid';

const AuthProvider = sequelize.define('AuthProvider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Account,
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  providerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  photo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'auth_providers',
  timestamps: true,
  indexes: [
    {
      fields: ['account_id'],
    },
  ],
});

export default AuthProvider;