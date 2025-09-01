const { readDB, writeDB } = require('../utils/dbUtils');
const { enviarEmail, emailTemplates, enviarEmailConPlantilla } = require('../utils/emailUtils');
const TokenUtils = require('../utils/tokenUtils');
const ValidationUtils = require('../utils/validationUtils');
const PasswordUtils = require('../utils/passwordUtils');
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

      // Hashear la contraseña antes de almacenar
      await nuevoEstudiante.hashPassword();

      if (!dbData.estudiantes) {
        dbData.estudiantes = [];
      }
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

      // Generar token de aprobación seguro
      const approvalToken = TokenUtils.generateApprovalToken(nuevoEstudiante.id, 'estudiante');

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
        <div style="margin-top: 20px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h3>Para aprobar este registro:</h3>
          <p>1. Copia el siguiente token de aprobación:</p>
          <div style="background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 10px 0;">
            ${approvalToken}
          </div>
          <p>2. Ve al panel de administración y pega este token para aprobar el registro.</p>
          <p style="color: #666; font-size: 12px;">Este token expira en 24 horas por seguridad.</p>
        </div>
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

      // Hashear la contraseña antes de almacenar
      await nuevaEmpresa.hashPassword();

      if (!dbData.empresas) {
        dbData.empresas = [];
      }
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

      // Generar token de aprobación seguro
      const approvalToken = TokenUtils.generateApprovalToken(nuevaEmpresa.id, 'empresa');

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
        <div style="margin-top: 20px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h3>Para aprobar este registro:</h3>
          <p>1. Copia el siguiente token de aprobación:</p>
          <div style="background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 10px 0;">
            ${approvalToken}
          </div>
          <p>2. Ve al panel de administración y pega este token para aprobar el registro.</p>
          <p style="color: #666; font-size: 12px;">Este token expira en 24 horas por seguridad.</p>
        </div>
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
      
      if (!legajo || !password) {
        return res.status(400).json({ message: 'Legajo y contraseña son requeridos' });
      }

      const dbData = readDB();
      
      const estudiante = dbData.estudiantes?.find(u => u.legajo === legajo);

      if (!estudiante) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      // Verificar contraseña hasheada
      const estudianteModel = new Estudiante(estudiante);
      const isValidPassword = await estudianteModel.verifyPassword(password);
      
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      if (!estudiante.estadoValidacion) {
        return res.status(403).json({ message: 'Tu cuenta está pendiente de verificación' });
      }

      // Generar tokens JWT
      const accessToken = TokenUtils.generateAccessToken(estudiante.id, 'estudiante');
      const { token: refreshToken, refreshTokenData } = TokenUtils.generateRefreshToken(estudiante.id, 'estudiante');
      
      // Almacenar refresh token
      TokenUtils.storeRefreshToken(refreshTokenData);

      res.json({
        ok: true,
        id: estudiante.id,
        email: estudiante.email,
        legajo: estudiante.legajo,
        role: estudiante.role,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });
    } catch (error) {
      console.error('Error en login estudiante:', error);
      res.status(500).json({ message: 'Error al iniciar sesión' });
    }
  }

  // Login de empresa
  static async loginEmpresa(req, res) {
    try {
      const { correo, contraseña } = req.body;
      
      if (!correo || !contraseña) {
        return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
      }

      const dbData = readDB();
      
      const empresa = dbData.empresas?.find(u => u.correo === correo);

      if (!empresa) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      // Verificar contraseña hasheada
      const empresaModel = new Empresa(empresa);
      const isValidPassword = await empresaModel.verifyPassword(contraseña);
      
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Credenciales inválidas' });
      }

      if (!empresa.estadoValidacion) {
        return res.status(403).json({ message: 'Tu cuenta está pendiente de verificación' });
      }

      // Generar tokens JWT
      const accessToken = TokenUtils.generateAccessToken(empresa.id, 'empresa');
      const { token: refreshToken, refreshTokenData } = TokenUtils.generateRefreshToken(empresa.id, 'empresa');
      
      // Almacenar refresh token
      TokenUtils.storeRefreshToken(refreshTokenData);

      res.json({
        ok: true,
        id: empresa.id,
        correo: empresa.correo,
        nombre: empresa.nombre,
        role: empresa.role,
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });
    } catch (error) {
      console.error('Error en login empresa:', error);
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
      const { id: userId } = req.user; // tomar id del usuario autenticado
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
      const { id: userId } = req.user; // tomar id del usuario autenticado
      const dbData = readDB();
      
      const estudianteIndex = dbData.estudiantes.findIndex(e => e.id === userId);
      if (estudianteIndex === -1) {
        return res.status(404).json({ message: 'Estudiante no encontrado' });
      }

      // Filtrar y actualizar solo los campos permitidos para evitar modificaciones no deseadas
      const camposPermitidos = [
        'nombre', 'apellido', 'telefono', 'carrera', 'añoIngreso',
        'materias_aprobadas', 'promedio', 'experienciaLaboral',
        'habilidades', 'linkedin', 'github', 'cv_url'
      ];

      const datosActualizados = Object.keys(req.body)
        .filter(key => camposPermitidos.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      // Fusionar los datos actualizados con los existentes
      dbData.estudiantes[estudianteIndex] = {
        ...dbData.estudiantes[estudianteIndex],
        ...datosActualizados,
        fechaActualizacion: new Date().toISOString()
      };

      writeDB(dbData);
      
      const estudianteActualizado = { 
        ...dbData.estudiantes[estudianteIndex],
        password: undefined // Nunca retornar el password
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
      const { id: userId } = req.user; // tomar id del usuario autenticado
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
      const { id: userId } = req.user; // tomar id del usuario autenticado
      const dbData = readDB();
      
      const empresaIndex = dbData.empresas.findIndex(e => e.id === userId);
      if (empresaIndex === -1) {
        return res.status(404).json({ message: 'Empresa no encontrada' });
      }

      // Filtrar y actualizar solo los campos permitidos
      const camposPermitidos = [
        'nombre', 'personaContacto', 'telefono', 'direccion',
        'descripcion', 'sitioWeb', 'sector', 'tamaño'
      ];

      const datosActualizados = Object.keys(req.body)
        .filter(key => camposPermitidos.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      // Fusionar los datos actualizados con los existentes
      dbData.empresas[empresaIndex] = {
        ...dbData.empresas[empresaIndex],
        ...datosActualizados,
        fechaActualizacion: new Date().toISOString()
      };

      writeDB(dbData);
      
      const empresaActualizada = { 
        ...dbData.empresas[empresaIndex],
        contraseña: undefined // Nunca retornar la contraseña
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
      const { id: userId } = req.user; // id del usuario autenticado
      const userType = req.role; // rol provisto por el middleware
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

  // Refresh Token - renovar token de acceso
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token es requerido' });
      }

      const tokenData = TokenUtils.verifyRefreshToken(refreshToken);
      
      if (!tokenData) {
        return res.status(401).json({ message: 'Refresh token inválido o expirado' });
      }

      // Generar nuevo access token
      const newAccessToken = TokenUtils.generateAccessToken(tokenData.userId, tokenData.role);
      
      // Generar nuevo refresh token y revocar el anterior
      const { token: newRefreshToken, refreshTokenData } = TokenUtils.generateRefreshToken(tokenData.userId, tokenData.role);
      
      // Revocar el refresh token anterior
      TokenUtils.revokeRefreshToken(refreshToken);
      
      // Almacenar nuevo refresh token
      TokenUtils.storeRefreshToken(refreshTokenData);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
      });
    } catch (error) {
      console.error('Error al renovar token:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Logout - cerrar sesión y revocar tokens
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const { id: userId, role } = req.user;
      
      if (refreshToken) {
        // Revocar refresh token específico
        TokenUtils.revokeRefreshToken(refreshToken);
      } else {
        // Revocar todos los tokens del usuario
        TokenUtils.revokeAllUserTokens(userId, role);
      }

      res.json({ message: 'Sesión cerrada correctamente' });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  // Cambiar contraseña
  static async cambiarPassword(req, res) {
    try {
      const { id: userId } = req.user; // id del usuario autenticado
      const userType = req.role; // rol provisto por el middleware
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas' });
      }

      // Validar nueva contraseña
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: 'La nueva contraseña no cumple con los requisitos de seguridad', 
          errors: passwordValidation.errors 
        });
      }

      const dbData = readDB();
      
      let usuario, usuarioIndex, userModel;
      
      if (userType === 'estudiante') {
        usuarioIndex = dbData.estudiantes.findIndex(e => e.id === userId);
        usuario = dbData.estudiantes[usuarioIndex];
        userModel = new Estudiante(usuario);
      } else if (userType === 'empresa') {
        usuarioIndex = dbData.empresas.findIndex(e => e.id === userId);
        usuario = dbData.empresas[usuarioIndex];
        userModel = new Empresa(usuario);
      }

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await userModel.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Contraseña actual incorrecta' });
      }

      // Hashear nueva contraseña
      const newHashedPassword = await PasswordUtils.hashPassword(newPassword);

      // Actualizar contraseña
      if (userType === 'estudiante') {
        dbData.estudiantes[usuarioIndex].password = newHashedPassword;
      } else {
        dbData.empresas[usuarioIndex].contraseña = newHashedPassword;
      }

      // Revocar todos los tokens del usuario para forzar nuevo login
      TokenUtils.revokeAllUserTokens(userId, userType);

      writeDB(dbData);
      res.json({ 
        message: 'Contraseña cambiada correctamente. Debes iniciar sesión nuevamente.',
        requireReauth: true
      });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}

module.exports = AuthController;
