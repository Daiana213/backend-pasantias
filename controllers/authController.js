const { readDB, writeDB } = require('../utils/dbUtils');
const { enviarEmail, emailTemplates, enviarEmailConPlantilla } = require('../utils/emailUtils');
const tokenUtils = require('../utils/tokenUtils');
const ValidationUtils = require('../utils/validationUtils');
const Estudiante = require('../models/Estudiante');
const Empresa = require('../models/Empresa');

const CONFIG = {
  email: {
    user: process.env.EMAIL_USER
  }
};

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';

class AuthController {
  // Registro de estudiante
  static async registroEstudiante(req, res) {
    try {
      const { email, legajo, password } = req.body;

      // Validar datos
      const validation = Estudiante.validate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: 'Datos de registro inválidos', 
          errors: validation.errors 
        });
      }

      const dbData = readDB();
      
      // Verificar si el email ya existe
      if (dbData.estudiantes?.some(e => e.email === email)) {
        return res.status(400).json({ message: 'Email ya registrado' });
      }

      // Crear nuevo estudiante
      const nuevoEstudiante = new Estudiante({
        email,
        legajo,
        password
      });

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
  }

  // Registro de empresa
  static async registroEmpresa(req, res) {
    try {
      const { nombre, correo, personaContacto, telefono, direccion, contraseña } = req.body;

      // Validar datos
      const validation = Empresa.validate(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: 'Datos de registro inválidos', 
          errors: validation.errors 
        });
      }

      const dbData = readDB();

      // Verificar si el correo ya existe
      if (dbData.empresas?.some(e => e.correo === correo)) {
        return res.status(400).json({ message: 'Correo ya registrado' });
      }

      // Crear nueva empresa
      const nuevaEmpresa = new Empresa({
        nombre,
        correo,
        personaContacto,
        telefono,
        direccion,
        contraseña
      });

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
  }

  // Login de estudiante
  static async loginEstudiante(req, res) {
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
  }

  // Login de empresa
  static async loginEmpresa(req, res) {
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
  }

  // Aprobar registro (para enlaces de email)
  static async aprobarRegistro(req, res) {
    try {
      const { id } = req.params;
      const { tipo, aprobar } = req.query;

      if (!['estudiante', 'empresa'].includes(tipo)) {
        return res.status(400).send('<h1>Error: Tipo de registro inválido</h1>');
      }

      const dbData = readDB();
      let usuario = null;
      let nombreUsuario = '';

      if (tipo === 'estudiante') {
        const estudianteIndex = dbData.estudiantes.findIndex(e => e.id === id);
        if (estudianteIndex === -1) {
          return res.status(404).send('<h1>Error: Estudiante no encontrado</h1>');
        }
        usuario = dbData.estudiantes[estudianteIndex];
        nombreUsuario = usuario.email;
      } else if (tipo === 'empresa') {
        const empresaIndex = dbData.empresas.findIndex(e => e.id === id);
        if (empresaIndex === -1) {
          return res.status(404).send('<h1>Error: Empresa no encontrada</h1>');
        }
        usuario = dbData.empresas[empresaIndex];
        nombreUsuario = usuario.nombre;
      }

      if (aprobar === 'true') {
        usuario.estadoValidacion = true;

        // Enviar email de confirmación usando la plantilla
        await enviarEmailConPlantilla(
          tipo === 'estudiante' ? usuario.email : usuario.correo,
          'Cuenta activada - Sistema de Pasantías UTN',
          'cuentaActivada',
          [nombreUsuario]
        );

        writeDB(dbData);

        // Responder con página de confirmación
        res.send(`
          <html>
            <head>
              <title>Registro Aprobado</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .success { color: #4CAF50; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="success">¡Registro Aprobado Exitosamente!</h1>
                <p>El ${tipo} "${nombreUsuario}" ha sido aprobado y puede acceder al sistema.</p>
                <p>Se ha enviado un email de confirmación.</p>
                <p>Puede cerrar esta ventana.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('<h1>Error al aprobar el registro</h1>');
    }
  }

  // Obtener perfil de estudiante
  static async obtenerPerfilEstudiante(req, res) {
    try {
      const { userId } = req.user;
      const dbData = readDB();
      
      const estudiante = dbData.estudiantes.find(e => e.id === userId);
      if (!estudiante) {
        return res.status(404).json({ message: 'Estudiante no encontrado' });
      }

      // Retornar datos del perfil sin la contraseña
      const perfilData = {
        ...estudiante,
        password: undefined
      };

      res.json(perfilData);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Actualizar perfil de estudiante
  static async actualizarPerfilEstudiante(req, res) {
    try {
      const { userId } = req.user;
      const dbData = readDB();
      
      const estudianteIndex = dbData.estudiantes.findIndex(e => e.id === userId);
      if (estudianteIndex === -1) {
        return res.status(404).json({ message: 'Estudiante no encontrado' });
      }

      // Actualizar solo los campos permitidos
      const camposPermitidos = [
        'nombre', 'apellido', 'telefono', 'carrera', 'añoIngreso',
        'materias_aprobadas', 'promedio', 'experienciaLaboral',
        'habilidades', 'linkedin', 'github', 'cv_url'
      ];

      const datosActualizados = {};
      camposPermitidos.forEach(campo => {
        if (req.body[campo] !== undefined) {
          datosActualizados[campo] = req.body[campo];
        }
      });

      // Actualizar estudiante
      dbData.estudiantes[estudianteIndex] = {
        ...dbData.estudiantes[estudianteIndex],
        ...datosActualizados,
        fechaActualizacion: new Date().toISOString()
      };

      writeDB(dbData);
      
      const estudianteActualizado = { 
        ...dbData.estudiantes[estudianteIndex],
        password: undefined 
      };
      
      res.json(estudianteActualizado);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Obtener perfil de empresa
  static async obtenerPerfilEmpresa(req, res) {
    try {
      const { userId } = req.user;
      const dbData = readDB();
      
      const empresa = dbData.empresas.find(e => e.id === userId);
      if (!empresa) {
        return res.status(404).json({ message: 'Empresa no encontrada' });
      }

      // Retornar datos del perfil sin la contraseña
      const perfilData = {
        ...empresa,
        contraseña: undefined
      };

      res.json(perfilData);
    } catch (error) {
      console.error('Error al obtener perfil empresa:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Actualizar perfil de empresa
  static async actualizarPerfilEmpresa(req, res) {
    try {
      const { userId } = req.user;
      const dbData = readDB();
      
      const empresaIndex = dbData.empresas.findIndex(e => e.id === userId);
      if (empresaIndex === -1) {
        return res.status(404).json({ message: 'Empresa no encontrada' });
      }

      // Actualizar solo los campos permitidos
      const camposPermitidos = [
        'nombre', 'personaContacto', 'telefono', 'direccion',
        'descripcion', 'sitioWeb', 'sector', 'tamaño'
      ];

      const datosActualizados = {};
      camposPermitidos.forEach(campo => {
        if (req.body[campo] !== undefined) {
          datosActualizados[campo] = req.body[campo];
        }
      });

      // Actualizar empresa
      dbData.empresas[empresaIndex] = {
        ...dbData.empresas[empresaIndex],
        ...datosActualizados,
        fechaActualizacion: new Date().toISOString()
      };

      writeDB(dbData);
      
      const empresaActualizada = { 
        ...dbData.empresas[empresaIndex],
        contraseña: undefined 
      };
      
      res.json(empresaActualizada);
    } catch (error) {
      console.error('Error al actualizar perfil empresa:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Actualizar configuraciones (estudiantes y empresas)
  static async actualizarConfiguraciones(req, res) {
    try {
      const { userId, userType } = req.user;
      const { configuraciones } = req.body;
      const dbData = readDB();
      
      if (userType === 'estudiante') {
        const estudianteIndex = dbData.estudiantes.findIndex(e => e.id === userId);
        if (estudianteIndex === -1) {
          return res.status(404).json({ message: 'Estudiante no encontrado' });
        }
        
        dbData.estudiantes[estudianteIndex].configuraciones = {
          ...dbData.estudiantes[estudianteIndex].configuraciones,
          ...configuraciones
        };
      } else if (userType === 'empresa') {
        const empresaIndex = dbData.empresas.findIndex(e => e.id === userId);
        if (empresaIndex === -1) {
          return res.status(404).json({ message: 'Empresa no encontrada' });
        }
        
        dbData.empresas[empresaIndex].configuraciones = {
          ...dbData.empresas[empresaIndex].configuraciones,
          ...configuraciones
        };
      }

      writeDB(dbData);
      res.json({ message: 'Configuraciones actualizadas correctamente' });
    } catch (error) {
      console.error('Error al actualizar configuraciones:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Cambiar contraseña
  static async cambiarPassword(req, res) {
    try {
      const { userId, userType } = req.user;
      const { currentPassword, newPassword } = req.body;
      const dbData = readDB();
      
      let usuario, usuarioIndex;
      
      if (userType === 'estudiante') {
        usuarioIndex = dbData.estudiantes.findIndex(e => e.id === userId);
        usuario = dbData.estudiantes[usuarioIndex];
      } else if (userType === 'empresa') {
        usuarioIndex = dbData.empresas.findIndex(e => e.id === userId);
        usuario = dbData.empresas[usuarioIndex];
      }

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Verificar contraseña actual
      const currentPasswordField = userType === 'empresa' ? 'contraseña' : 'password';
      if (usuario[currentPasswordField] !== currentPassword) {
        return res.status(400).json({ message: 'Contraseña actual incorrecta' });
      }

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }

      // Actualizar contraseña
      if (userType === 'estudiante') {
        dbData.estudiantes[usuarioIndex].password = newPassword;
      } else {
        dbData.empresas[usuarioIndex].contraseña = newPassword;
      }

      writeDB(dbData);
      res.json({ message: 'Contraseña cambiada correctamente' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

module.exports = AuthController;
