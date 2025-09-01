const bcrypt = require('bcryptjs');

/**
 * Utilidades para manejo seguro de contraseñas
 * Implementa bcrypt con salt rounds altos y validación robusta
 */
class PasswordUtils {
  /**
   * Hashea una contraseña usando bcrypt con salt rounds seguros
   * @param {string} password - Contraseña en texto plano
   * @returns {Promise<string>} - Hash de la contraseña
   */
  static async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Contraseña inválida para hashear');
      }

      // Usar 12 salt rounds para mayor seguridad (mayor que el estándar de 10)
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Error hasheando contraseña:', error);
      throw new Error('Error al procesar contraseña');
    }
  }

  /**
   * Verifica una contraseña contra su hash
   * @param {string} plainPassword - Contraseña en texto plano
   * @param {string} hashedPassword - Hash almacenado
   * @returns {Promise<boolean>} - true si la contraseña coincide
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      if (!plainPassword || !hashedPassword) {
        return false;
      }

      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verificando contraseña:', error);
      return false;
    }
  }

  /**
   * Valida la fuerza de una contraseña según criterios de seguridad
   * @param {string} password - Contraseña a validar
   * @returns {Object} - Resultado de validación con errores específicos
   */
  static validatePasswordStrength(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      return { isValid: false, errors: ['Contraseña requerida'] };
    }

    // Validaciones de seguridad
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (password.length > 128) {
      errors.push('La contraseña no puede exceder 128 caracteres');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Debe incluir al menos una letra mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Debe incluir al menos una letra minúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('Debe incluir al menos un número');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Debe incluir al menos un carácter especial (!@#$%^&*(),.?":{}|<>)');
    }

    // Verificar contra contraseñas comunes
    if (this.isCommonPassword(password)) {
      errors.push('No se puede usar una contraseña común o predecible');
    }

    // Verificar secuencias repetitivas
    if (this.hasRepeatingPatterns(password)) {
      errors.push('No se pueden usar patrones repetitivos (ej: 1111, abab)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Verifica si una contraseña está en la lista de contraseñas comunes
   * @param {string} password - Contraseña a verificar
   * @returns {boolean} - true si es una contraseña común
   */
  static isCommonPassword(password) {
    const commonPasswords = [
      '123456', 'password', 'admin', 'qwerty', '12345678',
      'abc123', 'password123', 'admin123', '123456789',
      'qwerty123', 'letmein', 'monkey', 'dragon', 'welcome',
      'shadow', 'master', 'michael', 'superman', 'jennifer',
      'jordan', 'harley', 'hunter', 'fuckyou', 'trustno1',
      'passw0rd', '1234567890', 'football', 'baseball'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Detecta patrones repetitivos en contraseñas
   * @param {string} password - Contraseña a analizar
   * @returns {boolean} - true si tiene patrones repetitivos
   */
  static hasRepeatingPatterns(password) {
    // Verificar caracteres consecutivos repetidos (más de 3)
    if (/(.)\1{3,}/.test(password)) {
      return true;
    }

    // Verificar secuencias ascendentes (123456)
    for (let i = 0; i < password.length - 3; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);
      const char4 = password.charCodeAt(i + 3);

      if (char2 === char1 + 1 && char3 === char2 + 1 && char4 === char3 + 1) {
        return true;
      }
    }

    // Verificar patrones repetidos (abab, 1212)
    for (let len = 2; len <= password.length / 2; len++) {
      const pattern = password.substring(0, len);
      const repeated = pattern.repeat(Math.floor(password.length / len));
      if (password.startsWith(repeated) && repeated.length >= 4) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calcula la fuerza de una contraseña (0-5)
   * @param {string} password - Contraseña a evaluar
   * @returns {number} - Puntuación de fuerza (0=muy débil, 5=muy fuerte)
   */
  static calculatePasswordStrength(password) {
    let score = 0;

    // Longitud
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Complejidad de caracteres
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    // Penalizar patrones comunes
    if (this.isCommonPassword(password)) score = Math.max(0, score - 2);
    if (this.hasRepeatingPatterns(password)) score = Math.max(0, score - 1);

    // Bonus por alta entropía
    if (password.length >= 16 && this.hasHighEntropy(password)) {
      score = Math.min(5, score + 1);
    }

    return Math.max(0, Math.min(5, score));
  }

  /**
   * Verifica si una contraseña tiene alta entropía
   * @param {string} password - Contraseña a analizar
   * @returns {boolean} - true si tiene alta entropía
   */
  static hasHighEntropy(password) {
    const charSets = [
      /[a-z]/g,      // minúsculas
      /[A-Z]/g,      // mayúsculas  
      /\d/g,         // números
      /[!@#$%^&*(),.?":{}|<>]/g, // especiales
      /[\s]/g        // espacios
    ];

    let charSetCount = 0;
    let totalChars = 0;

    for (const regex of charSets) {
      const matches = password.match(regex);
      if (matches && matches.length > 0) {
        charSetCount++;
        totalChars += matches.length;
      }
    }

    // Alta entropía: usa al menos 3 tipos de caracteres con buena distribución
    return charSetCount >= 3 && totalChars / password.length >= 0.7;
  }

  /**
   * Genera una contraseña temporal segura
   * @param {number} length - Longitud deseada (mínimo 12)
   * @returns {string} - Contraseña temporal generada
   */
  static generateTemporaryPassword(length = 12) {
    if (length < 12) length = 12;

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specials = '!@#$%^&*()';

    let password = '';

    // Garantizar al menos un carácter de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specials[Math.floor(Math.random() * specials.length)];

    // Completar con caracteres aleatorios
    const allChars = lowercase + uppercase + numbers + specials;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar caracteres para evitar patrones
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Verifica si una contraseña hasheada necesita rehashing
   * (útil para migrar a salt rounds más altos)
   * @param {string} hashedPassword - Hash existente
   * @returns {boolean} - true si necesita rehashing
   */
  static needsRehashing(hashedPassword) {
    try {
      // bcrypt almacena el número de rounds en el hash
      const rounds = bcrypt.getRounds(hashedPassword);
      return rounds < 12; // Rehash si tiene menos de 12 rounds
    } catch (error) {
      // Si no es un hash válido de bcrypt, necesita rehashing
      return true;
    }
  }
}

module.exports = PasswordUtils;
