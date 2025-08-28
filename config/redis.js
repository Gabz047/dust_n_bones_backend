import { createClient } from 'redis';

// Configuração do cliente Redis com validações
const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 0,
  
  // Configurações de retry e timeout
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        console.error('❌ Muitas tentativas de reconexão Redis - parando');
        return new Error('Muitas tentativas de reconexão');
      }
      console.log(`🔄 Tentativa de reconexão Redis #${retries + 1}`);
      return Math.min(retries * 100, 3000); // Delay progressivo até 3s
    },
    connectTimeout: 10000, // 10 segundos
    commandTimeout: 5000,  // 5 segundos por comando
    lazyConnect: true,
  },
  
  // Configurações específicas se usando URL
  ...(process.env.REDIS_URL && {
    url: process.env.REDIS_URL
  })
};

const redisClient = createClient(redisConfig);

// Event handlers melhorados
redisClient.on('error', (err) => {
  console.error('❌ Erro no Redis:', err.message);
  
  // Log detalhado baseado no tipo de erro
  if (err.code === 'ECONNREFUSED') {
    console.error('💡 Redis não está rodando ou porta incorreta');
  } else if (err.code === 'NOAUTH') {
    console.error('💡 Falha na autenticação - verifique REDIS_PASSWORD');
  } else if (err.code === 'WRONGPASS') {
    console.error('💡 Senha do Redis incorreta');
  }
});

redisClient.on('connect', () => {
  console.log('🔄 Conectando ao Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Conectado ao Redis');
  
  // Log das configurações em modo desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log(`📍 Redis Host: ${redisConfig.host}:${redisConfig.port}`);
    console.log(`🗄️  Database: ${redisConfig.database}`);
    console.log(`🔐 Autenticação: ${redisConfig.password ? 'Ativa' : 'Desativada'}`);
  }
});

redisClient.on('end', () => {
  console.log('📴 Conexão com Redis encerrada');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Reconectando ao Redis...');
});

// Função para verificar saúde do Redis
export async function checkRedisHealth() {
  try {
    const start = Date.now();
    const result = await redisClient.ping();
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency,
      response: result,
      connected: redisClient.isReady
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connected: redisClient.isReady
    };
  }
}

// Funções utilitárias para cache com tratamento de erro melhorado
export class RedisCache {
  // Verificar se Redis está disponível
  static isAvailable() {
    return redisClient.isReady;
  }

  static async get(key) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️  Redis não disponível - pulando cache GET');
        return null;
      }
      
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Erro ao buscar '${key}' no Redis:`, error.message);
      return null;
    }
  }

  static async set(key, value, ttl = 3600) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️  Redis não disponível - pulando cache SET');
        return false;
      }
      
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 Cache salvo: ${key} (TTL: ${ttl}s)`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Erro ao salvar '${key}' no Redis:`, error.message);
      return false;
    }
  }

  static async del(key) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️  Redis não disponível - pulando cache DELETE');
        return false;
      }
      
      const result = await redisClient.del(key);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️  Cache removido: ${key}`);
      }
      
      return result > 0;
    } catch (error) {
      console.error(`❌ Erro ao deletar '${key}' do Redis:`, error.message);
      return false;
    }
  }

  static async exists(key) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Erro ao verificar existência de '${key}':`, error.message);
      return false;
    }
  }

  // Função para limpar cache por padrão
  static async clearPattern(pattern) {
    try {
      if (!this.isAvailable()) {
        console.warn('⚠️  Redis não disponível - pulando limpeza de padrão');
        return 0;
      }
      
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await redisClient.del(keys);
      console.log(`🧹 Removidas ${result} chaves com padrão: ${pattern}`);
      return result;
    } catch (error) {
      console.error(`❌ Erro ao limpar padrão '${pattern}':`, error.message);
      return 0;
    }
  }

  // Obter estatísticas do cache
  static async getStats() {
    try {
      if (!this.isAvailable()) {
        return { available: false };
      }
      
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      
      return {
        available: true,
        memory: info,
        keyspace: keyspace,
        connected: redisClient.isReady
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas do Redis:', error.message);
      return { available: false, error: error.message };
    }
  }

  // Funções específicas para tenants
  static async getTenantData(subdomain) {
    return await this.get(`tenant:${subdomain}`);
  }

  static async setTenantData(subdomain, data, ttl = 86400) { // 24 horas
    return await this.set(`tenant:${subdomain}`, data, ttl);
  }

  // Cache de usuários
  static async getUserData(userId, tenantId) {
    return await this.get(`user:${tenantId}:${userId}`);
  }

  static async setUserData(userId, tenantId, data, ttl = 3600) { // 1 hora
    return await this.set(`user:${tenantId}:${userId}`, data, ttl);
  }

  // Cache de sessões
  static async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  static async setSession(sessionId, data, ttl = 86400) { // 24 horas
    return await this.set(`session:${sessionId}`, data, ttl);
  }

  static async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }
}

export { redisClient };
