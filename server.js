const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de rutas y constantes
const dbPath = path.join(__dirname, 'db.json');
const PORT = process.env.PORT || 3000;

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'daianapalacios213@gmail.com',
    pass: 'fjly mbqh gebp cqbc'
  }
});

// Función auxiliar para enviar emails
const enviarEmail = async (destinatario, asunto, contenido) => {
  try {
    await transporter.sendMail({
      from: 'daianapalacios213@gmail.com',
      to: destinatario,
      subject: asunto,
      html: contenido
    });
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};

// Endpoints de Autenticación

// Registro de estudiante
app.post('/api/auth/registro-estudiante', async (req, res) => {
  try {
    const { email, legajo, password } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if (dbData.estudiantes.some(e => e.email === email)) {
      return res.status(400).json({ message: 'Email ya registrado' });
    }

    const tokenVerificacion = crypto.randomBytes(32).toString('hex');
    const nuevoEstudiante = {
      id: Date.now().toString(),
      email,
      legajo,
      password,
      rol: 'estudiante',
      estadoValidacion: 'pendiente_aprobacion',
      fechaRegistro: new Date().toISOString(),
      emailVerificado: false,
      tokenVerificacion
    };

    const urlVerificacion = `http://localhost:5173/verificar-email?token=${tokenVerificacion}`;

    await enviarEmail(
      email,
      'Confirmación de registro - Sistema de Pasantías UTN',
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

    await enviarEmail(
      'daianapalacios213@gmail.com',
      'Nueva solicitud de registro de estudiante',
      `
      <h1>Nueva solicitud de registro</h1>
      <p>Se ha recibido una nueva solicitud de registro:</p>
      <ul>
        <li>Legajo: ${legajo}</li>
        <li>Email: ${email}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <p>Por favor, verifica tu email haciendo clic en el siguiente enlace:</p>
      <a href="${urlVerificacion}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verificar Email</a>
      <p>Te notificaremos cuando tu cuenta sea aprobada.</p>
      `
    );

    dbData.estudiantes = dbData.estudiante || [];
    dbData.registrosPendientes.push(nuevoEstudiante);
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    res.status(201).json({ 
      message: 'Solicitud de registro enviada. Recibirás un email cuando sea aprobada.' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar el registro' });
  }
});

// Endpoint para verificar email
app.post('/api/auth/verificar-email', async (req, res) => {
  try {
    const { token } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const estudiante = dbData.registrosPendientes.find(e => e.tokenVerificacion === token);
    
    if (!estudiante) {
      return res.status(404).json({ message: 'Token de verificación inválido' });
    }

    estudiante.emailVerificado = true;
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    res.json({ message: 'Email verificado exitosamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al verificar el email' });
  }
});

// Registro de empresa
app.post('/api/auth/registro-empresa', async (req, res) => {
  try {
    const { nombre, correo, personaContacto, telefono, direccion, contraseña } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    if (dbData.empresas.some(e => e.email === correo)) {
      return res.status(400).json({ error: 'Correo ya registrado' });
    }

    const nuevaEmpresa = {
      id: Date.now().toString(),
      nombre,
      contacto: personaContacto,
      email: correo,
      telefono,
      direccion,
      contraseña,
      rol: 'empresa',
      estadoValidacion: 'pendiente_aprobacion',
      fechaRegistro: new Date().toISOString()
    };

    await enviarEmail(
      correo,
      'Confirmación de registro - Sistema de Pasantías UTN',
      `
      <h1>¡Gracias por registrar tu empresa!</h1>
      <p>Tu solicitud de registro ha sido recibida y está siendo procesada.</p>
      <p>Datos de registro:</p>
      <ul>
        <li>Empresa: ${nombre}</li>
        <li>Email: ${correo}</li>
      </ul>
      <p>Te notificaremos cuando tu cuenta sea aprobada.</p>
      `
    );

    await enviarEmail(
      'daianapalacios213@gmail.com',
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

    dbData.registrosPendientes = dbData.registrosPendientes || [];
    dbData.registrosPendientes.push(nuevaEmpresa);
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    res.status(201).json({ 
      message: 'Solicitud de registro enviada. Recibirás un email cuando sea aprobada.' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al registrar empresa' });
  }
});

// Aprobación de registros
app.post('/api/auth/aprobar-registro', async (req, res) => {
  try {
    const { userId, aprobar } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const registroPendiente = dbData.registrosPendientes.find(r => r.id === userId);
    if (!registroPendiente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    await enviarEmail(
      registroPendiente.email,
      `Actualización de tu solicitud de registro - ${aprobar ? 'Aprobada' : 'Rechazada'}`,
      `
      <h1>Actualización de tu solicitud</h1>
      <p>Tu solicitud de registro ha sido ${aprobar ? 'aprobada' : 'rechazada'}.</p>
      ${aprobar ? '<p>Ya puedes iniciar sesión en el sistema con tus credenciales.</p>' : 
                 '<p>Si crees que esto es un error, por favor contacta con el administrador.</p>'}
      `
    );

    if (aprobar) {
      if (registroPendiente.rol === 'estudiante') {
        dbData.estudiantes = dbData.estudiantes || [];
        dbData.estudiantes.push(registroPendiente);
      } else {
        dbData.empresas = dbData.empresas || [];
        dbData.empresas.push(registroPendiente);
      }
    }

    dbData.registrosPendientes = dbData.registrosPendientes.filter(r => r.id !== userId);
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    res.json({ message: aprobar ? 'Registro aprobado' : 'Registro rechazado' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al procesar la aprobación' });
  }
});

// Login de estudiante
app.post('/api/auth/login-estudiante', (req, res) => {
  try {
    const { legajo, password } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const estudiante = dbData.estudiantes.find(e => e.legajo === legajo && e.password === password);

    if (!estudiante) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    res.json({ 
      ok: true, 
      email: estudiante.email, 
      nombre: estudiante.nombre || '', 
      legajo: estudiante.legajo 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Login de empresa
app.post('/api/auth/login-empresa', (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const empresa = dbData.empresas.find(e => e.email === correo && e.contraseña === contraseña);

    if (!empresa) {
      return res.status(400).json({ error: 'Credenciales incorrectas' });
    }

    res.json({ 
      ok: true, 
      nombre: empresa.nombre, 
      correo: empresa.email 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Endpoints de Datos

// Obtener estudiantes
app.get('/api/estudiantes', (req, res) => {
  try {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(dbData.estudiantes || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener estudiantes' });
  }
});

// Obtener notificaciones
app.get('/api/notificaciones', (req, res) => {
  try {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(dbData.notificaciones || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
});

// Obtener ofertas
app.get('/api/ofertas', (req, res) => {
  try {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(dbData.ofertas || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error al obtener ofertas' });
  }
});

// Obtener postulaciones de empresa
app.get('/api/postulaciones/empresa', (req, res) => {
  try {
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    res.json(dbData.postulaciones || []);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener postulaciones' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});