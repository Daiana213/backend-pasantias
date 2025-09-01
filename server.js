require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });

const EnvValidator = require('./config/validateEnv');
EnvValidator.validateAndShowSummary();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const pasantiasRoutes = require('./routes/pasantiasRoutes');
const postulacionesRoutes = require('./routes/postulacionesRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');

const app = express();

// Configuración básica
const CONFIG = {
  port: process.env.PORT || 3000,
  email: {
    user: process.env.EMAIL_USER
  },
  isProduction: process.env.NODE_ENV === 'production'
};

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Security middleware - Helmet para headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Permitir carga de recursos externos
}));

// Rate limiting global
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: CONFIG.isProduction ? 100 : 1000, // Límite por IP
  message: {
    error: 'Demasiadas solicitudes, inténtalo de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Rate limiting específico para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: CONFIG.isProduction ? 5 : 50, // Más restrictivo para auth
  message: {
    error: 'Demasiados intentos de autenticación, inténtalo de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS dinámico por entorno
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = CONFIG.isProduction 
      ? [FRONTEND_URL]
      : [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080']; // Más permisivo en desarrollo
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: false, // No usamos cookies, solo JWT en headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight por 24 horas
};

app.use(cors(corsOptions));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas principales con rate limiting específico
app.use('/api/auth', authLimiter, authRoutes); // Rate limiting aplicado a todas las rutas de auth
app.use('/api/pasantias', pasantiasRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Iniciar servidor
app.listen(CONFIG.port, () => {
  console.log(`Servidor corriendo en http://localhost:${CONFIG.port}`);
  console.log(`Email configurado: ${CONFIG.email.user}`);
  console.log(`CORS habilitado para: ${FRONTEND_URL}`);
  console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});
