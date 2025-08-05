import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CompanyCustomize extends Model { }

CompanyCustomize.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
    companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
    },
    primaryColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#007bff',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    secondaryColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#6c757d',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    backgroundColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#ffffff',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    textColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#212529',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    accentColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#28a745',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    warningColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#ffc107',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    errorColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#dc3545',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    successColor: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#28a745',
        validate: {
            is: /^#[0-9A-F]{6}$/i,
        },
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    darkLogoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    faviconUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    fontFamily: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Inter, sans-serif',
    },
    fontSize: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '14px',
    },
    borderRadius: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '6px',
    },
    sidebarStyle: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'light',
        validate: {
            isIn: {
                args: [['light', 'dark', 'colored']],
                msg: 'Estilo de sidebar inválido',
            },
        },
    },
    headerStyle: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'light',
        validate: {
            isIn: {
                args: [['light', 'dark', 'colored']],
                msg: 'Estilo de header inválido',
            },
        },
    },
    theme: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'light',
        validate: {
            isIn: {
                args: [['light', 'dark', 'auto']],
                msg: 'Tema inválido',
            },
        },
    },
    customCss: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    customJs: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    showCompanyLogo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    showCompanyName: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    compactMode: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize,
    modelName: 'CompanyCustomize',
    tableName: 'company_customizations',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['company_id']
        }
    ]
});

export default CompanyCustomize;