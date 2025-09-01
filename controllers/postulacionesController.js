const { readDB, writeDB } = require('../utils/dbUtils');
const { enviarEmail, enviarEmailConPlantilla } = require('../utils/emailUtils');

class PostulacionesController {
  // Postularse a una pasantía
  static async postularse(req, res) {
    try {
      const { pasantiaId } = req.body;
      const estudianteId = req.user.id;

      const dbData = readDB();
      if (!dbData.postulaciones) {
        dbData.postulaciones = [];
      }

      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId);

      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      
      // Asegurar que postulaciones existe como array
      if (!pasantia.postulaciones) {
        pasantia.postulaciones = [];
      }
      
      // Verificar si la pasantía está disponible
      if (pasantia.estado !== 'oferta') {
        return res.status(400).json({ message: 'La pasantía no está disponible para postulaciones' });
      }

      // Verificar si ya está postulado
      if (pasantia.postulaciones.some(p => p.estudianteId === estudianteId)) {
        return res.status(400).json({ message: 'Ya te has postulado a esta pasantía' });
      }

      // Agregar postulación
      pasantia.postulaciones.push({
        estudianteId,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
      });

      dbData.pasantias[pasantiaIndex] = pasantia;

      // Obtener datos del estudiante y empresa para notificaciones
      const estudiante = dbData.estudiantes.find(e => e.id === estudianteId);
      const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);

      // Notificar a la empresa usando la plantilla
      if (empresa && estudiante) {
        await enviarEmailConPlantilla(
          empresa.correo,
          'Nueva postulación - Sistema de Pasantías UTN',
          'nuevaPostulacion',
          [pasantia.titulo, estudiante.email, estudiante.legajo]
        );
      }

      writeDB(dbData);
      res.status(201).json({ message: 'Postulación exitosa' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al procesar la postulación' });
    }
  }

  // Aceptar una postulación
  static async aceptarPostulacion(req, res) {
    try {
      const { pasantiaId, estudianteId } = req.params;
      const dbData = readDB();
      
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId && p.empresaId === req.user.id);
      
      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      const postulacion = pasantia.postulaciones.find(p => p.estudianteId === estudianteId);

      if (!postulacion) {
        return res.status(404).json({ message: 'Postulación no encontrada' });
      }

      // Actualizar estado de la postulación y la pasantía
      postulacion.estado = 'aceptada';
      pasantia.estado = 'en_proceso';
      pasantia.estudianteSeleccionado = estudianteId;
      pasantia.fechaInicio = new Date().toISOString();

      // Rechazar otras postulaciones
      pasantia.postulaciones.forEach(p => {
        if (p.estudianteId !== estudianteId) {
          p.estado = 'rechazada';
        }
      });

      dbData.pasantias[pasantiaIndex] = pasantia;

      // Obtener datos del estudiante y empresa para notificaciones
      const estudiante = dbData.estudiantes.find(e => e.id === estudianteId);
      const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);

      // Notificar al estudiante seleccionado
      if (estudiante) {
        await enviarEmail(
          estudiante.email,
          'Tu postulación ha sido aceptada - Sistema de Pasantías UTN',
          `
          <h1>¡Felicitaciones!</h1>
          <p>Tu postulación para la pasantía "${pasantia.titulo}" ha sido aceptada.</p>
          <p>Detalles de la pasantía:</p>
          <ul>
            <li>Empresa: ${empresa ? empresa.nombre : 'N/A'}</li>
            <li>Contacto: ${empresa ? empresa.personaContacto : 'N/A'}</li>
            <li>Email: ${empresa ? empresa.correo : 'N/A'}</li>
            <li>Teléfono: ${empresa ? empresa.telefono : 'N/A'}</li>
          </ul>
          <p>Por favor, contacta a la empresa para coordinar los siguientes pasos.</p>
          `
        );
      }

      // Notificar a estudiantes rechazados
      const estudiantesRechazados = pasantia.postulaciones.filter(p => 
        p.estudianteId !== estudianteId && p.estado === 'rechazada'
      );

      for (const postulacionRechazada of estudiantesRechazados) {
        const estudianteRechazado = dbData.estudiantes.find(e => e.id === postulacionRechazada.estudianteId);
        if (estudianteRechazado) {
          await enviarEmail(
            estudianteRechazado.email,
            'Actualización de postulación - Sistema de Pasantías UTN',
            `
            <h1>Actualización de tu postulación</h1>
            <p>Te informamos que la pasantía "${pasantia.titulo}" ya ha sido asignada a otro candidato.</p>
            <p>Te animamos a seguir buscando otras oportunidades en nuestro sistema.</p>
            <p>¡Gracias por tu interés!</p>
            `
          );
        }
      }

      writeDB(dbData);
      res.json({ message: 'Postulación aceptada exitosamente', pasantia });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al procesar la aceptación de la postulación' });
    }
  }

  // Rechazar una postulación
  static async rechazarPostulacion(req, res) {
    try {
      const { pasantiaId, estudianteId } = req.params;
      const { motivo } = req.body;

      const dbData = readDB();
      
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId && p.empresaId === req.user.id);
      
      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      const postulacion = pasantia.postulaciones.find(p => p.estudianteId === estudianteId);

      if (!postulacion) {
        return res.status(404).json({ message: 'Postulación no encontrada' });
      }

      // Actualizar estado de la postulación
      postulacion.estado = 'rechazada';
      postulacion.motivoRechazo = motivo;
      postulacion.fechaRechazo = new Date().toISOString();

      dbData.pasantias[pasantiaIndex] = pasantia;

      // Notificar al estudiante
      const estudiante = dbData.estudiantes.find(e => e.id === estudianteId);
      if (estudiante) {
        await enviarEmail(
          estudiante.email,
          'Actualización de postulación - Sistema de Pasantías UTN',
          `
          <h1>Actualización de tu postulación</h1>
          <p>Tu postulación para la pasantía "${pasantia.titulo}" no fue seleccionada en esta ocasión.</p>
          ${motivo ? `<p>Motivo: ${motivo}</p>` : ''}
          <p>Te animamos a seguir buscando otras oportunidades en nuestro sistema.</p>
          <p>¡Gracias por tu interés!</p>
          `
        );
      }

      writeDB(dbData);
      res.json({ message: 'Postulación rechazada', pasantia });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al rechazar la postulación' });
    }
  }

  // Obtener postulaciones de un estudiante
  static async obtenerPostulacionesEstudiante(req, res) {
    try {
      const estudianteId = req.user.id;
      const dbData = readDB();
      
      const postulaciones = [];
      
      if (dbData.pasantias) {
        dbData.pasantias.forEach(pasantia => {
          const postulacion = pasantia.postulaciones.find(p => p.estudianteId === estudianteId);
          if (postulacion) {
            const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);
            postulaciones.push({
              ...postulacion,
              pasantia: {
                id: pasantia.id,
                titulo: pasantia.titulo,
                empresa: empresa ? empresa.nombre : 'Empresa no encontrada',
                estado: pasantia.estado,
                carreraSugerida: pasantia.carreraSugerida,
                modalidad: pasantia.modalidad,
                duracionEstimada: pasantia.duracionEstimada,
                areaSector: pasantia.areaSector,
                descripcionTareas: pasantia.descripcionTareas,
                fechaLimitePostulacion: pasantia.fechaLimitePostulacion
              }
            });
          }
        });
      }

      res.json(postulaciones);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las postulaciones' });
    }
  }

  // Obtener postulaciones para las pasantías de una empresa
  static async obtenerPostulacionesEmpresa(req, res) {
    try {
      const empresaId = req.user.id;
      const dbData = readDB();
      
      const pasantiasConPostulaciones = [];
      
      if (dbData.pasantias) {
        const pasantiasEmpresa = dbData.pasantias.filter(p => p.empresaId === empresaId);
        
        pasantiasEmpresa.forEach(pasantia => {
          if (pasantia.postulaciones && pasantia.postulaciones.length > 0) {
            const postulacionesConDatos = pasantia.postulaciones.map(postulacion => {
              const estudiante = dbData.estudiantes.find(e => e.id === postulacion.estudianteId);
              return {
                ...postulacion,
                pasantiaTitulo: pasantia.titulo,
                estudianteNombre: estudiante ? `${estudiante.nombre || ''} ${estudiante.apellido || ''}`.trim() || estudiante.email : 'Estudiante no encontrado',
                estudiante: estudiante ? {
                  id: estudiante.id,
                  email: estudiante.email,
                  legajo: estudiante.legajo,
                  nombre: estudiante.nombre,
                  apellido: estudiante.apellido
                } : null
              };
            });

            pasantiasConPostulaciones.push({
              id: pasantia.id,
              titulo: pasantia.titulo,
              estado: pasantia.estado,
              postulaciones: postulacionesConDatos
            });
          }
        });
      }

      res.json(pasantiasConPostulaciones);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las postulaciones' });
    }
  }

  // Obtener postulaciones resumidas para dashboard de empresa
  static async obtenerPostulacionesResumen(req, res) {
    try {
      const empresaId = req.user.id;
      const dbData = readDB();
      
      const postulacionesResumen = [];
      
      if (dbData.pasantias) {
        const pasantiasEmpresa = dbData.pasantias.filter(p => p.empresaId === empresaId);
        
        pasantiasEmpresa.forEach(pasantia => {
          if (pasantia.postulaciones && pasantia.postulaciones.length > 0) {
            pasantia.postulaciones.forEach(postulacion => {
              const estudiante = dbData.estudiantes.find(e => e.id === postulacion.estudianteId);
              postulacionesResumen.push({
                id: `${pasantia.id}-${postulacion.estudianteId}`,
                pasantiaTitulo: pasantia.titulo,
                estudianteNombre: estudiante ? `${estudiante.nombre || ''} ${estudiante.apellido || ''}`.trim() || estudiante.email : 'Estudiante no encontrado',
                estado: postulacion.estado,
                fecha: postulacion.fecha
              });
            });
          }
        });
      }

      res.json(postulacionesResumen);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las postulaciones' });
    }
  }

  // Cancelar postulación (solo si está pendiente)
  static async cancelarPostulacion(req, res) {
    try {
      const { pasantiaId } = req.params;
      const estudianteId = req.user.id;

      const dbData = readDB();
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId);

      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      const postulacionIndex = pasantia.postulaciones.findIndex(p => p.estudianteId === estudianteId);

      if (postulacionIndex === -1) {
        return res.status(404).json({ message: 'Postulación no encontrada' });
      }

      const postulacion = pasantia.postulaciones[postulacionIndex];

      if (postulacion.estado !== 'pendiente') {
        return res.status(400).json({ message: 'Solo se pueden cancelar postulaciones pendientes' });
      }

      // Eliminar la postulación
      pasantia.postulaciones.splice(postulacionIndex, 1);
      dbData.pasantias[pasantiaIndex] = pasantia;

      writeDB(dbData);
      res.json({ message: 'Postulación cancelada exitosamente' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al cancelar la postulación' });
    }
  }
}

module.exports = PostulacionesController;
