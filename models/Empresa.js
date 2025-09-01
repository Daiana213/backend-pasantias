const { v4: uuidv4 } = require('uuid');
const PasswordUtils = require('../utils/passwordUtils');

class Empresa {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.nombre = data.nombre;
    this.correo = data.correo;
    this.personaContacto = data.personaContacto;
    this.telefono = data.telefono;
    this.direccion = data.direccion;
    this.contraseña = data.contraseña; // Se almacenará hasheada
    this.role = 'empresa';
    this.estadoValidacion = data.estadoValidacion || false;
    this.fechaRegistro = data.fechaRegistro || new Date().toISOString();
    // Eliminamos token - ahora usamos JWT sin almacenar en DB
    
    // Campos adicionales del perfil
    this.descripcion = data.descripcion || '';
    this.sitioWeb = data.sitioWeb || '';
    this.sector = data.sector || '';
    this.tamaño = data.tamaño || '';
    
    // Configuraciones
    this.configuraciones = data.configuraciones || {
      notificaciones: {
        email: true,
        nuevas_postulaciones: true,
        recordatorios: true,
        reportes: false
      },
      privacidad: {
        perfil_publico: true,
        mostrar_contacto: true,
        mostrar_direccion: false
      },
      preferencias: {
        auto_aprobar_postulaciones: false,
        limite_postulaciones_pasantia: 10,
        duracion_maxima_respuesta: 7
      }
    };
    
    this.fechaActualizacion = data.fechaActualizacion || null;
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    if (!data.nombre) {
      errors.push('Nombre de la empresa es requerido');
    }

    if (!data.correo) {
      errors.push('Correo es requerido');
    } else if (!this.isValidEmail(data.correo)) {
      errors.push('Correo no tiene un formato válido');
    }

    if (!data.personaContacto) {
      errors.push('Persona de contacto es requerida');
    }

    if (!data.telefono) {
      errors.push('Teléfono es requerido');
    }

    if (!data.direccion) {
      errors.push('Dirección es requerida');
    }

    // Usar la nueva validación de contraseña segura
    if (!data.contraseña) {
      errors.push('Contraseña es requerida');
    } else {
      const passwordValidation = PasswordUtils.validatePasswordStrength(data.contraseña);
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
    if (this.contraseña) {
      this.contraseña = await PasswordUtils.hashPassword(this.contraseña);
    }
  }

  /**
   * Método para verificar contraseña
   */
  async verifyPassword(plainPassword) {
    return await PasswordUtils.verifyPassword(plainPassword, this.contraseña);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Método para serializar la empresa (sin contraseña para respuestas)
  toJSON() {
    const { contraseña, ...empresaData } = this;
    return empresaData;
  }

  // Método para obtener datos públicos de la empresa
  getPublicData() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      personaContacto: this.personaContacto,
      telefono: this.telefono,
      direccion: this.direccion,
      role: this.role,
      estadoValidacion: this.estadoValidacion,
      fechaRegistro: this.fechaRegistro
    };
  }
}

module.exports = Empresa;
