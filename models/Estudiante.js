const { v4: uuidv4 } = require('uuid');
const PasswordUtils = require('../utils/passwordUtils');

class Estudiante {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.legajo = data.legajo;
    this.password = data.password; // Se almacenará hasheada
    this.role = 'estudiante';
    this.estadoValidacion = data.estadoValidacion || false;
    this.fechaRegistro = data.fechaRegistro || new Date().toISOString();
    // Eliminamos token - ahora usamos JWT sin almacenar en DB
    
    // Campos adicionales del perfil
    this.nombre = data.nombre || '';
    this.apellido = data.apellido || '';
    this.telefono = data.telefono || '';
    this.carrera = data.carrera || '';
    this.añoIngreso = data.añoIngreso || '';
    this.materias_aprobadas = data.materias_aprobadas || '';
    this.promedio = data.promedio || '';
    this.experienciaLaboral = data.experienciaLaboral || '';
    this.habilidades = data.habilidades || '';
    this.linkedin = data.linkedin || '';
    this.github = data.github || '';
    this.cv_url = data.cv_url || '';
    
    // Configuraciones
    this.configuraciones = data.configuraciones || {
      notificaciones: {
        email: true,
        nuevas_pasantias: true,
        actualizaciones_postulacion: true,
        recordatorios: true
      },
      privacidad: {
        perfil_publico: false,
        mostrar_email: false,
        mostrar_telefono: false
      },
      preferencias: {
        modalidad_preferida: '',
        tipo_jornada_preferida: '',
        areas_interes: []
      }
    };
    
    this.fechaActualizacion = data.fechaActualizacion || null;
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    if (!data.email) {
      errors.push('Email es requerido');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Email no tiene un formato válido');
    }

    if (!data.legajo) {
      errors.push('Legajo es requerido');
    }

    // Usar la nueva validación de contraseña segura
    if (!data.password) {
      errors.push('Contraseña es requerida');
    } else {
      const passwordValidation = PasswordUtils.validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Método para hashear la contraseña antes de guardar
   */
  async hashPassword() {
    if (this.password) {
      this.password = await PasswordUtils.hashPassword(this.password);
    }
  }

  /**
   * Método para verificar contraseña
   */
  async verifyPassword(plainPassword) {
    return await PasswordUtils.verifyPassword(plainPassword, this.password);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método para serializar el estudiante (sin password para respuestas)
  toJSON() {
    const { password, ...studentData } = this;
    return studentData;
  }

  // Método para obtener datos públicos del estudiante
  getPublicData() {
    return {
      id: this.id,
      email: this.email,
      legajo: this.legajo,
      role: this.role,
      estadoValidacion: this.estadoValidacion,
      fechaRegistro: this.fechaRegistro
    };
  }
}

module.exports = Estudiante;
