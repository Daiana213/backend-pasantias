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

const API_URL = 'http://localhost:3000';

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
  },

  enviarEmail: async (destinatario, asunto, contenidoHTML) => {
    try {
      const info = await transporter.sendMail({
        from: CONFIG.email.user,
        to: destinatario,
        subject: asunto,
        html: contenidoHTML
      });
      console.log('Email enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error al enviar email:', error);
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

    utils.writeDB(dbData);
    res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al registrar empresa' });
  }
});

app.post('/api/auth/login-estudiante', async (req, res) => {
  try {
    const { legajo, password } = req.body;
    const dbData = utils.readDB();
    
    const usuario = dbData.estudiantes.find(u => 
      u.legajo === legajo && 
      u.password === password
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
      email: usuario.email,
      legajo: usuario.legajo,
      rol: usuario.rol
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

app.post('/api/auth/login-empresa', async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const dbData = utils.readDB();
    
    const empresa = dbData.empresas.find(e => e.correo === correo && e.contraseña === contraseña);
    
    if (!empresa) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!empresa.estadoValidacion) {
      return res.status(401).json({ error: 'Tu cuenta aún no ha sido validada' });
    }

    // Excluir la contraseña de la respuesta
    const { contraseña: _, ...empresaSinContraseña } = empresa;

    res.json({
      ok: true,
      ...empresaSinContraseña,
      token: 'token-temporal' // Aquí deberías implementar un sistema de tokens real
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al procesar el inicio de sesión' });
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

// Ruta para aprobar registro directamente desde el email
app.get('/api/auth/aprobar-registro/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, aprobar } = req.query;
    const dbData = utils.readDB();
    
    const coleccion = tipo === 'estudiante' ? 'estudiantes' : 'empresas';
    const usuario = dbData[coleccion].find(u => u.id === id);

    if (!usuario) {
      return res.send('<h1>Error: Usuario no encontrado</h1>');
    }

    usuario.estadoValidacion = aprobar === 'true';
    utils.writeDB(dbData);
    
    // Enviar email de confirmación al usuario
    const email = usuario.email || usuario.correo;
    await utils.enviarEmail(
      email,
      'Tu cuenta ha sido verificada - Sistema de Pasantías UTN',
      `
      <h1>¡Tu cuenta ha sido verificada!</h1>
      <p>Ya puedes iniciar sesión en el sistema con tus credenciales.</p>
      `
    );

    // Mostrar página de confirmación
    res.send(`
      <html>
        <body style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
          <h1 style="color: #4CAF50;">¡Registro Aprobado!</h1>
          <p>El usuario ha sido verificado exitosamente.</p>
          <p>Se ha enviado un correo de confirmación al usuario.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error:', error);
    res.send('<h1>Error al procesar la solicitud</h1>');
  }
});