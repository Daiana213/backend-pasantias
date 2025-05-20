const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();

// Configuración básica
const CONFIG = {
  dbPath: path.join(__dirname, 'db.json'),
  port: process.env.PORT || 3000,
  email: {
    user: 'daianapalacios213@gmail.com',
    pass: 'fjly mbqh gebp cqbc'
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.pass
  }
});

// Utilidades
const utils = {
  readDB: () => {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.dbPath, 'utf8'));
    } catch (error) {
      return { estudiantes: [], empresas: [] };
    }
  },
  
  writeDB: (data) => {
    try {
      fs.writeFileSync(CONFIG.dbPath, JSON.stringify(data, null, 2));
      console.log('Datos guardados exitosamente:', data);
    } catch (error) {
      console.error('Error al guardar datos:', error);
      throw error;
    }
  }
};

// Rutas de Autenticación
app.post('/api/auth/registro-estudiante', async (req, res) => {
  try {
    const { email, legajo, password } = req.body;
    const dbData = utils.readDB();
    
    if (dbData.estudiantes?.some(e => e.email === email)) {
      return res.status(400).json({ message: 'Email ya registrado' });
    }

    const nuevoEstudiante = {
      id: Date.now().toString(),
      email,
      legajo,
      password,
      rol: 'estudiante',
      estadoValidacion: false,
      fechaRegistro: new Date().toISOString()
    };

    dbData.estudiantes.push(nuevoEstudiante);

    // Notificar al estudiante
    await utils.enviarEmail(
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
      <p>Te notificaremos cuando tu cuenta sea verificada.</p>
      `
    );

    // Notificar al administrador
    await utils.enviarEmail(
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
      `
    );

    utils.writeDB(dbData);
    res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar el registro' });
  }
});

app.post('/api/auth/registro-empresa', async (req, res) => {
  try {
    const { nombre, correo, personaContacto, telefono, direccion, contraseña } = req.body;
    const dbData = utils.readDB();

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
      rol: 'empresa',
      estadoValidacion: false,
      fechaRegistro: new Date().toISOString()
    };

    dbData.empresas.push(nuevaEmpresa);

    // Notificar a la empresa
    await utils.enviarEmail(
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
      <p>Te notificaremos cuando tu cuenta sea verificada.</p>
      `
    );

    // Notificar al administrador
    await utils.enviarEmail(
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
      `
    );

    utils.writeDB(dbData);
    res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al registrar empresa' });
  }
});

app.post('/api/auth/aprobar-registro', async (req, res) => {
  try {
    const { id, tipo, aprobar } = req.body;
    const dbData = utils.readDB();
    
    const coleccion = tipo === 'estudiante' ? 'estudiantes' : 'empresas';
    const usuario = dbData[coleccion].find(u => u.id === id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    usuario.estadoValidacion = aprobar;
    
    const email = usuario.email || usuario.correo;
    await utils.enviarEmail(
      email,
      `Actualización de estado de cuenta - ${aprobar ? 'Aprobada' : 'Rechazada'}`,
      `
      <h1>Actualización de tu cuenta</h1>
      <p>Tu cuenta ha sido ${aprobar ? 'aprobada' : 'rechazada'}.</p>
      ${aprobar ? '<p>Ya puedes iniciar sesión en el sistema.</p>' : 
                 '<p>Si crees que esto es un error, contacta al administrador.</p>'}
      `
    );

    utils.writeDB(dbData);
    res.json({ message: aprobar ? 'Usuario aprobado' : 'Usuario rechazado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, tipo } = req.body;
    const dbData = utils.readDB();
    
    const coleccion = tipo === 'estudiante' ? 'estudiantes' : 'empresas';
    const usuario = dbData[coleccion].find(u => 
      (u.email === email || u.correo === email) && 
      (u.password === password || u.contraseña === password)
    );

    if (!usuario) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!usuario.estadoValidacion) {
      return res.status(403).json({ message: 'Tu cuenta está pendiente de verificación' });
    }

    res.json({
      ok: true,
      id: usuario.id,
      email: usuario.email || usuario.correo,
      nombre: usuario.nombre || '',
      rol: usuario.rol
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

// Iniciar servidor
app.listen(CONFIG.port, () => {
  console.log(`Servidor corriendo en http://localhost:${CONFIG.port}`);
});

// Ruta temporal para verificar datos (¡Eliminar en producción!)
app.get('/api/debug/db', (req, res) => {
  try {
    const dbData = utils.readDB();
    res.json(dbData);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer la base de datos' });
  }
});