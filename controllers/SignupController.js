import { Account, Company, CompanySettings, CompanyCustomize } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

class SignupController {
    static async signup(req, res) {
        const transaction = await sequelize.transaction();

        try {
            const { account: accountData, company: companyData } = req.body;

            // Validações de dados - Account
            const accountValidation = SignupController.validateAccountData(accountData);
            if (!accountValidation.valid) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Dados da conta inválidos',
                    errors: accountValidation.errors
                });
            }

            // Validações de dados - Company
            const companyValidation = SignupController.validateCompanyData(companyData);
            if (!companyValidation.valid) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Dados da empresa inválidos',
                    errors: companyValidation.errors
                });
            }

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
                email: accountData.email.trim(),
                username: accountData.username ? accountData.username.trim() : null,
                password: accountData.password,
                firstName: accountData.firstName.trim(),
                lastName: accountData.lastName.trim(),
                phone: accountData.phone ? accountData.phone.trim() : null,
                role: 'owner',
                accountType: 'client'
            }, { transaction });

            // Mapear plano do frontend para o backend
            const planMapping = {
                'basic': 'basic',
                'pro': 'pro',
                'enterprise': 'enterprise'
            };
            const subscriptionPlan = planMapping[companyData.subscriptionPlan] || 'basic';

            // Criar a empresa
            const company = await Company.create({
                id: uuidv4(),
                name: companyData.name.trim(),
                subdomain: companyData.subdomain.trim().toLowerCase(),
                cnpj: companyData.cnpj ? companyData.cnpj.trim() : null,
                email: companyData.email ? companyData.email.trim() : null,
                phone: companyData.phone ? companyData.phone.trim() : null,
                website: companyData.website ? companyData.website.trim() : null,
                address: companyData.address ? companyData.address.trim() : null,
                city: companyData.city ? companyData.city.trim() : null,
                state: companyData.state ? companyData.state.trim().toUpperCase() : null,
                zipCode: companyData.zipCode ? companyData.zipCode.trim() : null,
                subscriptionPlan: subscriptionPlan,
                maxUsers: 20,
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

            // Construir URL de redirecionamento
            const redirectUrl = `https://${company.subdomain}.estoquelogia.com/dashboard`;

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
                    token,
                    redirectUrl,
                    subdomain: company.subdomain
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

    // Validação de dados da conta
    static validateAccountData(data) {
        const errors = [];

        // Email obrigatório e válido
        if (!data.email || !data.email.trim()) {
            errors.push({
                field: 'account.email',
                message: 'Email é obrigatório',
                value: data.email
            });
        } else if (!SignupController.isValidEmail(data.email)) {
            errors.push({
                field: 'account.email',
                message: 'Email inválido. Deve conter @',
                value: data.email
            });
        }

        // Nome obrigatório
        if (!data.firstName || !data.firstName.trim()) {
            errors.push({
                field: 'account.firstName',
                message: 'Nome é obrigatório',
                value: data.firstName
            });
        }

        // Sobrenome obrigatório
        if (!data.lastName || !data.lastName.trim()) {
            errors.push({
                field: 'account.lastName',
                message: 'Sobrenome é obrigatório',
                value: data.lastName
            });
        }

        // Senha obrigatória e válida
        if (!data.password) {
            errors.push({
                field: 'account.password',
                message: 'Senha é obrigatória',
                value: null
            });
        } else if (!SignupController.isValidPassword(data.password)) {
            errors.push({
                field: 'account.password',
                message: 'Senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial',
                value: null
            });
        }

        // Telefone opcional, mas se fornecido deve ser válido
        if (data.phone && data.phone.trim()) {
            const cleanPhone = data.phone.replace(/\D/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                errors.push({
                    field: 'account.phone',
                    message: 'Telefone inválido. Use o formato (11) 99999-9999',
                    value: data.phone
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validação de dados da empresa
    static validateCompanyData(data) {
        const errors = [];

        // Nome da empresa obrigatório
        if (!data.name || !data.name.trim()) {
            errors.push({
                field: 'company.name',
                message: 'Nome da empresa é obrigatório',
                value: data.name
            });
        } else if (data.name.trim().length < 2) {
            errors.push({
                field: 'company.name',
                message: 'Nome da empresa deve ter pelo menos 2 caracteres',
                value: data.name
            });
        }

        // Subdomínio obrigatório e válido
        if (!data.subdomain || !data.subdomain.trim()) {
            errors.push({
                field: 'company.subdomain',
                message: 'Subdomínio é obrigatório',
                value: data.subdomain
            });
        } else if (data.subdomain.trim().length < 3) {
            errors.push({
                field: 'company.subdomain',
                message: 'Subdomínio deve ter pelo menos 3 caracteres',
                value: data.subdomain
            });
        } else if (!/^[a-z0-9-]+$/i.test(data.subdomain)) {
            errors.push({
                field: 'company.subdomain',
                message: 'Subdomínio deve conter apenas letras, números e hífens',
                value: data.subdomain
            });
        }

        // CNPJ opcional, mas se fornecido deve ser válido
        if (data.cnpj && data.cnpj.trim()) {
            const cleanCnpj = data.cnpj.replace(/\D/g, '');
            if (cleanCnpj.length !== 14) {
                errors.push({
                    field: 'company.cnpj',
                    message: 'CNPJ inválido. Deve ter 14 dígitos',
                    value: data.cnpj
                });
            }
        }

        // Email da empresa opcional, mas se fornecido deve ser válido
        if (data.email && data.email.trim()) {
            if (!SignupController.isValidEmail(data.email)) {
                errors.push({
                    field: 'company.email',
                    message: 'Email da empresa inválido. Deve conter @',
                    value: data.email
                });
            }
        }

        // Telefone da empresa opcional, mas se fornecido deve ser válido
        if (data.phone && data.phone.trim()) {
            const cleanPhone = data.phone.replace(/\D/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                errors.push({
                    field: 'company.phone',
                    message: 'Telefone da empresa inválido. Use o formato (11) 3333-3333',
                    value: data.phone
                });
            }
        }

        // Plano deve ser válido
        const validPlans = ['basic', 'pro', 'enterprise'];
        if (data.subscriptionPlan && !validPlans.includes(data.subscriptionPlan)) {
            errors.push({
                field: 'company.subscriptionPlan',
                message: 'Plano inválido. Escolha entre: basic, pro ou enterprise',
                value: data.subscriptionPlan
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Validação de email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.includes('@');
    }

    // Validação de senha
    static isValidPassword(password) {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return hasMinLength && hasUpperCase && hasLowerCase && hasSpecialChar;
    }
}

export default SignupController;