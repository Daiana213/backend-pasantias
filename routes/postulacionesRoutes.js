const express = require('express');
const router = express.Router();
const PostulacionesController = require('../controllers/postulacionesController');
const authenticate = require('../middleware/auth');

// Rutas para estudiantes
router.post('/', authenticate(['estudiante']), PostulacionesController.postularse);
router.get('/mis-postulaciones', authenticate(['estudiante']), PostulacionesController.obtenerPostulacionesEstudiante);
router.delete('/:pasantiaId', authenticate(['estudiante']), PostulacionesController.cancelarPostulacion);

// Rutas para empresas
router.get('/empresa', authenticate(['empresa']), PostulacionesController.obtenerPostulacionesEmpresa);
router.get('/empresa/postulaciones', authenticate(['empresa']), PostulacionesController.obtenerPostulacionesEmpresa);

module.exports = router;
