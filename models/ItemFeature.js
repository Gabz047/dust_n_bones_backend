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
        field: 'item_id', // mapeamento correto para o banco
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
        field: 'feature_id', // mapeamento correto para o banco
    },
    dateJoined: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: 'date_joined',
    }
}, {
    sequelize,
    modelName: 'ItemFeature',
    tableName: 'item_features',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['item_id', 'feature_id'], // nomes corretos do banco
            name: 'uniq_item_feature'
        },
        {
            fields: ['item_id'],
            name: 'idx_item_id'
        },
        {
            fields: ['feature_id'],
            name: 'idx_feature_id'
        }
    ]
});

export default ItemFeature;
