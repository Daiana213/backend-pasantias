const express = require('express');
const cors = require('cors');
const path = require('path');
const authenticate = require('./middleware/auth');
const { readDB, writeDB } = require('./utils/dbUtils');
const { enviarEmail } = require('./utils/emailUtils');
const tokenUtils = require('./utils/tokenUtils');
const app = express();

// Configuración básica
const CONFIG = {
  port: process.env.PORT || 3000
};

const API_URL = 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de Autenticación
app.post('/api/auth/registro-estudiante', async (req, res) => {
  try {
    const { email, legajo, password } = req.body;
    const dbData = readDB();
    
    if (dbData.estudiantes?.some(e => e.email === email)) {
      return res.status(400).json({ message: 'Email ya registrado' });
    }

    const nuevoEstudiante = {
      id: Date.now().toString(),
      email,
      legajo,
      password,
      role: 'estudiante',
      estadoValidacion: false,
      fechaRegistro: new Date().toISOString()
    };

    dbData.estudiantes.push(nuevoEstudiante);

    // Notificar al estudiante
    await enviarEmail(
      email,
      'Registro exitoso - Sistema de Pasantías UTN',
      `
      <h1>¡Gracias por registrarte!</h1>
      <p>Tu solicitud de registro ha sido recibida y está siendo procesada.</p>
      <p>Datos de registro:</p>
      <ul>
        <li>Legajo: ${legajo}</li>
        <li>Email: ${email}</li>
      </ul>
      `
    );

    // Notificar al administrador
    await enviarEmail(
      CONFIG.email.user,
      'Nueva solicitud de registro de estudiante',
      `
      <h1>Nueva solicitud de registro</h1>
      <p>Se ha recibido una nueva solicitud de registro:</p>
      <ul>
        <li>Legajo: ${legajo}</li>
        <li>Email: ${email}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${API_URL}/api/auth/aprobar-registro/${nuevoEstudiante.id}?tipo=estudiante&aprobar=true" 
           style="background-color: #4CAF50; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block;
                  font-family: Arial, sans-serif;
                  font-size: 16px;
                  margin: 10px 0;">
          Aprobar Registro
        </a>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Haz clic en el botón para aprobar este registro de estudiante.
      </p>
      `
    );

    writeDB(dbData);
    res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar el registro' });
  }
});

app.post('/api/auth/registro-empresa', async (req, res) => {
  try {
    const { nombre, correo, personaContacto, telefono, direccion, contraseña } = req.body;
    const dbData = readDB();

    if (dbData.empresas?.some(e => e.correo === correo)) {
      return res.status(400).json({ message: 'Correo ya registrado' });
    }

    const nuevaEmpresa = {
      id: Date.now().toString(),
      nombre,
      correo,
      personaContacto,
      telefono,
      direccion,
      contraseña,
      role: 'empresa',
      estadoValidacion: false,
      fechaRegistro: new Date().toISOString()
    };

    dbData.empresas.push(nuevaEmpresa);

    // Notificar a la empresa
    await enviarEmail(
      correo,
      'Registro exitoso - Sistema de Pasantías UTN',
      `
      <h1>¡Gracias por registrar tu empresa!</h1>
      <p>Tu solicitud de registro ha sido recibida y está siendo procesada.</p>
      <p>Datos de registro:</p>
      <ul>
        <li>Empresa: ${nombre}</li>
        <li>Email: ${correo}</li>
      </ul>
      `
    );

    // Notificar al administrador
    await enviarEmail(
      CONFIG.email.user,
      'Nueva solicitud de registro de empresa',
      `
      <h1>Nueva solicitud de registro de empresa</h1>
      <p>Se ha recibido una nueva solicitud de registro:</p>
      <ul>
        <li>Empresa: ${nombre}</li>
        <li>Email: ${correo}</li>
        <li>Contacto: ${personaContacto}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <div style="margin-top: 20px; text-align: center;">
          <a href="${API_URL}/api/auth/aprobar-registro/${nuevaEmpresa.id}?tipo=empresa&aprobar=true" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    display: inline-block;
                    font-family: Arial, sans-serif;
                    font-size: 16px;
                    margin: 10px 0;">
            Aprobar Registro
          </a>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Haz clic en el botón para aprobar este registro de empresa.
        </p>
        `
    );

    writeDB(dbData);
    res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al registrar empresa' });
  }
});

// En la ruta de login de estudiante
app.post('/api/auth/login-estudiante', async (req, res) => {
  try {
    const { legajo, password } = req.body;
    const dbData = readDB();
    
    const estudiante = dbData.estudiantes.find(u => 
      u.legajo === legajo && 
      u.password === password
    );

    if (!estudiante) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!estudiante.estadoValidacion) {
      return res.status(403).json({ message: 'Tu cuenta está pendiente de verificación' });
    }

    const token = tokenUtils.generate(estudiante.id, 'estudiante');
    estudiante.token = token;
    writeDB(dbData);

    res.json({
      ok: true,
      id: estudiante.id,
      email: estudiante.email,
      legajo: estudiante.legajo,
      role: estudiante.role,
      token: token
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/login-empresa', async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const dbData = readDB();
    
    const empresa = dbData.empresas.find(u => 
      u.correo === correo && 
      u.contraseña === contraseña
    );

    if (!empresa) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!empresa.estadoValidacion) {
      return res.status(403).json({ message: 'Tu cuenta está pendiente de verificación' });
    }

    const token = tokenUtils.generate(empresa.id, 'empresa');
    empresa.token = token;
    writeDB(dbData);

    res.json({
      ok: true,
      id: empresa.id,
      correo: empresa.correo,
      role: empresa.role,
      token: token
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

app.post('/api/pasantias', authenticate(['empresa']), async (req, res) => {
  try {
    const { 
      titulo,
      carreraSugerida,
      areaSector,
      descripcionTareas,
      requisitos,
      duracionEstimada,
      cargaHorariaSemanal,
      horarioPropuesto,
      tipoJornada,
      modalidad,
      fechaInicioEstimada,
      fechaLimitePostulacion,
      observacionesAdicionales 
    } = req.body;
    const empresaId = req.empresa.id;

    // Validaciones de campos requeridos
    const camposRequeridos = [
      'titulo',
      'carreraSugerida',
      'areaSector',
      'descripcionTareas',
      'requisitos',
      'duracionEstimada',
      'cargaHorariaSemanal',
      'horarioPropuesto',
      'tipoJornada',
      'modalidad',
      'fechaInicioEstimada',
      'fechaLimitePostulacion'
    ];

    const camposFaltantes = camposRequeridos.filter(campo => !req.body[campo]);
    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        message: 'Campos requeridos faltantes',
        campos: camposFaltantes
      });
    }

    const nuevaPasantia = {
      id: Date.now().toString(),
      empresaId,
      titulo,
      carreraSugerida,
      areaSector,
      descripcionTareas,
      requisitos,
      duracionEstimada,
      cargaHorariaSemanal,
      horarioPropuesto,
      tipoJornada,
      modalidad,
      fechaInicioEstimada,
      fechaLimitePostulacion,
      observacionesAdicionales,
      estado: 'pendiente_sau', // Estado inicial pendiente de revisión
      fechaCreacion: new Date().toISOString(),
      postulaciones: []
    };

    const dbData = readDB();
    if (!dbData.pasantias) {
      dbData.pasantias = [];
    }
    dbData.pasantias.push(nuevaPasantia);

    // Notificar al SAU sobre la nueva oferta
    await enviarEmail(
      CONFIG.email.user,
      'Nueva oferta de pasantía para revisar - Sistema de Pasantías UTN',
      `
      <h1>Nueva oferta de pasantía para revisar</h1>
      <p>Se ha recibido una nueva oferta de pasantía:</p>
      <ul>
        <li>Empresa: ${req.empresa.nombre}</li>
        <li>Título: ${titulo}</li>
        <li>Carrera: ${carreraSugerida}</li>
        <li>Área: ${areaSector}</li>
      </ul>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${API_URL}/api/pasantias/${nuevaPasantia.id}/aprobar" 
           style="background-color: #4CAF50; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block;
                  margin: 10px;">Aprobar Oferta</a>
        <a href="${API_URL}/api/pasantias/${nuevaPasantia.id}/rechazar" 
           style="background-color: #f44336; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block;
                  margin: 10px;">Rechazar Oferta</a>
      </div>
      `
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
});

// Obtener todas las pasantías (para estudiantes)
app.get('/api/pasantias', async (req, res) => {
  try {
    const dbData = readDB();
    const pasantias = dbData.pasantias || [];
    const pasantiasDisponibles = pasantias.filter(p => p.estado === 'oferta');
    res.json(pasantiasDisponibles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las pasantías' });
  }
});

app.get('/api/postulaciones/empresa', authenticate(['empresa']), (req, res) => {
  try {
    const dbData = readDB();
    
    // Obtener todas las pasantías de la empresa
    const pasantiasEmpresa = dbData.pasantias ? dbData.pasantias.filter(p => p.empresaId === req.empresa.id) : [];
    
    // Extraer las postulaciones de cada pasantía
    const postulaciones = [];
    pasantiasEmpresa.forEach(pasantia => {
      if (pasantia.postulaciones && pasantia.postulaciones.length > 0) {
        pasantia.postulaciones.forEach(postulacion => {
          // Buscar información del estudiante
          const estudiante = dbData.estudiantes.find(e => e.id === postulacion.estudianteId);
          if (estudiante) {
            postulaciones.push({
              id: `${pasantia.id}-${postulacion.estudianteId}`,
              pasantiaId: pasantia.id,
              pasantiaTitulo: pasantia.titulo,
              estudianteId: postulacion.estudianteId,
              estudianteNombre: estudiante.nombre || estudiante.email,
              fecha: postulacion.fecha,
              estado: postulacion.estado
            });
          }
        });
      }
    });
    
    res.json(postulaciones);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener las postulaciones' });
  }
});
// Middleware de autenticación para estudiantes
const autenticarEstudiante = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  const dbData = utils.readDB();
  const estudiante = dbData.estudiantes.find(e => e.token === token);

  if (!estudiante) {
    return res.status(401).json({ message: 'Token inválido o estudiante no encontrado' });
  }

  req.estudiante = estudiante;
  next();
};

// Postularse a una pasantía
app.post('/api/postulaciones', autenticarEstudiante, async (req, res) => {
  try {
    const { pasantiaId } = req.body;
    const estudianteId = req.estudiante.id;

    const dbData = utils.readDB();
    if (!dbData.postulaciones) {
      dbData.postulaciones = [];
    }

    const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId);

    if (pasantiaIndex === -1) {
      return res.status(404).json({ message: 'Pasantía no encontrada' });
    }

    const pasantia = dbData.pasantias[pasantiaIndex];
    
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
    writeDB(dbData);

    res.status(201).json({ message: 'Postulación exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar la postulación' });
  }
});

// Aceptar una postulación
app.post('/api/pasantias/:pasantiaId/postulaciones/:estudianteId/aceptar', authenticate(['empresa']), async (req, res) => {
  try {
    const { pasantiaId, estudianteId } = req.params;
    const dbData = readDB();
    
    const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId && p.empresaId === req.empresa.id);
    
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
    writeDB(dbData);

    // Notificar al estudiante
    const estudiante = dbData.estudiantes.find(e => e.id === estudianteId);
    if (estudiante) {
      await utils.enviarEmail(
        estudiante.email,
        'Tu postulación ha sido aceptada - Sistema de Pasantías UTN',
        `
        <h1>¡Felicitaciones!</h1>
        <p>Tu postulación para la pasantía "${pasantia.titulo}" ha sido aceptada.</p>
        <p>Por favor, contacta a la empresa para coordinar los siguientes pasos.</p>
        `
      );
    }

    res.json({ message: 'Postulación aceptada exitosamente', pasantia });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la aceptación de la postulación' });
  }
});

// Ruta para obtener notificaciones
app.get('/api/notificaciones', (req, res) => {
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

    res.json(notificacionesUsuario);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener las notificaciones' });
  }
});

// Remove the entire notifications endpoint (lines 532-565)
app.get('/api/postulaciones/empresa', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const dbData = utils.readDB();
    // Aquí deberías implementar la lógica para obtener las postulaciones
    // específicas de la empresa basándote en su ID o información del token
    
    // Por ahora, devolvemos un array vacío como ejemplo
    res.json([]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener las postulaciones' });
  }
});


// Postularse a una pasantía
app.post('/api/postulaciones', autenticarEstudiante, async (req, res) => {
  try {
    const { pasantiaId } = req.body;
    const estudianteId = req.estudiante.id;

    const dbData = readDB();
    if (!dbData.postulaciones) {
      dbData.postulaciones = [];
    }

    const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId);

    if (pasantiaIndex === -1) {
      return res.status(404).json({ message: 'Pasantía no encontrada' });
    }

    const pasantia = dbData.pasantias[pasantiaIndex];
    
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
    writeDB(dbData);

    res.status(201).json({ message: 'Postulación exitosa' });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar la postulación' });
  }
});

// Aceptar una postulación
app.post('/api/pasantias/:pasantiaId/postulaciones/:estudianteId/aceptar', authenticate(['empresa']), async (req, res) => {
  try {
    const { pasantiaId, estudianteId } = req.params;
    const dbData = readDB();
    
    const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === pasantiaId && p.empresaId === req.empresa.id);
    
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
    writeDB(dbData);

    // Notificar al estudiante
    const estudiante = dbData.estudiantes.find(e => e.id === estudianteId);
    if (estudiante) {
      await enviarEmail(
        estudiante.email,
        'Tu postulación ha sido aceptada - Sistema de Pasantías UTN',
        `
        <h1>¡Felicitaciones!</h1>
        <p>Tu postulación para la pasantía "${pasantia.titulo}" ha sido aceptada.</p>
        <p>Por favor, contacta a la empresa para coordinar los siguientes pasos.</p>
        `
      );
    }

    res.json({ message: 'Postulación aceptada exitosamente', pasantia });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la aceptación de la postulación' });
  }
});

// Iniciar servidor
app.listen(CONFIG.port, () => {
  console.log(`Servidor corriendo en http://localhost:${CONFIG.port}`);
});

// Ruta temporal para verificar datos (¡Eliminar en producción!)
app.get('/api/debug/db', (req, res) => {
  try {
    const dbData = readDB();
    res.json(dbData);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer la base de datos' });
  }
});

// Aprobar oferta de pasantía
app.post('/api/pasantias/:id/aprobar', authenticate(['sau']), async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;
    const dbData = readDB();
    
    const pasantiaIndex = dbData.pasantias.findIndex(p => p.id === id);
    if (pasantiaIndex === -1) {
      return res.status(404).json({ message: 'Oferta de pasantía no encontrada' });
    }

    const pasantia = dbData.pasantias[pasantiaIndex];
    pasantia.estado = 'oferta';
    pasantia.fechaAprobacion = new Date().toISOString();
    pasantia.comentariosSAU = comentarios;

    // Notificar a la empresa
    const empresa = dbData.empresas.find(e => e.id === pasantia.empresaId);
    if (empresa) {
      await enviarEmail(
        empresa.correo,
        'Oferta de pasantía aprobada - Sistema de Pasantías UTN',
        `
        <h1>¡Tu oferta de pasantía ha sido aprobada!</h1>
        <p>La oferta "${pasantia.titulo}" ha sido revisada y aprobada por el SAU.</p>
        ${comentarios ? `<p>Comentarios: ${comentarios}</p>` : ''}
        <p>La oferta ya está publicada y visible para los estudiantes.</p>
        `
      );
    }

    dbData.pasantias[pasantiaIndex] = pasantia;
    writeDB(dbData);

    res.json({
      message: 'Oferta de pasantía aprobada exitosamente',
      pasantia
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al aprobar la oferta de pasantía' });
  }
});

// Rechazar oferta de pasantía
app.post('/api/pasantias/:id/rechazar', authenticate(['sau']), async (req, res) => {
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
});
