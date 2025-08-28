import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class FeatureOption extends Model { }

FeatureOption.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
    featureId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
            model: 'features',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [1, 255],
        },
    },
    dateJoined: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
    modelName: 'FeatureOptions',
    tableName: 'feature_options',
    timestamps: true,
});

export default FeatureOption;