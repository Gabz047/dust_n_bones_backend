import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Connect } from './config/database.js';
import { sequelize } from './models/index.js';
import routes from './routes/index.js';
import { redisClient } from './config/redis.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(cookieParser());

app.use(helmet());

const corsOptions = {
  origin: (origin, callback) => {
    
    if (!origin) return callback(null, true);
    const isEstoquellogiaSubdomain = /^https?:\/\/([a-zA-Z0-9-]+\.)?estoquelogia\.com(:\d+)?$/.test(origin);
    const additionalAllowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://zecatutorial.localhost:3001', 'http://acme.localhost:3001', 'http://ventura.localhost:3001','http://venturas.localhost:3001','http://venturaquari.localhost:3001'];
    if (isEstoquellogiaSubdomain || additionalAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Não permitido pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  exposedHeaders: ['Authorization'],
};

app.use(cors(corsOptions));

// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
//   message: {
//     success: false,
//     message: 'Muitas requisições. Tente novamente mais tarde.'
//   }
// });

// app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api', routes);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const startServer = async () => {
  try {
    // Conecta Redis
    await redisClient.connect();
    console.log('✅ Redis conectado');

    // Conecta banco
    await Connect();

    if (process.env.NODE_ENV === 'development') {
      // await sequelize.sync({ alter: false });
      await sequelize.authenticate()
      console.log('✅ Modelos sincronizados com o banco de dados');
    }

    // Inicia servidor só após conexões OK
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📖 Documentação da API: http://localhost:${PORT}/api`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando servidor...');
  await sequelize.close();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando servidor...');
  await sequelize.close();
  await redisClient.disconnect();
  process.exit(0);
});

startServer();

export default app;
