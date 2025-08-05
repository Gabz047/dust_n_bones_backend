import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class Account extends Model { }

Account.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: uuidv4,
    primaryKey: true,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [5, 100],
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  referralId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'owner',
  },
  accountType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'client',
    validate: {
      isIn: {
        args: [['client', 'admin']],
        msg: 'Invalid account type',
      },
    },
  },
}, {
  sequelize,
  modelName: 'Account',
  tableName: 'accounts',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    }
  ]
});

// Hook para hash da senha antes de criar/atualizar
Account.beforeCreate(async (account) => {
  if (account.password) {
    const salt = await bcrypt.genSalt(10);
    account.password = await bcrypt.hash(account.password, salt);
  }
});

Account.beforeUpdate(async (account) => {
  if (account.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    account.password = await bcrypt.hash(account.password, salt);
  }
});

// Função para validar a senha
Account.prototype.validPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default Account;