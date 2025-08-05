import { sequelize } from '../models/index.js';

const runMigrations = async () => {
    try {
        console.log('🔄 Iniciando migrações...');
        await sequelize.sync({ force: false, alter: true });
        console.log('✅ Migrações executadas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro nas migrações:', error);
        process.exit(1);
    }
};

runMigrations();