const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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
    return JSON.parse(fs.readFileSync(CONFIG.dbPath, 'utf8'));
  },
  
  writeDB: (data) => {
    fs.writeFileSync(CONFIG.dbPath, JSON.stringify(data, null, 2));
  },
  
  enviarEmail: async (destinatario, asunto, contenido) => {
    try {
      await transporter.sendMail({
        from: CONFIG.email.user,
        to: destinatario,
        subject: asunto,
        html: contenido
      });
      return true;
    } catch (error) {
      console.error('Error al enviar email:', error);
      return false;
    }
  }
};

// Rutas de Autenticación
const authRoutes = {
  registroEstudiante: async (req, res) => {
    try {
      const { email, legajo, password } = req.body;
      const dbData = utils.readDB();
      
      if (dbData.estudiantes?.some(e => e.email === email)) {
        return res.status(400).json({ message: 'Email ya registrado' });
      }

      const tokenVerificacion = crypto.randomBytes(32).toString('hex');
      const nuevoEstudiante = {
        id: Date.now().toString(),
        email,
        legajo,
        password,
        rol: 'estudiante',
        estadoValidacion: false,
        fechaRegistro: new Date().toISOString(),
        emailVerificado: false,
        tokenVerificacion
      };

      dbData.estudiantes = dbData.estudiantes || [];
      dbData.estudiantes.push(nuevoEstudiante);
      
      const urlVerificacion = `/frontend-pasantias/verificar-email?token=${tokenVerificacion}`;

      await Promise.all([
        utils.enviarEmail(
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
        ),
        utils.enviarEmail(
          CONFIG.email.user,
          'Nueva solicitud de registro de estudiante - Verificación pendiente',
          `
          <h1>Nueva solicitud de registro</h1>
          <p>Se ha recibido una nueva solicitud de registro:</p>
          <ul>
            <li>Legajo: ${legajo}</li>
            <li>Email: ${email}</li>
            <li>Fecha: ${new Date().toLocaleString()}</li>
          </ul>
          <p>Por favor, verifica este registro haciendo clic en el siguiente enlace:</p>
          <a href="${urlVerificacion}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verificar Registro</a>
          `
        )
      ]);

      utils.writeDB(dbData);
      res.status(201).json({ message: 'Registro exitoso. El administrador verificará tu cuenta.' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al procesar el registro' });
    }
  },

  verificarEmail: async (req, res) => {
    try {
      const { token } = req.body;
      const dbData = utils.readDB();
      
      const estudiante = dbData.estudiantes.find(e => e.tokenVerificacion === token);
      if (!estudiante) {
        return res.status(404).json({ message: 'Token de verificación inválido' });
      }

      estudiante.emailVerificado = true;
      estudiante.estadoValidacion = true;
      
      await utils.enviarEmail(
        estudiante.email,
        'Cuenta Verificada - Sistema de Pasantías UTN',
        `
        <h1>¡Tu cuenta ha sido verificada!</h1>
        <p>Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión en el sistema.</p>
        `
      );
      
      utils.writeDB(dbData);
      res.json({ 
        message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
        estadoValidacion: estudiante.estadoValidacion,
        emailVerificado: estudiante.emailVerificado
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al verificar el email' });
    }
  },

  loginEstudiante: (req, res) => {
    try {
      const { legajo, password } = req.body;
      const dbData = utils.readDB();
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
  }
};

// Rutas de Datos
const dataRoutes = {
  getEstudiantes: (req, res) => {
    try {
      const dbData = utils.readDB();
      res.json(dbData.estudiantes || []);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener estudiantes' });
    }
  },

  getNotificaciones: (req, res) => {
    try {
      const dbData = utils.readDB();
      res.json(dbData.notificaciones || []);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
  },

  getOfertas: (req, res) => {
    try {
      const dbData = utils.readDB();
      res.json(dbData.ofertas || []);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error al obtener ofertas' });
    }
  }
};

// Configuración de rutas
app.post('/api/auth/registro-estudiante', authRoutes.registroEstudiante);
app.post('/api/auth/verificar-email', authRoutes.verificarEmail);
app.post('/api/auth/login-estudiante', authRoutes.loginEstudiante);

app.get('/api/estudiantes', dataRoutes.getEstudiantes);
app.get('/api/notificaciones', dataRoutes.getNotificaciones);
app.get('/api/ofertas', dataRoutes.getOfertas);

// Agregar las rutas al Express app
app.post('/auth/registro-empresa', authRoutes.registroEmpresa);
app.post('/auth/login-empresa', authRoutes.loginEmpresa);

// Iniciar servidor
app.listen(CONFIG.port, () => {
  console.log(`Servidor corriendo en http://localhost:${CONFIG.port}`);
});