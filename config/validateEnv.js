const crypto = require('crypto');

/**
 * Validador de variables de entorno críticas para seguridad
 * Debe ejecutarse al inicio de la aplicación para garantizar configuración segura
 */
class EnvValidator {
  /**
   * Valida que todas las variables de entorno críticas estén configuradas
   * y cumplan con los requisitos de seguridad
   */
  static validate() {
    console.log('🔍 Validando configuración de seguridad...');

    // Variables obligatorias
    const requiredVars = [
      'JWT_SECRET',
      'EMAIL_USER', 
      'EMAIL_PASS',
      'NODE_ENV'
    ];

    // Variables recomendadas para producción
    const recommendedVars = [
      'APPROVAL_TOKEN_SECRET',
      'JWT_EXPIRES_IN',
      'APPROVAL_TOKEN_EXPIRES_IN',
      'FRONTEND_URL',
      'BACKEND_URL'
    ];

    this.validateRequired(requiredVars);
    this.validateJWTSecurity();
    this.validateEmailConfig();
    this.validateEnvironment();
    this.checkRecommendedVars(recommendedVars);

    console.log('✅ Validación de seguridad completada correctamente');
  }

  /**
   * Valida variables obligatorias
   */
  static validateRequired(requiredVars) {
    const missing = requiredVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      console.error('🚨 FATAL: Variables de entorno críticas faltantes:');
      missing.forEach(env => {
        console.error(`  - ${env}`);
      });
      console.error('\n💡 Asegúrate de configurar estas variables antes de iniciar el servidor.');
      process.exit(1);
    }
  }

  /**
   * Valida configuración específica de JWT
   */
  static validateJWTSecurity() {
    const jwtSecret = process.env.JWT_SECRET;

    // Validar longitud mínima
    if (jwtSecret.length < 32) {
      console.error('🚨 FATAL: JWT_SECRET debe tener al menos 32 caracteres para ser seguro');
      console.error(`   Actual: ${jwtSecret.length} caracteres`);
      console.error('💡 Genera un secret seguro: openssl rand -hex 32');
      process.exit(1);
    }

    // Validar complejidad
    if (this.isWeakSecret(jwtSecret)) {
      console.error('🚨 FATAL: JWT_SECRET es demasiado predecible o débil');
      console.error('💡 Usa un secret generado criptográficamente: openssl rand -hex 32');
      process.exit(1);
    }

    // Verificar que no sea un valor por defecto común
    const commonSecrets = [
      'secret', 'mysecret', 'jwt_secret', 'your_secret_key',
      'change_me', 'default', '123456', 'password'
    ];

    if (commonSecrets.some(common => jwtSecret.toLowerCase().includes(common))) {
      console.error('🚨 FATAL: JWT_SECRET parece ser un valor por defecto o común');
      console.error('💡 Genera un secret único y seguro');
      process.exit(1);
    }

    console.log('✅ JWT_SECRET configurado correctamente');
  }

  /**
   * Valida configuración de email
   */
  static validateEmailConfig() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailUser)) {
      console.error('🚨 FATAL: EMAIL_USER no tiene formato de email válido');
      process.exit(1);
    }

    // Validar que no sea una contraseña de aplicación débil
    if (emailPass.length < 8) {
      console.error('🚨 FATAL: EMAIL_PASS demasiado corta para ser segura');
      console.error('💡 Usa contraseñas de aplicación de Gmail o configuración OAuth2');
      process.exit(1);
    }

    console.log('✅ Configuración de email validada');
  }

  /**
   * Valida configuración del entorno
   */
  static validateEnvironment() {
    const nodeEnv = process.env.NODE_ENV;
    const validEnvironments = ['development', 'production', 'test', 'staging'];

    if (!validEnvironments.includes(nodeEnv)) {
      console.error(`🚨 FATAL: NODE_ENV debe ser uno de: ${validEnvironments.join(', ')}`);
      console.error(`   Actual: ${nodeEnv}`);
      process.exit(1);
    }

    // Validaciones específicas para producción
    if (nodeEnv === 'production') {
      this.validateProductionConfig();
    }

    console.log(`✅ Entorno configurado: ${nodeEnv}`);
  }

  /**
   * Validaciones adicionales para entorno de producción
   */
  static validateProductionConfig() {
    console.log('🔍 Validando configuración de producción...');

    // En producción, ciertos valores deben estar configurados
    const productionRequired = ['FRONTEND_URL', 'BACKEND_URL'];
    const missing = productionRequired.filter(env => !process.env[env]);

    if (missing.length > 0) {
      console.error('🚨 FATAL: Variables requeridas para producción:');
      missing.forEach(env => console.error(`  - ${env}`));
      process.exit(1);
    }

    // Validar URLs de producción
    try {
      new URL(process.env.FRONTEND_URL);
      new URL(process.env.BACKEND_URL);
    } catch (error) {
      console.error('🚨 FATAL: FRONTEND_URL o BACKEND_URL no son URLs válidas');
      process.exit(1);
    }

    // Validar que no sean localhost en producción
    if (process.env.FRONTEND_URL.includes('localhost') || 
        process.env.BACKEND_URL.includes('localhost')) {
      console.error('🚨 FATAL: No usar localhost en URLs de producción');
      process.exit(1);
    }

    console.log('✅ Configuración de producción validada');
  }

  /**
   * Verifica variables recomendadas
   */
  static checkRecommendedVars(recommendedVars) {
    const missing = recommendedVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      console.warn('⚠️  Variables de entorno recomendadas faltantes:');
      missing.forEach(env => {
        console.warn(`   - ${env}`);
      });
      console.warn('💡 Estas variables mejorarán la seguridad del sistema');
    }
  }

  /**
   * Verifica si un secret es débil o predecible
   */
  static isWeakSecret(secret) {
    // Verificar patrones simples
    if (/^(.)\1+$/.test(secret)) return true; // Solo caracteres repetidos
    if (/^(..)\1+$/.test(secret)) return true; // Patrones de 2 chars repetidos
    if (/^123456|abcdef|qwerty/i.test(secret)) return true; // Secuencias comunes

    // Verificar entropía mínima
    const uniqueChars = new Set(secret.split(''));
    const entropy = uniqueChars.size / secret.length;
    
    return entropy < 0.5; // Menos del 50% de chars únicos es sospechoso
  }

  /**
   * Genera un JWT secret seguro para usar como ejemplo
   */
  static generateSecureJWTSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Valida configuración completa y muestra resumen de seguridad
   */
  static validateAndShowSummary() {
    try {
      this.validate();

      console.log('\n📋 Resumen de configuración de seguridad:');
      console.log(`   🌍 Entorno: ${process.env.NODE_ENV}`);
      console.log(`   🔐 JWT Secret: ${process.env.JWT_SECRET.length} caracteres`);
      console.log(`   📧 Email: ${process.env.EMAIL_USER}`);
      console.log(`   🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Por defecto'}`);
      console.log(`   🔗 Backend URL: ${process.env.BACKEND_URL || 'Por defecto'}`);
      console.log('');

      // Mostrar recomendaciones de seguridad adicionales
      if (process.env.NODE_ENV !== 'production') {
        console.log('💡 Recomendaciones para producción:');
        console.log('   - Configurar HTTPS obligatorio');
        console.log('   - Implementar rate limiting más estricto');
        console.log('   - Configurar monitoring de seguridad');
        console.log('   - Usar secrets management (AWS Secrets Manager, etc.)');
        console.log('');
      }

    } catch (error) {
      console.error('❌ Error en validación de configuración:', error.message);
      process.exit(1);
    }
  }
}

module.exports = EnvValidator;
