const tokenUtils = require('../utils/tokenUtils');
const { readDB } = require('../utils/dbUtils');

const authenticate = (allowedRoles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  const dbData = readDB();
  const authInfo = tokenUtils.verify(token, dbData);

  if (!authInfo) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  if (allowedRoles.length && !allowedRoles.includes(authInfo.role)) { // Cambiar authInfo.rol a authInfo.role
    return res.status(403).json({ message: 'Acceso no autorizado' });
  }

  req.user = authInfo.user;
  req.role = authInfo.role; // Cambiar req.rol para que coincida con authInfo.role
  
  // Añadir req.empresa para rutas que requieren empresa
  if (authInfo.role === 'empresa') {
    req.empresa = authInfo.user;
  }
  
  next();
};

module.exports = authenticate;