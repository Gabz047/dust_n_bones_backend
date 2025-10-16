import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CustomerGroup extends Model { }

CustomerGroup.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
        allowNull: false,
    },
       referralId: {
    type: DataTypes.TEXT,
    allowNull: true,
    unique: false,
  },
    mainCustomer: {
      type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'customers',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
     companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }
   
}, {
    sequelize,
    modelName: 'CustomerGroup',
    tableName: 'customers_group',
    timestamps: true,
   
});

export default CustomerGroup;