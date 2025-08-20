require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const pasantiasRoutes = require('./routes/pasantiasRoutes');
const postulacionesRoutes = require('./routes/postulacionesRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');

// Importar utilidades para rutas de debug
const { readDB } = require('./utils/dbUtils');

const app = express();

// Configuración básica
const CONFIG = {
  port: process.env.PORT || 3000,
  email: {
    user: process.env.EMAIL_USER
  }
};

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware global
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/pasantias', pasantiasRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ruta temporal para verificar datos (¡Eliminar en producción!)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/db', (req, res) => {
    try {
      const dbData = readDB();
      res.json(dbData);
    } catch (error) {
      res.status(500).json({ error: 'Error al leer la base de datos' });
    }
  });
}

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Iniciar servidor
app.listen(CONFIG.port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${CONFIG.port}`);
  console.log(`📧 Email configurado: ${CONFIG.email.user}`);
  console.log(`🌐 CORS habilitado para: ${FRONTEND_URL}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
});
