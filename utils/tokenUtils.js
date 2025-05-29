const tokenUtils = {
  generate: (userId, role) => {
    const timestamp = Date.now().toString(36);
    const randomBytes = Math.random().toString(36).substr(2);
    const userIdHash = userId.toString(36);
    return `${timestamp}-${userIdHash}-${role}-${randomBytes}`;
  },

  verify: (token, dbData) => {
    if (!token) return null;
    
    // Buscar en estudiantes
    const estudiante = dbData.estudiantes.find(e => e.token === token);
    if (estudiante) return { user: estudiante, role: 'estudiante' };
    
    // Buscar en empresas
    const empresa = dbData.empresas.find(e => e.token === token);
    if (empresa) return { user: empresa, role: 'empresa' };
    
    return null;
  },

  refresh: (oldToken, dbData) => {
    const user = tokenUtils.verify(oldToken, dbData);
    if (!user) return null;
    
    return tokenUtils.generate(user.user.id, user.role);
  }
};

module.exports = tokenUtils;