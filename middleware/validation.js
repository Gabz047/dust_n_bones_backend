import Joi from 'joi';

export const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }))
            });
        }
        next();
    };
};

// Schemas de validação
export const accountSchemas = {
    create: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email deve ter um formato válido',
            'any.required': 'Email é obrigatório'
        }),
        username: Joi.string().min(3).max(50).optional(),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Password deve ter pelo menos 6 caracteres',
            'any.required': 'Password é obrigatório'
        }),
        role: Joi.string().valid('owner', 'manager', 'employee').default('owner'),
        accountType: Joi.string().valid('client', 'admin').default('client')
    }),

    update: Joi.object({
        email: Joi.string().email().optional(),
        username: Joi.string().min(3).max(50).optional(),
        password: Joi.string().min(6).optional(),
        role: Joi.string().valid('owner', 'manager', 'employee').optional(),
        accountType: Joi.string().valid('client', 'admin').optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    })
};

// Schemas de validação para Company
export const companySchemas = {
    create: Joi.object({
        name: Joi.string().min(2).max(255).required().messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 255 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        subdomain: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required().messages({
            'string.min': 'Subdomínio deve ter pelo menos 3 caracteres',
            'string.max': 'Subdomínio deve ter no máximo 50 caracteres',
            'string.pattern.base': 'Subdomínio deve conter apenas letras minúsculas, números e hífens',
            'any.required': 'Subdomínio é obrigatório'
        }),
        logo: Joi.string().uri().allow(null).optional(),
        cnpj: Joi.string().min(14).max(18).allow(null).optional(),
        email: Joi.string().email().allow(null).optional(),
        phone: Joi.string().min(10).max(15).allow(null).optional(),
        address: Joi.string().allow(null).optional(),
        city: Joi.string().allow(null).optional(),
        state: Joi.string().length(2).allow(null).optional(),
        zipCode: Joi.string().max(10).allow(null).optional(),
        country: Joi.string().default('Brasil'),
        website: Joi.string().uri().allow(null).optional(),
        description: Joi.string().allow(null).optional(),
        subscriptionPlan: Joi.string().valid('basic', 'professional', 'enterprise').default('basic').messages({
            'any.only': 'Plano deve ser: basic, professional ou enterprise'
        }),
        maxUsers: Joi.number().integer().min(1).default(5)
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(255).optional(),
        subdomain: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).optional(),
        logo: Joi.string().uri().allow(null).optional(),
        cnpj: Joi.string().min(14).max(18).allow(null).optional(),
        email: Joi.string().email().allow(null).optional(),
        phone: Joi.string().min(10).max(15).allow(null).optional(),
        address: Joi.string().allow(null).optional(),
        city: Joi.string().allow(null).optional(),
        state: Joi.string().length(2).allow(null).optional(),
        zipCode: Joi.string().max(10).allow(null).optional(),
        country: Joi.string().optional(),
        website: Joi.string().uri().allow(null).optional(),
        description: Joi.string().allow(null).optional(),
        subscriptionPlan: Joi.string().valid('basic', 'professional', 'enterprise').optional().messages({
            'any.only': 'Plano deve ser: basic, professional ou enterprise'
        }),
        maxUsers: Joi.number().integer().min(1).optional(),
        active: Joi.boolean().optional()
    })
};

// Schemas de validação para Branch

export const branchSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 255 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    subdomain: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required().messages({
      'string.min': 'Subdomínio deve ter pelo menos 3 caracteres',
      'string.max': 'Subdomínio deve ter no máximo 50 caracteres',
      'string.pattern.base': 'Subdomínio deve conter apenas letras minúsculas, números e hífens',
      'any.required': 'Subdomínio é obrigatório'
    }),
    logo: Joi.string().uri().allow(null).optional(),
    cnpj: Joi.string().min(14).max(18).allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    phone: Joi.string().min(10).max(15).allow(null).optional(),
    address: Joi.string().allow(null).optional(),
    city: Joi.string().allow(null).optional(),
    state: Joi.string().length(2).allow(null).optional(),
    zipCode: Joi.string().max(10).allow(null).optional(),
    country: Joi.string().default('Brasil'),
    website: Joi.string().uri().allow(null).optional(),
    description: Joi.string().allow(null).optional(),
    maxUsers: Joi.number().integer().min(1).default(5),
    ownerId: Joi.string().uuid().required().messages({
      'any.required': 'ID do proprietário é obrigatório',
      'string.guid': 'ID do proprietário deve ser um UUID válido'
    }),
    companyId: Joi.string().uuid().required().messages({
      'any.required': 'ID da empresa é obrigatório',
      'string.guid': 'ID da empresa deve ser um UUID válido'
    }),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    subdomain: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).optional(),
    logo: Joi.string().uri().allow(null).optional(),
    cnpj: Joi.string().min(14).max(18).allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    phone: Joi.string().min(10).max(15).allow(null).optional(),
    address: Joi.string().allow(null).optional(),
    city: Joi.string().allow(null).optional(),
    state: Joi.string().length(2).allow(null).optional(),
    zipCode: Joi.string().max(10).allow(null).optional(),
    country: Joi.string().optional(),
    website: Joi.string().uri().allow(null).optional(),
    description: Joi.string().allow(null).optional(),
    maxUsers: Joi.number().integer().min(1).optional(),
    ownerId: Joi.string().uuid().optional(),
    companyId: Joi.string().uuid().optional(),
    active: Joi.boolean().optional()
  })
};

// Schemas de validação para UserBranch

export const userBranchSchemas = {
  create: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.guid': 'userId deve ser um UUID válido',
      'any.required': 'userId é obrigatório',
    }),
    branchId: Joi.string().uuid().required().messages({
      'string.guid': 'branchId deve ser um UUID válido',
      'any.required': 'branchId é obrigatório',
    }),
    dataJoined: Joi.date().optional().messages({
      'date.base': 'dataJoined deve ser uma data válida',
    }),
  }),

  update: Joi.object({
    branchId: Joi.string().uuid().optional().messages({
      'string.guid': 'branchId deve ser um UUID válido',
    }),
    dataJoined: Joi.date().optional().messages({
      'date.base': 'dataJoined deve ser uma data válida',
    }),
  }),
};

// Schema de validação para customer

export const customerSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().required(),
      document: Joi.string().min(11).max(18).allow(null, ''),
      email: Joi.string().email().required(),
      phone: Joi.string().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().default('Brasil'),
      customerGroup: Joi.string().uuid().optional()  // <-- adiciona aqui
    })
  },
  update: {
    body: Joi.object({
      name: Joi.string(),
      document: Joi.string().min(11).max(18).allow(null, ''),
      email: Joi.string().email(),
      phone: Joi.string(),
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string(),
      customerGroup: Joi.string().uuid().optional()  // <-- e aqui
    })
  }
};

// Schemas de validação para customerGroup

export const customerGroupSchemas = {
  create: {
    body: Joi.object({
      mainCustomer: Joi.string().uuid().required()
    })
  },
  updateCustomers: {
    body: Joi.object({
      customerIds: Joi.array().items(Joi.string().uuid()).required()
    })
  },
  updateMainCustomer: {
    body: Joi.object({
      mainCustomerId: Joi.string().uuid().required()
    })
  }
};

// Schemas de validação para CompanySettings
export const companySettingsSchemas = {
    update: Joi.object({
        timezone: Joi.string().optional(),
        language: Joi.string().valid('pt-BR', 'en-US', 'es-ES').optional(),
        currency: Joi.string().length(3).optional(),
        dateFormat: Joi.string().valid('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD').optional(),
        timeFormat: Joi.string().valid('12h', '24h').optional(),
        numberFormat: Joi.string().valid('1.234,56', '1,234.56', '1 234,56').optional(),
        firstDayOfWeek: Joi.number().integer().min(0).max(6).optional(),
        fiscalYearStart: Joi.string().pattern(/^\d{2}-\d{2}$/).optional(),
        taxRate: Joi.number().min(0).max(100).optional(),
        enableNotifications: Joi.boolean().optional(),
        enableEmailReports: Joi.boolean().optional(),
        backupFrequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
        maxFileSize: Joi.number().integer().min(1024).optional(),
        allowedFileTypes: Joi.array().items(Joi.string()).optional()
    })
};

// Schemas de validação para CompanyCustomize
export const companyCustomizeSchemas = {
    update: Joi.object({
        primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        textColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        accentColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        warningColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        errorColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        successColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
        logoUrl: Joi.string().uri().allow(null).optional(),
        darkLogoUrl: Joi.string().uri().allow(null).optional(),
        faviconUrl: Joi.string().uri().allow(null).optional(),
        fontFamily: Joi.string().optional(),
        fontSize: Joi.string().optional(),
        borderRadius: Joi.string().optional(),
        sidebarStyle: Joi.string().valid('light', 'dark', 'colored').optional(),
        headerStyle: Joi.string().valid('light', 'dark', 'colored').optional(),
        theme: Joi.string().valid('light', 'dark', 'auto').optional(),
        customCss: Joi.string().allow(null).optional(),
        customJs: Joi.string().allow(null).optional(),
        showCompanyLogo: Joi.boolean().optional(),
        showCompanyName: Joi.boolean().optional(),
        compactMode: Joi.boolean().optional()
    })
};


// Schemas de validação para Caracteristica do item

export const itemFeatureSchemas = {
  create: Joi.object({
    itemId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do item deve ser um UUID válido.',
        'any.required': 'ID do item é obrigatório.',
      }),
    name: Joi.string()
      .min(2)
      .max(255)
      .required()
      .messages({
        'string.base': 'Nome deve ser uma string.',
        'string.empty': 'Nome não pode ser vazio.',
        'string.min': 'Nome deve ter pelo menos 2 caracteres.',
        'string.max': 'Nome deve ter no máximo 255 caracteres.',
        'any.required': 'Nome da característica é obrigatório.',
      }),
    options: Joi.array()
      .items(Joi.string())
      .optional()
      .allow(null)
      .messages({
        'array.base': 'Opções devem ser um array de strings.',
        'string.base': 'Cada opção deve ser uma string.',
      }),
  }),

  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(255)
      .optional()
      .messages({
        'string.base': 'Nome deve ser uma string.',
        'string.empty': 'Nome não pode ser vazio.',
        'string.min': 'Nome deve ter pelo menos 2 caracteres.',
        'string.max': 'Nome deve ter no máximo 255 caracteres.',
      }),
    options: Joi.array()
      .items(Joi.string())
      .optional()
      .allow(null)
      .messages({
        'array.base': 'Opções devem ser um array de strings.',
        'string.base': 'Cada opção deve ser uma string.',
      }),
  }),
};

// Schemas de validação para Item

export const itemSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.base': 'Nome deve ser uma string.',
        'string.empty': 'Nome não pode ser vazio.',
        'string.min': 'Nome deve ter pelo menos 3 caracteres.',
        'string.max': 'Nome deve ter no máximo 100 caracteres.',
        'any.required': 'Nome é obrigatório.',
      }),
    description: Joi.string()
      .max(500)
      .allow('', null)
      .optional()
      .messages({
        'string.base': 'Descrição deve ser uma string.',
        'string.max': 'Descrição deve ter no máximo 500 caracteres.',
      }),
    measurementUnit: Joi.string()
      .valid(
        'kg', 'g', 'mg', 'l', 'ml', 'un', 'm', 'cm', 'mm',
        'm2', 'm3', 'pa', 'dz', 'pct', 'rol', 'cx', 'fl', 'ton'
      )
      .required()
      .messages({
        'any.only': 'Unidade de medida inválida.',
        'any.required': 'Unidade de medida é obrigatória.',
      }),
    itemType: Joi.string()
      .valid('Matérias-primas', 'Produtos em processo', 'Produto Acabado')
      .required()
      .messages({
        'any.only': 'Tipo de item inválido.',
        'any.required': 'Tipo de item é obrigatório.',
      }),
    weight: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'Peso deve ser um número.',
        'number.min': 'Peso não pode ser negativo.',
        'any.required': 'Peso é obrigatório.',
      }),
    price: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'Preço deve ser um número.',
        'number.min': 'Preço não pode ser negativo.',
        'any.required': 'Preço é obrigatório.',
      }),
    minStock: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'Estoque mínimo deve ser um número inteiro.',
        'number.min': 'Estoque mínimo não pode ser negativo.',
        'any.required': 'Estoque mínimo é obrigatório.',
      }),
    maxStock: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'Estoque máximo deve ser um número inteiro.',
        'number.min': 'Estoque máximo não pode ser negativo.',
        'any.required': 'Estoque máximo é obrigatório.',
      }),
    companyId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da empresa deve ser um UUID válido.',
        'any.required': 'ID da empresa é obrigatório.',
      }),
    branchId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .allow(null)
      .messages({
        'string.guid': 'ID da filial deve ser um UUID válido.',
      }),
  }),

  update: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .optional()
      .messages({
        'string.base': 'Nome deve ser uma string.',
        'string.empty': 'Nome não pode ser vazio.',
        'string.min': 'Nome deve ter pelo menos 3 caracteres.',
        'string.max': 'Nome deve ter no máximo 100 caracteres.',
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .allow('', null)
      .messages({
        'string.base': 'Descrição deve ser uma string.',
        'string.max': 'Descrição deve ter no máximo 500 caracteres.',
      }),
    measurementUnit: Joi.string()
      .valid(
        'kg', 'g', 'mg', 'l', 'ml', 'un', 'm', 'cm', 'mm',
        'm2', 'm3', 'pa', 'dz', 'pct', 'rol', 'cx', 'fl', 'ton'
      )
      .optional()
      .messages({
        'any.only': 'Unidade de medida inválida.',
      }),
    itemType: Joi.string()
      .valid('Matérias-primas', 'Produtos em processo', 'Produto Acabado')
      .optional()
      .messages({
        'any.only': 'Tipo de item inválido.',
      }),
    weight: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Peso deve ser um número.',
        'number.min': 'Peso não pode ser negativo.',
      }),
    price: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Preço deve ser um número.',
        'number.min': 'Preço não pode ser negativo.',
      }),
    minStock: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Estoque mínimo deve ser um número inteiro.',
        'number.min': 'Estoque mínimo não pode ser negativo.',
      }),
    maxStock: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Estoque máximo deve ser um número inteiro.',
        'number.min': 'Estoque máximo não pode ser negativo.',
      }),
    companyId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da empresa deve ser um UUID válido.',
      }),
    branchId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .allow(null)
      .messages({
        'string.guid': 'ID da filial deve ser um UUID válido.',
      }),
  }),
};

// Schemas de validação para User
export const userSchemas = {
    create: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email deve ter um formato válido',
            'any.required': 'Email é obrigatório'
        }),
        username: Joi.string().min(3).max(50).optional(),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Password deve ter pelo menos 6 caracteres',
            'any.required': 'Password é obrigatório'
        }),
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().min(10).max(15).optional(),
        avatar: Joi.string().uri().optional(),
        role: Joi.string().valid('owner', 'admin', 'manager', 'employee', 'viewer').default('employee'),
        permissions: Joi.array().items(Joi.string()).default([])
    }),

    update: Joi.object({
        email: Joi.string().email().optional(),
        username: Joi.string().min(3).max(50).optional(),
        password: Joi.string().min(6).optional(),
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().min(10).max(15).optional(),
        avatar: Joi.string().uri().optional(),
        role: Joi.string().valid('owner', 'admin', 'manager', 'employee', 'viewer').optional(),
        permissions: Joi.array().items(Joi.string()).optional(),
        active: Joi.boolean().optional()
    }),

    login: Joi.object({
        email: Joi.string().email().optional().messages({
            'string.email': 'Email deve ter um formato válido'
        }),
        username: Joi.string().min(3).max(50).optional().messages({
            'string.min': 'Username deve ter pelo menos 3 caracteres',
            'string.max': 'Username deve ter no máximo 50 caracteres'
        }),
        password: Joi.string().required().messages({
            'any.required': 'Senha é obrigatória'
        })
    }).or('email', 'username').messages({
        'object.missing': 'Email ou username é obrigatório'
    }),

    updateProfile: Joi.object({
        email: Joi.string().email().optional(),
        username: Joi.string().min(3).max(50).optional(),
        password: Joi.string().min(6).optional(),
        firstName: Joi.string().min(2).max(50).optional(),
        lastName: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().min(10).max(15).optional(),
        avatar: Joi.string().uri().optional()
    })
};

// Schema de validação para signup completo (Account + Company)
export const signupSchema = Joi.object({
    account: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email deve ter um formato válido',
            'any.required': 'Email é obrigatório'
        }),
        firstName: Joi.string().min(2).max(50).required().messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 50 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        lastName: Joi.string().min(2).max(50).required().messages({
            'string.min': 'Sobrenome deve ter pelo menos 2 caracteres',
            'string.max': 'Sobrenome deve ter no máximo 50 caracteres',
            'any.required': 'Sobrenome é obrigatório'
        }),
        username: Joi.string().min(3).max(50).allow(null).optional(),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Senha deve ter pelo menos 6 caracteres',
            'any.required': 'Senha é obrigatória'
        }),
        phone: Joi.string().min(10).max(15).allow(null).optional()
    }).required().messages({
        'any.required': 'Dados da conta são obrigatórios'
    }),
    
    company: Joi.object({
        companyName: Joi.string().min(2).max(100).required().messages({
            'string.min': 'Nome da empresa deve ter pelo menos 2 caracteres',
            'string.max': 'Nome da empresa deve ter no máximo 100 caracteres',
            'any.required': 'Nome da empresa é obrigatório'
        }),
        subdomain: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required().messages({
            'string.min': 'Subdomínio deve ter pelo menos 3 caracteres',
            'string.max': 'Subdomínio deve ter no máximo 50 caracteres',
            'string.pattern.base': 'Subdomínio deve conter apenas letras minúsculas, números e hífens',
            'any.required': 'Subdomínio é obrigatório'
        }),
        cnpj: Joi.string().pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).allow(null).optional().messages({
            'string.pattern.base': 'CNPJ deve ter o formato 00.000.000/0000-00'
        }),
        companyEmail: Joi.string().email().required().messages({
            'string.email': 'Email da empresa deve ter um formato válido',
            'any.required': 'Email da empresa é obrigatório'
        }),
        companyPhone: Joi.string().min(10).max(15).required().messages({
            'string.min': 'Telefone da empresa deve ter pelo menos 10 caracteres',
            'string.max': 'Telefone da empresa deve ter no máximo 15 caracteres',
            'any.required': 'Telefone da empresa é obrigatório'
        }),
        website: Joi.string().uri().allow(null).optional().messages({
            'string.uri': 'Website deve ser uma URL válida'
        }),
        address: Joi.string().max(500).allow(null).optional(),
        plan: Joi.string().valid('basic', 'professional', 'enterprise').default('basic').messages({
            'any.only': 'Plano deve ser: basic, professional ou enterprise'
        })
    }).required().messages({
        'any.required': 'Dados da empresa são obrigatórios'
    })


});