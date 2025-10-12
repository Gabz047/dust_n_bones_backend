import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Company extends Model { }

Company.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
      referralId: {
    type: DataTypes.TEXT,
    allowNull: true,
    unique: true,
  },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 255],
        },
    },
    subdomain: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50],
            is: /^[a-z0-9-]+$/i,
        },
    },
    logo: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    cnpj: {
        type: DataTypes.STRING(18),
        allowNull: true,
        unique: true,
        validate: {
            len: [14, 18],
        },
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            len: [10, 15],
        },
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING(2),
        allowNull: true,
    },
    zipCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Brasil',
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    subscriptionPlan: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'basic',
        validate: {
            isIn: {
                args: [['basic', 'pro', 'enterprise']],
                msg: 'Plano de assinatura inválido',
            },
        },
    },
    maxUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'Company',
    tableName: 'companies',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['subdomain']
        },
        {
            unique: true,
            fields: ['cnpj']
        },
        {
            fields: ['owner_id']
        },
        {
            fields: ['active']
        }
    ]
});

export default Company;