const { readDB, writeDB } = require('../utils/dbUtils');
const { enviarEmail, enviarEmailConPlantilla } = require('../utils/emailUtils');
const Pasantia = require('../models/Pasantia');

const CONFIG = {
  email: {
    user: process.env.EMAIL_USER
  }
};

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';

class PasantiasController {
  // Crear nueva oferta de pasantía
  static async crearPasantia(req, res) {
    try {
      console.log('Datos recibidos en crearPasantia:', JSON.stringify(req.body, null, 2));
      console.log('Usuario autenticado:', req.user);
      
      const empresaId = req.user.id;
      const datosConEmpresaId = {
        ...req.body,
        empresaId
      };
      
      console.log('Datos a validar:', JSON.stringify(datosConEmpresaId, null, 2));
      
      // Validar datos
      const validation = Pasantia.validate(datosConEmpresaId);
      console.log('Resultado de validación:', validation);
      
      if (!validation.isValid) {
        console.log('Errores de validación específicos:', validation.errors);
        return res.status(400).json({
          message: 'Datos de la pasantía inválidos',
          errors: validation.errors
        });
      }

      // Crear nueva pasantía
      const nuevaPasantia = new Pasantia({
        ...req.body,
        empresaId
      });

      const dbData = readDB();
      if (!dbData.pasantias) {
        dbData.pasantias = [];
      }
      dbData.pasantias.push(nuevaPasantia);

      // Notificar al SAU sobre la nueva oferta usando la plantilla
      await enviarEmailConPlantilla(
        CONFIG.email.user,
        'Nueva oferta de pasantía para revisar - Sistema de Pasantías UTN',
        'nuevaOferta',
        [
          req.user.nombre || req.user.correo || 'Empresa',
          nuevaPasantia.titulo,
          nuevaPasantia.carreraSugerida,
          nuevaPasantia.areaSector || 'No especificada',
          nuevaPasantia.id
        ]
      // El resto de la información se maneja dentro de la plantilla
      );

      writeDB(dbData);
      res.status(201).json({
        message: 'Oferta de pasantía creada exitosamente. Pendiente de revisión por SAU.',
        pasantia: nuevaPasantia
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al crear la oferta de pasantía' });
    }
  }

  // Obtener todas las pasantías disponibles (para estudiantes)
  static async obtenerPasantiasDisponibles(req, res) {
    try {
      const dbData = readDB();
      const pasantias = dbData.pasantias || [];
      const pasantiasDisponibles = pasantias.filter(p => p.estado === 'oferta');
      res.json(pasantiasDisponibles);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las pasantías' });
    }
  }

  // Obtener pasantías de una empresa específica
  static async obtenerPasantiasEmpresa(req, res) {
    try {
      const dbData = readDB();
      const pasantiasEmpresa = dbData.pasantias ? 
        dbData.pasantias.filter(p => p.empresaId === req.user.id) : [];
      res.json(pasantiasEmpresa);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener las pasantías de la empresa' });
    }
  }

  // Obtener una pasantía específica por ID
  static async obtenerPasantiaPorId(req, res) {
    try {
      const { id } = req.params;
      const dbData = readDB();
      const pasantia = dbData.pasantias?.find(p => p.id === id);

      if (!pasantia) {
        return res.status(404).json({ message: 'Pasantía no encontrada' });
      }

      res.json(pasantia);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener la pasantía' });
    }
  }

  // Aprobar oferta de pasantía (desde enlace de email)
  static async aprobarPasantia(req, res) {
    try {
      const { id } = req.params;
      const dbData = readDB();
      
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === id);
      if (pasantiaIndex === -1) {
        return res.status(404).send('<h1>Error: Oferta de pasantía no encontrada</h1>');
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      pasantia.estado = 'oferta';
      pasantia.fechaAprobacion = new Date().toISOString();
      
      // Notificar a la empresa
      const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);
      if (empresa) {
        await enviarEmail(
          empresa.correo,
          'Oferta de pasantía aprobada - Sistema de Pasantías UTN',
          `
          <h1>¡Tu oferta de pasantía ha sido aprobada!</h1>
          <p>La oferta "${pasantia.titulo}" ha sido revisada y aprobada por el SAU.</p>
          <p>La oferta ya está publicada y visible para los estudiantes.</p>
          `
        );
      }

      dbData.pasantias[pasantiaIndex] = pasantia;
      writeDB(dbData);

      // Responder con página HTML de confirmación
      res.send(`
        <html>
          <head>
            <title>Pasantía Aprobada</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
              .success { color: #4CAF50; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">¡Pasantía Aprobada Exitosamente!</h1>
              <p>La oferta de pasantía "${pasantia.titulo}" ha sido aprobada y ahora está visible para los estudiantes.</p>
              <p>Puede cerrar esta ventana.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('<h1>Error al aprobar la oferta de pasantía</h1>');
    }
  }

  // Rechazar oferta de pasantía
  static async rechazarPasantia(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      if (!motivo) {
        return res.status(400).json({ message: 'El motivo de rechazo es requerido' });
      }

      const dbData = readDB();
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === id);
      
      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Oferta de pasantía no encontrada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];
      pasantia.estado = 'rechazada';
      pasantia.fechaRechazo = new Date().toISOString();
      pasantia.motivoRechazo = motivo;

      // Notificar a la empresa
      const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);
      if (empresa) {
        await enviarEmail(
          empresa.correo,
          'Oferta de pasantía rechazada - Sistema de Pasantías UTN',
          `
          <h1>Tu oferta de pasantía requiere modificaciones</h1>
          <p>La oferta "${pasantia.titulo}" ha sido revisada por el SAU y requiere las siguientes modificaciones:</p>
          <p>${motivo}</p>
          <p>Por favor, realiza los cambios necesarios y vuelve a enviar la oferta.</p>
          `
        );
      }

      dbData.pasantias[pasantiaIndex] = pasantia;
      writeDB(dbData);

      res.json({
        message: 'Oferta de pasantía rechazada',
        pasantia
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al rechazar la oferta de pasantía' });
    }
  }

  // Actualizar pasantía
  static async actualizarPasantia(req, res) {
    try {
      const { id } = req.params;
      const empresaId = req.user.id;

      const dbData = readDB();
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === id && p.empresaId === empresaId);

      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada o no autorizada' });
      }

      // Validar datos
      const validation = Pasantia.validate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Datos de la pasantía inválidos',
          errors: validation.errors
        });
      }

      // Actualizar pasantía
      const pasantiaActualizada = {
        ...dbData.pasantias[pasantiaIndex],
        ...req.body,
        id, // Mantener el ID original
        empresaId, // Mantener el empresaId original
        fechaActualizacion: new Date().toISOString()
      };

      dbData.pasantias[pasantiaIndex] = pasantiaActualizada;
      writeDB(dbData);

      res.json({
        message: 'Pasantía actualizada exitosamente',
        pasantia: pasantiaActualizada
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al actualizar la pasantía' });
    }
  }

  // Eliminar pasantía (solo si no tiene postulaciones)
  static async eliminarPasantia(req, res) {
    try {
      const { id } = req.params;
      const empresaId = req.user.id;

      const dbData = readDB();
      const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === id && p.empresaId === empresaId);

      if (pasantiaIndex === -1) {
        return res.status(404).json({ message: 'Pasantía no encontrada o no autorizada' });
      }

      const pasantia = dbData.pasantias[pasantiaIndex];

      // Verificar si tiene postulaciones
      if (pasantia.postulaciones && pasantia.postulaciones.length > 0) {
        return res.status(400).json({ 
          message: 'No se puede eliminar una pasantía que tiene postulaciones' 
        });
      }

      // Eliminar la pasantía
      dbData.pasantias.splice(pasantiaIndex, 1);
      writeDB(dbData);

      res.json({ message: 'Pasantía eliminada exitosamente' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al eliminar la pasantía' });
    }
  }
}

module.exports = PasantiasController;
