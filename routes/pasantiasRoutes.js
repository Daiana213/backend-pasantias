const express = require('express');
const router = express.Router();
const PasantiasController = require('../controllers/pasantiasController');
const PostulacionesController = require('../controllers/postulacionesController');
const authenticate = require('../middleware/auth');

// Rutas públicas (sin autenticación)
router.get('/', PasantiasController.obtenerPasantiasDisponibles);

// Rutas para empresas (requieren autenticación de empresa)
router.post('/', authenticate(['empresa']), PasantiasController.crearPasantia);
router.get('/empresa', authenticate(['empresa']), PasantiasController.obtenerPasantiasEmpresa);
router.get('/empresa/mis-pasantias', authenticate(['empresa']), PasantiasController.obtenerPasantiasEmpresa);

// Rutas con parámetros (deben ir después de las rutas específicas)
router.get('/:id', PasantiasController.obtenerPasantiaPorId);
router.put('/:id', authenticate(['empresa']), PasantiasController.actualizarPasantia);
router.delete('/:id', authenticate(['empresa']), PasantiasController.eliminarPasantia);
router.post('/:id/retirar', authenticate(['empresa']), PasantiasController.retirarOferta);

// Rutas para gestionar postulaciones (empresas)
router.put('/:pasantiaId/aceptar/:estudianteId', 
  authenticate(['empresa']), 
  PostulacionesController.aceptarPostulacion
);
router.put('/:pasantiaId/rechazar/:estudianteId', 
  authenticate(['empresa']), 
  PostulacionesController.rechazarPostulacion
);

// Rutas de administración (SAU)
router.get('/:id/aprobar', PasantiasController.aprobarPasantia);
router.post('/:id/rechazar', authenticate(['sau']), PasantiasController.rechazarPasantia);

module.exports = router;
