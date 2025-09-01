const express = require('express');
const router = express.Router();
const NotificacionesController = require('../controllers/notificacionesController');
const authenticate = require('../middleware/auth');

// Proteger todas las rutas de notificaciones con autenticación JWT
router.get('/', authenticate(['estudiante', 'empresa']), NotificacionesController.obtenerNotificaciones);
router.get('/conteo-no-leidas', authenticate(['estudiante', 'empresa']), NotificacionesController.obtenerConteoNoLeidas);
router.put('/:id/marcar-leida', authenticate(['estudiante', 'empresa']), NotificacionesController.marcarComoLeida);
router.put('/marcar-todas-leidas', authenticate(['estudiante', 'empresa']), NotificacionesController.marcarTodasComoLeidas);
router.delete('/:id', authenticate(['estudiante', 'empresa']), NotificacionesController.eliminarNotificacion);
router.delete('/limpiar-antiguas', authenticate(['estudiante', 'empresa']), NotificacionesController.limpiarNotificacionesAntiguas);

module.exports = router;
