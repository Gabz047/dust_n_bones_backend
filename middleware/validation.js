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

// Schemas para Production Order
export const productionOrderSchemas = {
  create: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      'string.guid': 'ID do projeto deve ser um UUID válido',
      'any.required': 'Projeto é obrigatório'
    }),
    supplierId: Joi.string().uuid().optional().allow(null),
    mainCustomerId: Joi.string().uuid().optional().allow(null),
    type: Joi.string().valid('Normal', 'Reposição').default('Normal'),
    plannedQuantity: Joi.number().integer().min(1).required().messages({
      'number.base': 'Quantidade planejada deve ser um número',
      'number.min': 'Quantidade planejada deve ser no mínimo 1',
      'any.required': 'Quantidade planejada é obrigatória'
    }),
    issueDate: Joi.date().optional(),
    closeDate: Joi.date().optional().allow(null)
  }),

  update: Joi.object({
    projectId: Joi.string().uuid().optional(),
    supplierId: Joi.string().uuid().optional().allow(null),
    mainCustomerId: Joi.string().uuid().optional().allow(null),
    type: Joi.string().valid('Normal', 'Reposição').optional(),
    plannedQuantity: Joi.number().integer().min(1).optional(),
    issueDate: Joi.date().optional(),
    closeDate: Joi.date().optional().allow(null)
  })
};

// Schemas para Production Order Item
export const productionOrderItemSchemas = {
  create: Joi.object({
    productionOrderId: Joi.string().uuid().required().messages({
      'string.guid': 'ID da O.P. deve ser um UUID válido',
      'any.required': 'O.P. é obrigatória'
    }),
    itemId: Joi.string().uuid().required().messages({
      'string.guid': 'ID do item deve ser um UUID válido',
      'any.required': 'Item é obrigatório'
    }),
    itemFeatureId: Joi.string().uuid().optional().allow(null),
    featureOptionId: Joi.string().uuid().optional().allow(null),
    quantity: Joi.number().integer().min(1).required().messages({
      'number.base': 'Quantidade deve ser um número',
      'number.min': 'Quantidade deve ser no mínimo 1',
      'any.required': 'Quantidade é obrigatória'
    })
  }),

  update: Joi.object({
    productionOrderId: Joi.string().uuid().optional(),
    itemId: Joi.string().uuid().optional(),
    itemFeatureId: Joi.string().uuid().optional().allow(null),
    featureOptionId: Joi.string().uuid().optional().allow(null),
    quantity: Joi.number().integer().min(1).optional()
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

// Schemas de validação para Item Feature Option

export const itemFeatureOptionSchemas = {
  create: Joi.object({
    itemFeatureId: Joi.string().uuid().required().messages({
      'any.required': 'ID do ItemFeature é obrigatório',
      'string.guid': 'ID do ItemFeature deve ser um UUID válido'
    }),
    featureOptionId: Joi.string().uuid().required().messages({
      'any.required': 'ID da FeatureOption é obrigatório',
      'string.guid': 'ID da FeatureOption deve ser um UUID válido'
    }),
  }),

  update: Joi.object({
    itemFeatureId: Joi.string().uuid().optional().messages({
      'string.guid': 'ID do ItemFeature deve ser um UUID válido'
    }),
    featureOptionId: Joi.string().uuid().optional().messages({
      'string.guid': 'ID da FeatureOption deve ser um UUID válido'
    }),
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
    logo: Joi.string().uri().allow(null).optional(),
    cnpj: Joi.string().min(14).max(18).allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    phone: Joi.string().min(10).max(15).allow(null).optional(),
    address: Joi.string().allow(null).optional(),
    city: Joi.string().allow(null).optional(),
    state: Joi.string().allow(null).optional(),
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
    logo: Joi.string().uri().allow(null).optional(),
    cnpj: Joi.string().min(14).max(18).allow(null).optional(),
    email: Joi.string().email().allow(null).optional(),
    phone: Joi.string().min(10).max(15).allow(null).optional(),
    address: Joi.string().allow(null).optional(),
    city: Joi.string().allow(null).optional(),
    state: Joi.string().allow(null).optional(),
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

// Schemas de validação para status

export const statusSchemas = {
  create: {
    body: Joi.object({
      userId: Joi.string().uuid().required(),
      orderId: Joi.string().uuid().required(),
      status: Joi.string().valid(
        "Criado",
        "Em produção",
        "Em estoque",
        "Entregue"
      ).required()
    })
  },

  update: {
    body: Joi.object({
      status: Joi.string().valid(
        "Criado",
        "Em produção",
        "Em estoque",
        "Entregue"
      ).optional(),
      userId: Joi.string().uuid().optional(),
      orderId: Joi.string().uuid().optional()
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

export const FeatureSchemas = {
  create: Joi.object({
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

    businessItemType: Joi.string()
      .valid('Confecção', 'Outro')
      .required()
      .messages({
        'any.only': 'Tipo de negócio inválido.',
        'any.required': 'Tipo de negócio é obrigatório.',
      }),

    genre: Joi.when('businessItemType', {
      is: 'Confecção',
      then: Joi.string()
        .valid('Unissex', 'Masculino', 'Feminino')
        .required()
        .messages({
          'any.only': 'Gênero inválido.',
          'any.required': 'Gênero é obrigatório quando o tipo de negócio for Confecção.',
        }),
      otherwise: Joi.string().allow('', null).optional(),
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

    businessItemType: Joi.string()
      .valid('Confecção', 'Outro')
      .optional()
      .messages({
        'any.only': 'Tipo de negócio inválido.',
      }),

    genre: Joi.when('businessItemType', {
      is: 'Confecção',
      then: Joi.string()
        .valid('Unissex', 'Masculino', 'Feminino')
        .required()
        .messages({
          'any.only': 'Gênero inválido.',
          'any.required': 'Gênero é obrigatório quando o tipo de negócio for Confecção.',
        }),
      otherwise: Joi.string().allow('', null).optional(),
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

// Schemas de validação para Expedition

export const expeditionSchemas = {
  create: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),

    mainCustomerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
        'any.required': 'ID do cliente é obrigatório.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  update: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
      }),

    mainCustomerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required() // sempre obrigatório pra log
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  delete: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getByProject: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),
  }),

  getByCustomer: Joi.object({
    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
        'any.required': 'ID do cliente é obrigatório.',
      }),
  }),
};

//Schemas de validação para box

export const boxSchemas = {
  create: Joi.object({
    deliveryNoteId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .allow('', null)
      .messages({
        'string.guid': 'ID da Delivery Note deve ser um UUID válido.',
        
      }),

    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),

    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
        'any.required': 'ID do cliente é obrigatório.',
      }),

    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
        'any.required': 'ID do pedido é obrigatório.',
      }),

    packageId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da embalagem deve ser um UUID válido.',
        'any.required': 'ID da embalagem é obrigatório.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),

    qtdTotal: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Qtd total deve ser um número.',
        'number.integer': 'Qtd total deve ser um número inteiro.',
        'number.min': 'Qtd total não pode ser negativa.',
      }),
  }),

  update: Joi.object({
    deliveryNoteId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .allow('', null)
      .messages({
        'string.guid': 'ID da Delivery Note deve ser um UUID válido.',
      }),

    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
      }),

    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
      }),

    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
      }),

    packageId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da embalagem deve ser um UUID válido.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required() // sempre obrigatório para log
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),

    qtdTotal: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.base': 'Qtd total deve ser um número.',
        'number.integer': 'Qtd total deve ser um número inteiro.',
        'number.min': 'Qtd total não pode ser negativa.',
      }),
  }),

  delete: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getByDeliveryNote: Joi.object({
    deliveryNoteId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da Delivery Note deve ser um UUID válido.',
        'any.required': 'ID da Delivery Note é obrigatório.',
      }),
  }),

  getByProject: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),
  }),

  getByCustomer: Joi.object({
    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
        'any.required': 'ID do cliente é obrigatório.',
      }),
  }),

  getByOrder: Joi.object({
    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
        'any.required': 'ID do pedido é obrigatório.',
      }),
  }),

  getByPackage: Joi.object({
    packageId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da embalagem deve ser um UUID válido.',
        'any.required': 'ID da embalagem é obrigatória.',
      }),
  }),

  getByUser: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getByDate: Joi.object({
    date: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Data deve ser uma data válida.',
        'date.format': 'Data deve estar no formato ISO (YYYY-MM-DD).',
        'any.required': 'Data é obrigatória.',
      }),
  }),
};

// Schemas de validação para Invoice

export const invoiceSchemas = {
  create: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),

    type: Joi.string()
      .valid('entrada', 'saida') // exemplo de tipos, ajustar conforme necessidade
      .required()
      .messages({
        'any.only': 'Tipo de fatura inválido.',
        'any.required': 'Tipo de fatura é obrigatório.',
      }),

    totalPrice: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.base': 'O total da fatura deve ser um número.',
        'number.min': 'O total da fatura não pode ser negativo.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  update: Joi.object({
    totalPrice: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.base': 'O total da fatura deve ser um número.',
        'number.min': 'O total da fatura não pode ser negativo.',
        'any.required': 'O total da fatura é obrigatório.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  delete: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getByProject: Joi.object({
    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
        'any.required': 'ID do projeto é obrigatório.',
      }),
  }),

  getByType: Joi.object({
    type: Joi.string()
      .valid('entrada', 'saida') // ajustar conforme os tipos da sua aplicação
      .required()
      .messages({
        'any.only': 'Tipo de fatura inválido.',
        'any.required': 'Tipo de fatura é obrigatório.',
      }),
  }),
};

// Schemas de validação para InvoiceItem

export const invoiceItemSchemas = {
  createBatch: Joi.object({
    items: Joi.array().items(
      Joi.object({
        invoiceId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .required()
          .messages({
            'string.guid': 'ID da fatura deve ser um UUID válido.',
            'any.required': 'ID da fatura é obrigatório.',
          }),
        deliveryNoteId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .required()
          .messages({
            'string.guid': 'ID do romaneio deve ser um UUID válido.',
            'any.required': 'ID do romaneio é obrigatório.',
          }),
        orderId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .optional()
          .messages({
            'string.guid': 'ID do pedido deve ser um UUID válido.',
          }),
        price: Joi.number()
          .min(0)
          .optional()
          .messages({
            'number.base': 'Preço deve ser um número.',
            'number.min': 'Preço não pode ser negativo.',
          }),
      })
    ).min(1).required()
      .messages({
        'array.base': 'Itens deve ser um array.',
        'array.min': 'É necessário enviar pelo menos um item.',
        'any.required': 'Array de itens é obrigatório.',
      }),
    movementLogEntityId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da movimentação deve ser um UUID válido.',
        'any.required': 'ID da movimentação é obrigatório.',
      }),
  }),

  updateBatch: Joi.object({
    items: Joi.array().items(
      Joi.object({
        id: Joi.string()
          .guid({ version: ['uuidv4'] })
          .required()
          .messages({
            'string.guid': 'ID do item deve ser um UUID válido.',
            'any.required': 'ID do item é obrigatório.',
          }),
        invoiceId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .optional()
          .messages({
            'string.guid': 'ID da fatura deve ser um UUID válido.',
          }),
        deliveryNoteId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .optional()
          .messages({
            'string.guid': 'ID do romaneio deve ser um UUID válido.',
          }),
        orderId: Joi.string()
          .guid({ version: ['uuidv4'] })
          .optional()
          .messages({
            'string.guid': 'ID do pedido deve ser um UUID válido.',
          }),
        price: Joi.number()
          .min(0)
          .optional()
          .messages({
            'number.base': 'Preço deve ser um número.',
            'number.min': 'Preço não pode ser negativo.',
          }),
      })
    ).min(1).required()
      .messages({
        'array.base': 'Itens deve ser um array.',
        'array.min': 'É necessário enviar pelo menos um item.',
        'any.required': 'Array de itens é obrigatório.',
      }),
    movementLogEntityId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da movimentação deve ser um UUID válido.',
        'any.required': 'ID da movimentação é obrigatório.',
      }),
  }),

  deleteBatch: Joi.object({
    ids: Joi.array().items(
      Joi.string().guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do item deve ser um UUID válido.',
          'any.required': 'ID do item é obrigatório.',
        })
    ).min(1).required()
      .messages({
        'array.base': 'IDs deve ser um array.',
        'array.min': 'É necessário enviar pelo menos um ID.',
        'any.required': 'Array de IDs é obrigatório.',
      }),
    movementLogEntityId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da movimentação deve ser um UUID válido.',
        'any.required': 'ID da movimentação é obrigatório.',
      }),
  }),

  getByInvoice: Joi.object({
    invoiceId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da fatura deve ser um UUID válido.',
        'any.required': 'ID da fatura é obrigatório.',
      }),
  }),

  getByDeliveryNote: Joi.object({
    deliveryNoteId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do romaneio deve ser um UUID válido.',
        'any.required': 'ID do romaneio é obrigatório.',
      }),
  }),

  getByOrder: Joi.object({
    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
        'any.required': 'ID do pedido é obrigatório.',
      }),
  }),
};


// Schemas de validação para DeliveryNoteItem

export const DeliveryNoteItemSchemas = {
  // Para criação em lote
  createBatch: Joi.object({
    movementLogEntityId: Joi.string().uuid().required(),
    items: Joi.array().items(
      Joi.object({
        deliveryNoteId: Joi.string().uuid().required(),
        boxId: Joi.string().uuid().required(),
      })
    ).min(1).required()
  }),

  // Para atualização em lote
  updateBatch: Joi.object({
    movementLogEntityId: Joi.string().uuid().required(),
    items: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().required(),
        boxId: Joi.string().uuid().required(),
      })
    ).min(1).required()
  }),

  // Para deleção em lote
  deleteBatch: Joi.object({
    movementLogEntityId: Joi.string().uuid().required(),
    itemIds: Joi.array().items(
      Joi.string().uuid().required()
    ).min(1).required()
  }),
};


// Schemas de validação para Delivery Note

export const deliveryNoteSchemas = {
  create: Joi.object({
    referralId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da referência deve ser um UUID válido.',
      }),

    invoiceId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da fatura deve ser um UUID válido.',
      }),

    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
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
      .messages({
        'string.guid': 'ID da filial deve ser um UUID válido.',
      }),

    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
      }),

    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
      }),

    expeditionId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da expedição deve ser um UUID válido.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  update: Joi.object({
    invoiceId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da fatura deve ser um UUID válido.',
      }),

    projectId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido.',
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
      .messages({
        'string.guid': 'ID da filial deve ser um UUID válido.',
      }),

    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
      }),

    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
      }),

    expeditionId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da expedição deve ser um UUID válido.',
      }),

    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required() // sempre obrigatório pro log
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  delete: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getById: Joi.object({
    id: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do romaneio deve ser um UUID válido.',
        'any.required': 'ID do romaneio é obrigatório.',
      }),
  }),

  getByInvoice: Joi.object({
    invoiceId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da fatura deve ser um UUID válido.',
        'any.required': 'ID da fatura é obrigatório.',
      }),
  }),

  getByCompanyOrBranch: Joi.object({
    companyId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da empresa deve ser um UUID válido.',
      }),

    branchId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .optional()
      .messages({
        'string.guid': 'ID da filial deve ser um UUID válido.',
      }),
  }).or('companyId', 'branchId'),

  getByCustomer: Joi.object({
    customerId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do cliente deve ser um UUID válido.',
        'any.required': 'ID do cliente é obrigatório.',
      }),
  }),

  getByOrder: Joi.object({
    orderId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do pedido deve ser um UUID válido.',
        'any.required': 'ID do pedido é obrigatório.',
      }),
  }),

  getByExpedition: Joi.object({
    expeditionId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da expedição deve ser um UUID válido.',
        'any.required': 'ID da expedição é obrigatório.',
      }),
  }),
};


// Schemas de validação para Box Item

export const boxItemSchemas = {
  createBatch: Joi.array().items(
    Joi.object({
      boxId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do box deve ser um UUID válido.',
          'any.required': 'ID do box é obrigatório.',
        }),

      orderItemId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do OrderItem deve ser um UUID válido.',
          'any.required': 'ID do OrderItem é obrigatório.',
        }),

      itemId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do item deve ser um UUID válido.',
          'any.required': 'ID do item é obrigatório.',
        }),

      itemFeatureId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .optional()
        .messages({
          'string.guid': 'ID da feature deve ser um UUID válido.',
        }),

      featureOptionId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .optional()
        .messages({
          'string.guid': 'ID da opção de feature deve ser um UUID válido.',
        }),

      quantity: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
          'number.base': 'Quantidade deve ser um número.',
          'number.min': 'Quantidade mínima é 1.',
        }),

      userId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do usuário deve ser um UUID válido.',
          'any.required': 'ID do usuário é obrigatório.',
        }),

    })
  ),

  updateBatch: Joi.array().items(
    Joi.object({
      id: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do BoxItem deve ser um UUID válido.',
          'any.required': 'ID do BoxItem é obrigatório.',
        }),

      quantity: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
          'number.base': 'Quantidade deve ser um número.',
          'number.min': 'Quantidade mínima é 1.',
        }),

      userId: Joi.string()
        .guid({ version: ['uuidv4'] })
        .required()
        .messages({
          'string.guid': 'ID do usuário deve ser um UUID válido.',
          'any.required': 'ID do usuário é obrigatório.',
        }),

    })
  ),

  deleteBatch: Joi.object({
    ids: Joi.array()
      .items(Joi.string().guid({ version: ['uuidv4'] }))
      .min(1)
      .required()
      .messages({
        'array.min': 'Deve ser enviado pelo menos 1 ID.',
        'string.guid': 'Cada ID deve ser um UUID válido.',
        'any.required': 'IDs são obrigatórios para exclusão.',
      }),

    
  }),

  getByBox: Joi.object({
    boxId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do box deve ser um UUID válido.',
        'any.required': 'ID do box é obrigatório.',
      }),
  }),

  getByOrderItem: Joi.object({
    orderItemId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do OrderItem deve ser um UUID válido.',
        'any.required': 'ID do OrderItem é obrigatório.',
      }),
  }),

  getByItem: Joi.object({
    itemId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do item deve ser um UUID válido.',
        'any.required': 'ID do item é obrigatório.',
      }),
  }),

  getByFeatureItem: Joi.object({
    itemFeatureId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da feature deve ser um UUID válido.',
        'any.required': 'ID da feature é obrigatório.',
      }),
  }),

  getByFeatureOption: Joi.object({
    featureOptionId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID da opção de feature deve ser um UUID válido.',
        'any.required': 'ID da opção de feature é obrigatório.',
      }),
  }),

  getByUser: Joi.object({
    userId: Joi.string()
      .guid({ version: ['uuidv4'] })
      .required()
      .messages({
        'string.guid': 'ID do usuário deve ser um UUID válido.',
        'any.required': 'ID do usuário é obrigatório.',
      }),
  }),

  getByDate: Joi.object({
    date: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Data deve ser válida.',
        'any.required': 'Data é obrigatória.',
      }),
  }),
};




// Schemas de validação para Package 

const allowedTypes = [
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
];

const allowedMaterials = [
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
];

export const productionOrderStatusSchemas = {
    create: Joi.object({
        status: Joi.string().valid('Aberto', 'Finalizada', 'Parcial').required().messages({
            'any.only': 'Status inválido.',
            'any.required': 'Status é obrigatório.'
        }),
        productionOrderId: Joi.string().uuid().required().messages({
            'string.guid': 'ID da ordem de produção inválido.',
            'any.required': 'ID da ordem de produção é obrigatório.'
        }),
        date: Joi.date().optional().messages({
            'date.base': 'Data inválida.'
        })
    }),

    update: Joi.object({
        status: Joi.string().valid('Aberto', 'Finalizada', 'Parcial').optional().messages({
            'any.only': 'Status inválido.'
        }),
        date: Joi.date().optional().messages({
            'date.base': 'Data inválida.'
        })
    }),
};


export const packageSchemas = {
    create: Joi.object({
        name: Joi.string().min(2).max(255).required().messages({
            'string.base': 'Nome deve ser uma string.',
            'string.empty': 'Nome não pode ser vazio.',
            'string.min': 'Nome deve ter pelo menos 2 caracteres.',
            'string.max': 'Nome deve ter no máximo 255 caracteres.',
            'any.required': 'Nome é obrigatório.'
        }),
        type: Joi.string().valid(...allowedTypes).required().messages({
            'any.only': 'Tipo de embalagem inválido.',
            'any.required': 'Tipo de embalagem é obrigatório.'
        }),
        material: Joi.string().valid(...allowedMaterials).required().messages({
            'any.only': 'Material inválido.',
            'any.required': 'Material é obrigatório.'
        }),
        width: Joi.number().min(0).required().messages({
            'number.base': 'Largura deve ser um número.',
            'number.min': 'Largura não pode ser negativa.',
            'any.required': 'Largura é obrigatória.'
        }),
        height: Joi.number().min(0).required().messages({
            'number.base': 'Altura deve ser um número.',
            'number.min': 'Altura não pode ser negativa.',
            'any.required': 'Altura é obrigatória.'
        }),
        length: Joi.number().min(0).required().messages({
            'number.base': 'Comprimento deve ser um número.',
            'number.min': 'Comprimento não pode ser negativo.',
            'any.required': 'Comprimento é obrigatório.'
        }),
        weight: Joi.number().min(0).required().messages({
            'number.base': 'Peso deve ser um número.',
            'number.min': 'Peso não pode ser negativo.',
            'any.required': 'Peso é obrigatório.'
        }),
    }),

    update: Joi.object({
        name: Joi.string().min(2).max(255).optional().messages({
            'string.base': 'Nome deve ser uma string.',
            'string.empty': 'Nome não pode ser vazio.',
            'string.min': 'Nome deve ter pelo menos 2 caracteres.',
            'string.max': 'Nome deve ter no máximo 255 caracteres.',
        }),
        type: Joi.string().valid(...allowedTypes).optional().messages({
            'any.only': 'Tipo de embalagem inválido.',
        }),
        material: Joi.string().valid(...allowedMaterials).optional().messages({
            'any.only': 'Material inválido.',
        }),
        width: Joi.number().min(0).optional().messages({
            'number.base': 'Largura deve ser um número.',
            'number.min': 'Largura não pode ser negativa.',
        }),
        height: Joi.number().min(0).optional().messages({
            'number.base': 'Altura deve ser um número.',
            'number.min': 'Altura não pode ser negativa.',
        }),
        length: Joi.number().min(0).optional().messages({
            'number.base': 'Comprimento deve ser um número.',
            'number.min': 'Comprimento não pode ser negativo.',
        }),
        weight: Joi.number().min(0).optional().messages({
            'number.base': 'Peso deve ser um número.',
            'number.min': 'Peso não pode ser negativo.',
        }),
    }),
};

// Schema para FeatureOption
export const featureOptionSchema = {
  create: Joi.object({
    featureId: Joi.string().uuid().required().messages({
      'string.base': 'ID da característica deve ser uma string.',
      'string.empty': 'ID da característica não pode ser vazio.',
      'string.guid': 'ID da característica deve ser um UUID válido.',
      'any.required': 'ID da característica é obrigatório.'
    }),
    name: Joi.string().min(1).max(255).required().messages({
      'string.base': 'Nome deve ser uma string.',
      'string.empty': 'Nome não pode ser vazio.',
      'string.min': 'Nome deve ter pelo menos 1 caractere.',
      'string.max': 'Nome deve ter no máximo 255 caracteres.',
      'any.required': 'Nome é obrigatório.'
    })
  }),

  update: Joi.object({
    featureId: Joi.string().uuid().optional().messages({
      'string.base': 'ID da característica deve ser uma string.',
      'string.guid': 'ID da característica deve ser um UUID válido.'
    }),
    name: Joi.string().min(1).max(255).optional().messages({
      'string.base': 'Nome deve ser uma string.',
      'string.min': 'Nome deve ter pelo menos 1 caractere.',
      'string.max': 'Nome deve ter no máximo 255 caracteres.'
    })
  })
};

// Schema para ItemFeature (relacionamento item-característica)
export const itemFeatureSchema = {
  create: Joi.object({
    itemId: Joi.string().uuid().required().messages({
      'string.base': 'ID do item deve ser uma string.',
      'string.empty': 'ID do item não pode ser vazio.',
      'string.guid': 'ID do item deve ser um UUID válido.',
      'any.required': 'ID do item é obrigatório.'
    }),
    featureId: Joi.string().uuid().required().messages({
      'string.base': 'ID da característica deve ser uma string.',
      'string.empty': 'ID da característica não pode ser vazio.',
      'string.guid': 'ID da característica deve ser um UUID válido.',
      'any.required': 'ID da característica é obrigatório.'
    })
  }),

  update: Joi.object({
    itemId: Joi.string().uuid().optional().messages({
      'string.base': 'ID do item deve ser uma string.',
      'string.guid': 'ID do item deve ser um UUID válido.'
    }),
    featureId: Joi.string().uuid().optional().messages({
      'string.base': 'ID da característica deve ser uma string.',
      'string.guid': 'ID da característica deve ser um UUID válido.'
    })
  })
};

// Schemas de validação para Project

export const projectSchema = {
  create: Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
      'string.base': 'O nome do projeto deve ser um texto.',
      'string.empty': 'O nome do projeto não pode ser vazio.',
      'string.min': 'O nome do projeto deve ter no mínimo {#limit} caracteres.',
      'string.max': 'O nome do projeto deve ter no máximo {#limit} caracteres.',
      'any.required': 'O nome do projeto é obrigatório.'
    }),
    customerId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID do cliente deve ser uma string.',
      'string.guid': 'O ID do cliente deve ser um UUID válido.'
    }),
    companyId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID da empresa deve ser uma string.',
      'string.guid': 'O ID da empresa deve ser um UUID válido.'
    }),
    branchId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID da filial deve ser uma string.',
      'string.guid': 'O ID da filial deve ser um UUID válido.'
    }),
    totalQuantity: Joi.number().min(0).optional().messages({
      'number.base': 'A quantidade total deve ser um número.',
      'number.min': 'A quantidade total não pode ser negativa.'
    })
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(100).optional().messages({
      'string.base': 'O nome do projeto deve ser um texto.',
      'string.min': 'O nome do projeto deve ter no mínimo {#limit} caracteres.',
      'string.max': 'O nome do projeto deve ter no máximo {#limit} caracteres.'
    }),
    customerId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID do cliente deve ser uma string.',
      'string.guid': 'O ID do cliente deve ser um UUID válido.'
    }),
    companyId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID da empresa deve ser uma string.',
      'string.guid': 'O ID da empresa deve ser um UUID válido.'
    }),
    branchId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID da filial deve ser uma string.',
      'string.guid': 'O ID da filial deve ser um UUID válido.'
    }),
    totalQuantity: Joi.number().min(0).optional().messages({
      'number.base': 'A quantidade total deve ser um número.',
      'number.min': 'A quantidade total não pode ser negativa.'
    })
  })
};

// Schema de validação para project item

export const projectItemSchemas = {
  create: {
    body: Joi.object({
      projectId: Joi.string().uuid().required(),
      itemId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).default(1)
    })
  },
  update: {
    body: Joi.object({
      projectId: Joi.string().uuid().required(),
      itemId: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).default(1)
    })
  }
};



// Schemas de validação para Order

export const orderSchema = {
  create: Joi.object({
    projectId: Joi.string().uuid().required().messages({
      'string.base': 'O ID do projeto deve ser uma string.',
      'string.guid': 'O ID do projeto deve ser um UUID válido.',
      'any.required': 'O ID do projeto é obrigatório.'
    }),
    customerId: Joi.string().uuid().required().messages({
      'string.base': 'O ID do cliente deve ser uma string.',
      'string.guid': 'O ID do cliente deve ser um UUID válido.',
      'any.required': 'O ID do cliente é obrigatório.'
    }),
    deliveryDate: Joi.date().required().messages({'any.required': 'Data de entrega é obrigatório'})
  }),

  update: Joi.object({
    projectId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID do projeto deve ser uma string.',
      'string.guid': 'O ID do projeto deve ser um UUID válido.'
    }),
    customerId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID do cliente deve ser uma string.',
      'string.guid': 'O ID do cliente deve ser um UUID válido.'
    }),
    deliveryDate: Joi.date().required().messages({'any.required': 'Data de entrega é obrigatório'})
  })
};

// Schemas de validação para Order Item

export const orderItemSchema = {
  create: Joi.object({
    orderId: Joi.string().uuid().required().messages({
      'string.base': 'O ID do pedido deve ser uma string.',
      'string.guid': 'O ID do pedido deve ser um UUID válido.',
      'any.required': 'O ID do pedido é obrigatório.'
    }),
    itemId: Joi.string().uuid().required().messages({
      'string.base': 'O ID do item deve ser uma string.',
      'string.guid': 'O ID do item deve ser um UUID válido.',
      'any.required': 'O ID do item é obrigatório.'
    }),
    itemFeatureId: Joi.string().uuid().optional().allow(null).messages({
      'string.base': 'O ID da feature do item deve ser uma string.',
      'string.guid': 'O ID da feature do item deve ser um UUID válido.'
    }),
    featureOptionId: Joi.string().uuid().required().messages({
      'string.base': 'O ID da opção de feature deve ser uma string.',
      'string.guid': 'O ID da opção de feature deve ser um UUID válido.',
      'any.required': 'O ID da opção de feature é obrigatório.'
    }),
    quantity: Joi.number().integer().min(1).required().messages({
      'number.base': 'A quantidade deve ser um número.',
      'number.integer': 'A quantidade deve ser um número inteiro.',
      'number.min': 'A quantidade mínima é {#limit}.',
      'any.required': 'A quantidade é obrigatória.'
    })
  }),

  update: Joi.object({
    itemId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID do item deve ser uma string.',
      'string.guid': 'O ID do item deve ser um UUID válido.'
    }),
    itemFeatureId: Joi.string().uuid().optional().allow(null).messages({
      'string.base': 'O ID da feature do item deve ser uma string.',
      'string.guid': 'O ID da feature do item deve ser um UUID válido.'
    }),
    featureOptionId: Joi.string().uuid().optional().messages({
      'string.base': 'O ID da opção de feature deve ser uma string.',
      'string.guid': 'O ID da opção de feature deve ser um UUID válido.'
    }),
    quantity: Joi.number().integer().min(1).optional().messages({
      'number.base': 'A quantidade deve ser um número.',
      'number.integer': 'A quantidade deve ser um número inteiro.',
      'number.min': 'A quantidade mínima é {#limit}.'
    })
  })
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
        role: Joi.string().valid('owner', 'administrative', 'manager', 'expedition').default('expedition'),
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