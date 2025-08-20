class Estudiante {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.email = data.email;
    this.legajo = data.legajo;
    this.password = data.password;
    this.role = 'estudiante';
    this.estadoValidacion = data.estadoValidacion || false;
    this.fechaRegistro = data.fechaRegistro || new Date().toISOString();
    this.token = data.token || null;
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

    if (!data.password) {
      errors.push('Password es requerido');
    } else if (data.password.length < 6) {
      errors.push('Password debe tener al menos 6 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
