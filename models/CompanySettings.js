import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CompanySettings extends Model { }

CompanySettings.init({
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
    timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'America/Sao_Paulo',
    },
    language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pt-BR',
        validate: {
            isIn: {
                args: [['pt-BR', 'en-US']],
                msg: 'Idioma não suportado',
            },
        },
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
        validate: {
            len: [3, 3],
        },
    },
    dateFormat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'DD/MM/YYYY',
        validate: {
            isIn: {
                args: [['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']],
                msg: 'Formato de data inválido',
            },
        },
    },
    timeFormat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '24h',
        validate: {
            isIn: {
                args: [['12h', '24h']],
                msg: 'Formato de hora inválido',
            },
        },
    },
    numberFormat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1.234,56',
        validate: {
            isIn: {
                args: [['1.234,56', '1,234.56', '1 234,56']],
                msg: 'Formato de número inválido',
            },
        },
    },
    firstDayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // Segunda-feira
        validate: {
            min: 0, // Domingo
            max: 6, // Sábado
        },
    },
    fiscalYearStart: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '01-01', // 1º de Janeiro
    },
    taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: 0,
            max: 100,
        },
    },
    enableNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    enableEmailReports: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    backupFrequency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'daily',
        validate: {
            isIn: {
                args: [['hourly', 'daily', 'weekly', 'monthly']],
                msg: 'Frequência de backup inválida',
            },
        },
    },
    maxFileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10485760, // 10MB em bytes
    },
    allowedFileTypes: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'csv'],
    },
}, {
    sequelize,
    modelName: 'CompanySettings',
    tableName: 'company_settings',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['company_id']
        }
    ]
});

export default CompanySettings;