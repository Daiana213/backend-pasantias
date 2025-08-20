const express = require('express');
const router = express.Router();
const NotificacionesController = require('../controllers/notificacionesController');

// Todas las rutas de notificaciones manejan su propia autenticación
router.get('/', NotificacionesController.obtenerNotificaciones);
router.get('/conteo-no-leidas', NotificacionesController.obtenerConteoNoLeidas);
router.put('/:id/marcar-leida', NotificacionesController.marcarComoLeida);
router.put('/marcar-todas-leidas', NotificacionesController.marcarTodasComoLeidas);
router.delete('/:id', NotificacionesController.eliminarNotificacion);
router.delete('/limpiar-antiguas', NotificacionesController.limpiarNotificacionesAntiguas);

module.exports = router;
