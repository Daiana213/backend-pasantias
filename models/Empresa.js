class Empresa {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.nombre = data.nombre;
    this.correo = data.correo;
    this.personaContacto = data.personaContacto;
    this.telefono = data.telefono;
    this.direccion = data.direccion;
    this.contraseña = data.contraseña;
    this.role = 'empresa';
    this.estadoValidacion = data.estadoValidacion || false;
    this.fechaRegistro = data.fechaRegistro || new Date().toISOString();
    this.token = data.token || null;
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

    if (!data.contraseña) {
      errors.push('Contraseña es requerida');
    } else if (data.contraseña.length < 6) {
      errors.push('Contraseña debe tener al menos 6 caracteres');
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
