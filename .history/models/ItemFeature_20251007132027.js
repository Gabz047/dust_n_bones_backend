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
    modelName: 'ItemFeature',
    tableName: 'item_features',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['itemId', 'featureId'],
            name: 'uniq_item_feature'
        },
        {
            fields: ['itemId'],
            name: 'idx_item_id'
        },
        {
            fields: ['featureId'],
            name: 'idx_feature_id'
        }
    ]
});

export default ItemFeature;
