const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { readDB, writeDB } = require('./dbUtils');

class TokenUtils {
  /**
   * Genera un token JWT de acceso
   * @param {string} userId - ID del usuario
   * @param {string} role - Rol del usuario (estudiante/empresa)
   * @returns {string} - Token JWT firmado
   */
  static generateAccessToken(userId, role) {
    try {
      const payload = {
        sub: userId,
        role: role,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          issuer: 'pasantias-utn',
          audience: 'pasantias-app'
        }
      );
    } catch (error) {
      console.error('Error generando access token:', error);
      throw new Error('Error al generar token de acceso');
    }
  }

  /**
   * Genera un refresh token seguro
   * @param {string} userId - ID del usuario
   * @param {string} role - Rol del usuario
   * @returns {Object} - Refresh token y su hash para almacenar
   */
  static generateRefreshToken(userId, role) {
    try {
      // Generar token aleatorio seguro
      const token = crypto.randomBytes(32).toString('hex');
      
      // Hash del token para almacenar en DB
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const refreshTokenData = {
        tokenHash,
        userId,
        role,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 días
        isActive: true
      };

      return {
        token,
        refreshTokenData
      };
    } catch (error) {
      console.error('Error generando refresh token:', error);
      throw new Error('Error al generar refresh token');
    }
  }

  /**
   * Verifica un token JWT de acceso
   * @param {string} token - Token JWT a verificar
   * @returns {Object|null} - Payload del token si es válido, null si no
   */
  static verifyAccessToken(token) {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'pasantias-utn',
        audience: 'pasantias-app'
      });

      // Verificar que es un token de acceso
      if (decoded.type !== 'access') {
        return null;
      }

      return {
        userId: decoded.sub,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('Token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        console.log('Token inválido:', error.message);
      } else {
        console.error('Error verificando token:', error);
      }
      return null;
    }
  }

  /**
   * Verifica un refresh token
   * @param {string} refreshToken - Refresh token a verificar
   * @returns {Object|null} - Datos del token si es válido
   */
  static verifyRefreshToken(refreshToken) {
    try {
      if (!refreshToken) return null;

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const dbData = readDB();
      
      if (!dbData.refreshTokens) {
        dbData.refreshTokens = [];
      }

      const storedToken = dbData.refreshTokens.find(t => 
        t.tokenHash === tokenHash && 
        t.isActive && 
        new Date(t.expiresAt) > new Date()
      );

      return storedToken || null;
    } catch (error) {
      console.error('Error verificando refresh token:', error);
      return null;
    }
  }

  /**
   * Almacena un refresh token en la base de datos
   * @param {Object} refreshTokenData - Datos del refresh token
   */
  static storeRefreshToken(refreshTokenData) {
    try {
      const dbData = readDB();
      
      if (!dbData.refreshTokens) {
        dbData.refreshTokens = [];
      }

      // Limpiar tokens expirados del mismo usuario
      dbData.refreshTokens = dbData.refreshTokens.filter(t => 
        !(t.userId === refreshTokenData.userId && t.role === refreshTokenData.role) ||
        (new Date(t.expiresAt) > new Date() && t.isActive)
      );

      dbData.refreshTokens.push(refreshTokenData);
      writeDB(dbData);
    } catch (error) {
      console.error('Error almacenando refresh token:', error);
      throw new Error('Error al almacenar refresh token');
    }
  }

  /**
   * Revoca un refresh token
   * @param {string} refreshToken - Token a revocar
   */
  static revokeRefreshToken(refreshToken) {
    try {
      if (!refreshToken) return;

      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const dbData = readDB();
      
      if (!dbData.refreshTokens) return;

      const tokenIndex = dbData.refreshTokens.findIndex(t => t.tokenHash === tokenHash);
      if (tokenIndex >= 0) {
        dbData.refreshTokens[tokenIndex].isActive = false;
        writeDB(dbData);
      }
    } catch (error) {
      console.error('Error revocando refresh token:', error);
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} role - Rol del usuario
   */
  static revokeAllUserTokens(userId, role) {
    try {
      const dbData = readDB();
      
      if (!dbData.refreshTokens) return;

      dbData.refreshTokens = dbData.refreshTokens.map(t => {
        if (t.userId === userId && t.role === role) {
          return { ...t, isActive: false };
        }
        return t;
      });

      writeDB(dbData);
    } catch (error) {
      console.error('Error revocando tokens del usuario:', error);
    }
  }

  /**
   * Genera un token para aprobación de registro (one-time use)
   * @param {string} userId - ID del usuario a aprobar
   * @param {string} tipo - Tipo de usuario (estudiante/empresa)
   * @returns {string} - Token JWT firmado para aprobación
   */
  static generateApprovalToken(userId, tipo) {
    try {
      const payload = {
        sub: userId,
        action: 'approve_registration',
        tipo: tipo,
        type: 'approval',
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(
        payload,
        process.env.APPROVAL_TOKEN_SECRET || process.env.JWT_SECRET,
        {
          expiresIn: process.env.APPROVAL_TOKEN_EXPIRES_IN || '24h',
          issuer: 'pasantias-utn',
          audience: 'pasantias-approval'
        }
      );
    } catch (error) {
      console.error('Error generando token de aprobación:', error);
      throw new Error('Error al generar token de aprobación');
    }
  }

  /**
   * Verifica un token de aprobación
   * @param {string} token - Token de aprobación a verificar
   * @returns {Object|null} - Payload del token si es válido
   */
  static verifyApprovalToken(token) {
    try {
      if (!token) return null;

      const decoded = jwt.verify(
        token, 
        process.env.APPROVAL_TOKEN_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'pasantias-utn',
          audience: 'pasantias-approval'
        }
      );

      // Verificar que es un token de aprobación
      if (decoded.type !== 'approval' || decoded.action !== 'approve_registration') {
        return null;
      }

      return {
        userId: decoded.sub,
        tipo: decoded.tipo,
        action: decoded.action
      };
    } catch (error) {
      console.error('Error verificando token de aprobación:', error);
      return null;
    }
  }
}

module.exports = TokenUtils;
