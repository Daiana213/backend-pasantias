const { readDB, writeDB } = require('../utils/dbUtils');
const Notificacion = require('../models/Notificacion');

class NotificacionesController {
  // Obtener notificaciones de un usuario
  static async obtenerNotificaciones(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const dbData = readDB();
      
      // Asegurarse de que existe la colección de notificaciones
      if (!dbData.notificaciones) {
        dbData.notificaciones = [];
      }

      // Buscar el usuario (empresa o estudiante) por el token
      const empresa = dbData.empresas.find(e => e.token === token);
      const estudiante = dbData.estudiantes.find(e => e.token === token);
      const usuario = empresa || estudiante;

      if (!usuario) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      // Filtrar notificaciones para el usuario específico
      const notificacionesUsuario = dbData.notificaciones.filter(n => 
        n.usuarioId === usuario.id && 
        n.tipo === (empresa ? 'empresa' : 'estudiante')
      );

      // Ordenar por fecha (más recientes primero)
      notificacionesUsuario.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

      res.json(notificacionesUsuario);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las notificaciones' });
    }
  }

  // Marcar notificación como leída
  static async marcarComoLeida(req, res) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const dbData = readDB();
      
      // Buscar el usuario
      const empresa = dbData.empresas.find(e => e.token === token);
      const estudiante = dbData.estudiantes.find(e => e.token === token);
      const usuario = empresa || estudiante;

      if (!usuario) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      // Buscar y actualizar la notificación
      const notificacionIndex = dbData.notificaciones.findIndex(n => 
        n.id === id && 
        n.usuarioId === usuario.id && 
        n.tipo === (empresa ? 'empresa' : 'estudiante')
      );

      if (notificacionIndex === -1) {
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }

      dbData.notificaciones[notificacionIndex].leida = true;
      writeDB(dbData);

      res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al marcar la notificación como leída' });
    }
  }

  // Marcar todas las notificaciones como leídas
  static async marcarTodasComoLeidas(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const dbData = readDB();
      
      // Buscar el usuario
      const empresa = dbData.empresas.find(e => e.token === token);
      const estudiante = dbData.estudiantes.find(e => e.token === token);
      const usuario = empresa || estudiante;

      if (!usuario) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      // Marcar todas las notificaciones del usuario como leídas
      let notificacionesActualizadas = 0;
      dbData.notificaciones.forEach(notificacion => {
        if (notificacion.usuarioId === usuario.id && 
            notificacion.tipo === (empresa ? 'empresa' : 'estudiante') && 
            !notificacion.leida) {
          notificacion.leida = true;
          notificacionesActualizadas++;
        }
      });

      writeDB(dbData);

      res.json({ 
        message: `${notificacionesActualizadas} notificaciones marcadas como leídas` 
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al marcar las notificaciones como leídas' });
    }
  }

  // Eliminar notificación
  static async eliminarNotificacion(req, res) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const dbData = readDB();
      
      // Buscar el usuario
      const empresa = dbData.empresas.find(e => e.token === token);
      const estudiante = dbData.estudiantes.find(e => e.token === token);
      const usuario = empresa || estudiante;

      if (!usuario) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      // Buscar y eliminar la notificación
      const notificacionIndex = dbData.notificaciones.findIndex(n => 
        n.id === id && 
        n.usuarioId === usuario.id && 
        n.tipo === (empresa ? 'empresa' : 'estudiante')
      );

      if (notificacionIndex === -1) {
        return res.status(404).json({ message: 'Notificación no encontrada' });
      }

      dbData.notificaciones.splice(notificacionIndex, 1);
      writeDB(dbData);

      res.json({ message: 'Notificación eliminada' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al eliminar la notificación' });
    }
  }

  // Obtener conteo de notificaciones no leídas
  static async obtenerConteoNoLeidas(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const dbData = readDB();
      
      // Buscar el usuario
      const empresa = dbData.empresas.find(e => e.token === token);
      const estudiante = dbData.estudiantes.find(e => e.token === token);
      const usuario = empresa || estudiante;

      if (!usuario) {
        return res.status(401).json({ message: 'Usuario no encontrado' });
      }

      // Contar notificaciones no leídas
      const conteoNoLeidas = dbData.notificaciones ? 
        dbData.notificaciones.filter(n => 
          n.usuarioId === usuario.id && 
          n.tipo === (empresa ? 'empresa' : 'estudiante') && 
          !n.leida
        ).length : 0;

      res.json({ conteoNoLeidas });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener el conteo de notificaciones' });
    }
  }

  // Crear notificación (método interno para usar desde otros controladores)
  static async crearNotificacion(usuarioId, tipo, titulo, mensaje, relatedId = null, relatedType = null) {
    try {
      const nuevaNotificacion = new Notificacion({
        usuarioId,
        tipo,
        titulo,
        mensaje,
        relatedId,
        relatedType
      });

      const dbData = readDB();
      if (!dbData.notificaciones) {
        dbData.notificaciones = [];
      }

      dbData.notificaciones.push(nuevaNotificacion);
      writeDB(dbData);

      return nuevaNotificacion;
    } catch (error) {
      console.error('Error al crear notificación:', error);
      throw error;
    }
  }

  // Limpiar notificaciones antiguas (más de 30 días)
  static async limpiarNotificacionesAntiguas(req, res) {
    try {
      const dbData = readDB();
      
      if (!dbData.notificaciones) {
        return res.json({ message: 'No hay notificaciones para limpiar' });
      }

      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);

      const notificacionesIniciales = dbData.notificaciones.length;
      dbData.notificaciones = dbData.notificaciones.filter(n => 
        new Date(n.fechaCreacion) > fechaLimite
      );

      const notificacionesEliminadas = notificacionesIniciales - dbData.notificaciones.length;

      if (notificacionesEliminadas > 0) {
        writeDB(dbData);
      }

      res.json({ 
        message: `${notificacionesEliminadas} notificaciones antiguas eliminadas` 
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al limpiar notificaciones antiguas' });
    }
  }
}

module.exports = NotificacionesController;
