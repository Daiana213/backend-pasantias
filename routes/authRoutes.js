const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// Rutas de registro
router.post('/registro-estudiante', AuthController.registroEstudiante);
router.post('/registro-empresa', AuthController.registroEmpresa);

// Rutas de login
router.post('/login-estudiante', AuthController.loginEstudiante);
router.post('/login-empresa', AuthController.loginEmpresa);

// Ruta para aprobar registros (desde enlaces de email)
router.get('/aprobar-registro/:id', AuthController.aprobarRegistro);

// Rutas de perfil y configuración - Estudiantes
router.get('/perfil-estudiante', authenticate(['estudiante']), AuthController.obtenerPerfilEstudiante);
router.put('/actualizar-perfil-estudiante', authenticate(['estudiante']), AuthController.actualizarPerfilEstudiante);
router.put('/actualizar-configuraciones', authenticate(['estudiante', 'empresa']), AuthController.actualizarConfiguraciones);
router.put('/cambiar-password', authenticate(['estudiante', 'empresa']), AuthController.cambiarPassword);

// Rutas de perfil y configuración - Empresas
router.get('/perfil-empresa', authenticate(['empresa']), AuthController.obtenerPerfilEmpresa);
router.put('/actualizar-perfil-empresa', authenticate(['empresa']), AuthController.actualizarPerfilEmpresa);

// Tokens
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', authenticate(['estudiante', 'empresa']), AuthController.logout);

module.exports = router;
