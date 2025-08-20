class ValidationUtils {
  // Validar formato de email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar que una fecha sea futura
  static isFutureDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  }

  // Validar que una fecha sea válida
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  // Validar longitud de string
  static isValidLength(str, min = 0, max = Infinity) {
    if (typeof str !== 'string') return false;
    return str.length >= min && str.length <= max;
  }

  // Validar que un string no esté vacío
  static isNotEmpty(str) {
    return typeof str === 'string' && str.trim().length > 0;
  }

  // Validar teléfono (formato simple)
  static isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
  }

  // Validar legajo (números, mínimo 4 dígitos)
  static isValidLegajo(legajo) {
    const legajoRegex = /^\d{4,}$/;
    return legajoRegex.test(legajo);
  }

  // Validar contraseña (mínimo 6 caracteres)
  static isValidPassword(password) {
    return typeof password === 'string' && password.length >= 6;
  }

  // Validar que un valor esté en una lista de opciones válidas
  static isValidOption(value, validOptions) {
    return validOptions.includes(value);
  }

  // Validar datos de estudiante
  static validateEstudiante(data) {
    const errors = [];

    if (!data.email) {
      errors.push('Email es requerido');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Email no tiene un formato válido');
    }

    if (!data.legajo) {
      errors.push('Legajo es requerido');
    } else if (!this.isValidLegajo(data.legajo)) {
      errors.push('Legajo debe tener al menos 4 dígitos');
    }

    if (!data.password) {
      errors.push('Contraseña es requerida');
    } else if (!this.isValidPassword(data.password)) {
      errors.push('Contraseña debe tener al menos 6 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar datos de empresa
  static validateEmpresa(data) {
    const errors = [];

    if (!this.isNotEmpty(data.nombre)) {
      errors.push('Nombre de la empresa es requerido');
    }

    if (!data.correo) {
      errors.push('Correo es requerido');
    } else if (!this.isValidEmail(data.correo)) {
      errors.push('Correo no tiene un formato válido');
    }

    if (!this.isNotEmpty(data.personaContacto)) {
      errors.push('Persona de contacto es requerida');
    }

    if (!data.telefono) {
      errors.push('Teléfono es requerido');
    } else if (!this.isValidPhone(data.telefono)) {
      errors.push('Teléfono no tiene un formato válido');
    }

    if (!this.isNotEmpty(data.direccion)) {
      errors.push('Dirección es requerida');
    }

    if (!data.contraseña) {
      errors.push('Contraseña es requerida');
    } else if (!this.isValidPassword(data.contraseña)) {
      errors.push('Contraseña debe tener al menos 6 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar datos de pasantía
  static validatePasantia(data) {
    const errors = [];

    const requiredFields = [
      'titulo',
      'carreraSugerida',
      'areaSector',
      'descripcionTareas',
      'requisitos',
      'duracionEstimada',
      'cargaHorariaSemanal',
      'horarioPropuesto',
      'tipoJornada',
      'modalidad',
      'fechaInicioEstimada',
      'fechaLimitePostulacion'
    ];

    const missingFields = requiredFields.filter(field => !this.isNotEmpty(data[field]));
    if (missingFields.length > 0) {
      errors.push(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }

    // Validar fechas
    if (data.fechaInicioEstimada && !this.isValidDate(data.fechaInicioEstimada)) {
      errors.push('Fecha de inicio estimada no es válida');
    }

    if (data.fechaLimitePostulacion && !this.isValidDate(data.fechaLimitePostulacion)) {
      errors.push('Fecha límite de postulación no es válida');
    }

    if (data.fechaInicioEstimada && data.fechaLimitePostulacion) {
      const fechaInicio = new Date(data.fechaInicioEstimada);
      const fechaLimite = new Date(data.fechaLimitePostulacion);
      
      if (fechaLimite >= fechaInicio) {
        errors.push('La fecha límite de postulación debe ser anterior a la fecha de inicio estimada');
      }
      
      if (!this.isFutureDate(data.fechaLimitePostulacion)) {
        errors.push('La fecha límite de postulación debe ser futura');
      }
    }

    // Validar opciones específicas
    const validTiposJornada = ['completa', 'parcial', 'flexible'];
    if (data.tipoJornada && !this.isValidOption(data.tipoJornada, validTiposJornada)) {
      errors.push('Tipo de jornada inválido');
    }

    const validModalidades = ['presencial', 'remoto', 'mixto'];
    if (data.modalidad && !this.isValidOption(data.modalidad, validModalidades)) {
      errors.push('Modalidad inválida');
    }

    // Validar rangos numéricos
    if (data.cargaHorariaSemanal) {
      const horas = parseInt(data.cargaHorariaSemanal);
      if (isNaN(horas) || horas < 1 || horas > 48) {
        errors.push('Carga horaria semanal debe estar entre 1 y 48 horas');
      }
    }

    if (data.duracionEstimada) {
      const duracion = parseInt(data.duracionEstimada);
      if (isNaN(duracion) || duracion < 1 || duracion > 24) {
        errors.push('Duración estimada debe estar entre 1 y 24 meses');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar datos de notificación
  static validateNotificacion(data) {
    const errors = [];

    if (!data.usuarioId) {
      errors.push('ID de usuario es requerido');
    }

    if (!data.tipo) {
      errors.push('Tipo de notificación es requerido');
    } else if (!this.isValidOption(data.tipo, ['estudiante', 'empresa'])) {
      errors.push('Tipo de notificación inválido');
    }

    if (!this.isNotEmpty(data.titulo)) {
      errors.push('Título es requerido');
    }

    if (!this.isNotEmpty(data.mensaje)) {
      errors.push('Mensaje es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitizar string (remover caracteres peligrosos)
  static sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]*>/g, '')
              .trim();
  }

  // Normalizar email (convertir a minúsculas)
  static normalizeEmail(email) {
    return typeof email === 'string' ? email.toLowerCase().trim() : '';
  }

  // Validar ID (debe ser un string no vacío)
  static isValidId(id) {
    return typeof id === 'string' && id.trim().length > 0;
  }

  // Validar paginación
  static validatePagination(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    return {
      page: Math.max(1, pageNum),
      limit: Math.max(1, Math.min(100, limitNum)) // Máximo 100 elementos por página
    };
  }
}

module.exports = ValidationUtils;
