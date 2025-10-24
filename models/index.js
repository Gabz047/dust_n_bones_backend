import sequelize from '../config/database.js';
import Specie from './veterinary/specie.js';
import Bone from './veterinary/bone.js';
// ---------------------- RELAÇÕES ----------------------

// Uma espécie pode ter vários ossos
Specie.hasMany(Bone, { foreignKey: 'specieId', as: 'bones' });

// Cada osso pertence a uma espécie
Bone.belongsTo(Specie, { foreignKey: 'specieId', as: 'specie' });

// ---------------------- EXPORTAÇÕES ----------------------
export {
  sequelize,
  Specie,
  Bone,
};

export default {
  sequelize,
  Specie,
  Bone,
};
