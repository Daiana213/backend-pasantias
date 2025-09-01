const TokenUtils = require('../utils/tokenUtils');
const { readDB } = require('../utils/dbUtils');

const authenticate = (allowedRoles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth failed: Missing or invalid Authorization header');
    return res.status(401).json({ 
      message: 'Token de autenticación no proporcionado',
      error: 'MISSING_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];
  const tokenData = TokenUtils.verifyAccessToken(token);

  if (!tokenData) {
    console.log('Auth failed: Invalid or expired token');
    return res.status(401).json({ 
      message: 'Token inválido o expirado',
      error: 'INVALID_TOKEN'
    });
  }

  // Verificar si el rol está permitido
  if (allowedRoles.length && !allowedRoles.includes(tokenData.role)) {
    return res.status(403).json({ 
      message: 'Acceso no autorizado para este rol',
      error: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  // Buscar el usuario en la base de datos para obtener datos actualizados
  const dbData = readDB();
  let user = null;
  
  if (tokenData.role === 'estudiante') {
    user = dbData.estudiantes?.find(e => e.id === tokenData.userId);
  } else if (tokenData.role === 'empresa') {
    user = dbData.empresas?.find(e => e.id === tokenData.userId);
  }

  if (!user) {
    return res.status(401).json({ 
      message: 'Usuario no encontrado',
      error: 'USER_NOT_FOUND'
    });
  }

  if (!user.estadoValidacion) {
    return res.status(403).json({ 
      message: 'Cuenta no verificada',
      error: 'ACCOUNT_NOT_VERIFIED'
    });
  }

  // Agregar datos del usuario y token al request
  req.user = { id: user.id, role: tokenData.role };
  req.role = tokenData.role;
  req.userData = user; // Datos completos del usuario (sin contraseña)
  
  // Añadir req.empresa para rutas que requieren empresa
  if (tokenData.role === 'empresa') {
    req.empresa = user;
  }
  
  next();
};

module.exports = authenticate;