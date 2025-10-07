import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class ItemFeature extends Model { }

ItemFeature.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
    itemId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { 
            model: 'items',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
    dateJoined: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
    modelName: 'ItemFeatures',
    tableName: 'item_features',
    timestamps: true,
});

export default ItemFeature;