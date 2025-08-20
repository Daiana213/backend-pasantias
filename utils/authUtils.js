const { readDB } = require('./dbUtils');
const tokenUtils = require('./tokenUtils');

class AuthUtils {
  // Middleware de autenticación para estudiantes específicamente
  static authenticateStudent(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
    }

    const token = authHeader.split(' ')[1];
    const dbData = readDB();
    const estudiante = dbData.estudiantes.find(e => e.token === token);

    if (!estudiante) {
      return res.status(401).json({ message: 'Token inválido o estudiante no encontrado' });
    }

    if (!estudiante.estadoValidacion) {
      return res.status(403).json({ message: 'Cuenta no validada' });
    }

    req.user = estudiante;
    req.estudiante = estudiante; // Para compatibilidad con código existente
    next();
  }

  // Obtener usuario desde token
  static getUserFromToken(token) {
    try {
      const dbData = readDB();
      const authInfo = tokenUtils.verify(token, dbData);
      return authInfo;
    } catch (error) {
      return null;
    }
  }

  // Verificar si un usuario tiene un rol específico
  static hasRole(user, role) {
    return user && user.role === role;
  }

  // Verificar si un token es válido
  static isValidToken(token) {
    return this.getUserFromToken(token) !== null;
  }

  // Middleware para verificar múltiples roles
  static requireRoles(roles = []) {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
      }

      const token = authHeader.split(' ')[1];
      const authInfo = this.getUserFromToken(token);

      if (!authInfo) {
        return res.status(401).json({ message: 'Token inválido' });
      }

      if (roles.length && !roles.includes(authInfo.role)) {
        return res.status(403).json({ message: 'Acceso no autorizado' });
      }

      req.user = authInfo.user;
      req.role = authInfo.role;
      
      // Asignar propiedades específicas para compatibilidad
      if (authInfo.role === 'empresa') {
        req.empresa = authInfo.user;
      } else if (authInfo.role === 'estudiante') {
        req.estudiante = authInfo.user;
      }
      
      next();
    };
  }

  // Verificar si un usuario está validado
  static isUserValidated(user) {
    return user && user.estadoValidacion === true;
  }

  // Obtener información básica del usuario para respuestas
  static getUserInfo(user) {
    if (!user) return null;

    const baseInfo = {
      id: user.id,
      role: user.role,
      estadoValidacion: user.estadoValidacion,
      fechaRegistro: user.fechaRegistro
    };

    if (user.role === 'estudiante') {
      return {
        ...baseInfo,
        email: user.email,
        legajo: user.legajo
      };
    } else if (user.role === 'empresa') {
      return {
        ...baseInfo,
        nombre: user.nombre,
        correo: user.correo,
        personaContacto: user.personaContacto
      };
    }

    return baseInfo;
  }

  // Generar respuesta estándar de login
  static generateLoginResponse(user, token) {
    const userInfo = this.getUserInfo(user);
    return {
      ok: true,
      ...userInfo,
      token: token
    };
  }
}

module.exports = AuthUtils;
