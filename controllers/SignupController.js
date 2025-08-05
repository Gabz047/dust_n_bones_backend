import { Account, Company, CompanySettings, CompanyCustomize } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

class SignupController {
    static async signup(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const { account: accountData, company: companyData } = req.body;

            // Verificar se email já existe
            const existingAccount = await Account.findOne({ 
                where: { email: accountData.email } 
            });
            if (existingAccount) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Email já está em uso',
                    errors: [{
                        field: 'account.email',
                        message: 'Este email já está cadastrado no sistema',
                        value: accountData.email
                    }]
                });
            }

            // Verificar se subdomínio já existe
            const existingCompany = await Company.findOne({ 
                where: { subdomain: companyData.subdomain } 
            });
            if (existingCompany) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Subdomínio já está em uso',
                    errors: [{
                        field: 'company.subdomain',
                        message: 'Este subdomínio já está sendo usado por outra empresa',
                        value: companyData.subdomain
                    }]
                });
            }

            // Se CNPJ foi fornecido, verificar se já existe
            if (companyData.cnpj) {
                const existingCnpj = await Company.findOne({ 
                    where: { cnpj: companyData.cnpj } 
                });
                if (existingCnpj) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'CNPJ já está em uso',
                        errors: [{
                            field: 'company.cnpj',
                            message: 'Este CNPJ já está cadastrado no sistema',
                            value: companyData.cnpj
                        }]
                    });
                }
            }

            // Criar primeiro a conta temporariamente
            const accountId = uuidv4();
            const tempAccount = await Account.create({
                id: accountId,
                email: accountData.email,
                username: accountData.username,
                password: accountData.password,
                firstName: accountData.firstName,
                lastName: accountData.lastName,
                phone: accountData.phone,
                role: 'owner',
                accountType: 'client'
            }, { transaction });

            // Criar a empresa
            const company = await Company.create({
                id: uuidv4(),
                name: companyData.companyName,
                subdomain: companyData.subdomain,
                cnpj: companyData.cnpj,
                email: companyData.companyEmail,
                phone: companyData.companyPhone,
                website: companyData.website,
                address: companyData.address,
                subscriptionPlan: companyData.plan || 'basic',
                ownerId: accountId,
                active: true
            }, { transaction });

            // Atualizar a conta com o companyId
            await tempAccount.update({
                companyId: company.id
            }, { transaction });

            // Criar configurações padrão da empresa
            await CompanySettings.create({
                id: uuidv4(),
                companyId: company.id
            }, { transaction });

            // Criar customizações padrão da empresa
            await CompanyCustomize.create({
                id: uuidv4(),
                companyId: company.id
            }, { transaction });

            await transaction.commit();

            // Gerar token JWT
            const token = jwt.sign(
                { 
                    id: tempAccount.id, 
                    email: tempAccount.email, 
                    role: tempAccount.role,
                    companyId: company.id
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            // Buscar os dados completos criados
            const account = await Account.findByPk(tempAccount.id, {
                attributes: { exclude: ['password'] },
                include: [
                    {
                        association: 'company',
                        attributes: ['id', 'name', 'subdomain', 'subscriptionPlan']
                    }
                ]
            });

            res.status(201).json({
                success: true,
                message: 'Conta e empresa criadas com sucesso',
                data: {
                    account,
                    company: {
                        id: company.id,
                        name: company.name,
                        subdomain: company.subdomain,
                        subscriptionPlan: company.subscriptionPlan
                    },
                    token
                }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Erro no signup:', error);
            
            // Tratar erros de validação do Sequelize
            if (error.name === 'SequelizeValidationError') {
                const validationErrors = error.errors.map(err => ({
                    field: err.path,
                    message: err.message,
                    value: err.value
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: validationErrors
                });
            }

            // Tratar erros de constraint único
            if (error.name === 'SequelizeUniqueConstraintError') {
                const constraintErrors = error.errors.map(err => ({
                    field: err.path,
                    message: `${err.path} já está em uso`,
                    value: err.value
                }));

                return res.status(400).json({
                    success: false,
                    message: 'Dados duplicados encontrados',
                    errors: constraintErrors
                });
            }

            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default SignupController;
