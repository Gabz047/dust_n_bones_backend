import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Customer extends Model { }

Customer.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 255],
        },
    },
    document: {
        type: DataTypes.STRING(18),
        allowNull: true,
        unique: true,
        validate: {
            len: [11, 18],
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
        type: DataTypes.STRING(255),
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
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    customerGroup: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'customers_group',
            key: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
    }
}, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['document']
        },
        {
            fields: ['active']
        },
        
    ]
});

export default Customer;