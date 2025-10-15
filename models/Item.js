import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class Item extends Model { }

Item.init({
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
      len: [3, 100],
    },
    unique: 'unique_name_per_company',
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 500],
    },
  },
measurementUnit: {
  type: DataTypes.STRING,
  allowNull: false,
  validate: {
    isIn: {
      args: [
        [
          'kg',  // quilograma
          'g',   // grama
          'mg',  // miligrama
          'l',   // litro
          'ml',  // mililitro
          'un',  // unidade (peça, item)
          'm',   // metro (comprimento)
          'cm',  // centímetro
          'mm',  // milímetro
          'm2',  // metro quadrado (área)
          'm3',  // metro cúbico (volume)
          'pa',  // peça (outro tipo de unidade contagem)
          'dz',  // dúzia
          'pct', // pacote
          'rol', // rolo
          'cx',  // caixa
          'fl',  // folha
          'ton', // tonelada
        ]
      ],
      msg: 'Unidade de medida inválida',
    },
  },
},
businessItemType: {
  type: DataTypes.STRING,
  allowNull: true,
  validate: {
    isIn: {
      args: [
        [
          'Confecção',
          'Outro'
        ]
      ],
    },
  },
},
itemType: {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'Produto Acabado',
  validate: {
    isIn: {
      args: [['Matérias-primas', 'Produtos em processo', 'Produto Acabado']],
      msg: 'Tipo de item inválido',
    },
  },
},
genre: {
  type: DataTypes.STRING,
  allowNull: true,
  validate: {
    isIn: {
      args: [['Unissex', 'Masculino', 'Feminino']],
      msg: 'Gênero Inválido! Escolhas disponíveis: Unissex, Masculino e Feminino'
    }
  }
},
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  minStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  },
  maxStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
    validate: {
      min: 0,
    },
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
  modelName: 'Item',
  tableName: 'items',
  timestamps: true,
  validate: {
    minMaxStockConsistency() {
      if (this.maxStock < this.minStock) {
        throw new Error('maxStock deve ser maior ou igual a minStock');
      }
    }
  }
});

export default Item;
