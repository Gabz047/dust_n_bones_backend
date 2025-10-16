import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class Package extends Model { }

Package.init({
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
    field: 'referral_id',
  },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [2, 255],
        },
        unique: 'unique_name_per_package',
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: {
                args: [[
                    "Caixa",
                    "Envelope",
                    "Envelope Almofadado",
                    "Pallet",
                    "Container",
                    "Tubo",
                    "Saco",
                    "Caixa Térmica",
                    "Sacola",
                    "Caixa para Presente",
                    "Caixa Acrílica",
                    "Envelope Decorativo",
                    "Embalagem Blister",
                    "Skin Pack",
                    "Cartucho",
                    "Fardo",
                    "Caixa Empilhável",
                    "Caixa Organizadora",
                    "Contentor",
                    "Bag",
                    "Tambor",
                    "Engradado",
                    "Container IBC",
                    "Garrafa",
                    "Lata",
                    "Pote",
                    "Caixa Longa Vida",
                    "Embalagem a Vácuo",
                    "Balde",
                    "Filme Stretch",
                    "Filme Shrink"
                ]]
            }
        }
    },
    material: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: {
                args: [[
                    "Papelão",
                    "Papel",
                    "Plástico",
                    "Plástico PET",
                    "Plástico PE",
                    "Plástico PP",
                    "Plástico PVC",
                    "Plástico BOPP",
                    "Vidro",
                    "Alumínio",
                    "Aço",
                    "Madeira",
                    "Bambu",
                    "Isopor",
                    "Tecido",
                    "TNT",
                    "Juta",
                    "Borracha",
                    "Fibra Natural",
                    "Fibra Sintética",
                    "Biodegradável",
                    "Compostável"
                ]]
            }
        }
    },
    width: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    height: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    length: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    weight: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0
        }
    }
    ,
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
    modelName: 'Package',
    tableName: 'packages',
    timestamps: true,
})

export default Package;