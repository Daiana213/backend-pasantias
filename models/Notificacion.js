class Notificacion {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.usuarioId = data.usuarioId;
    this.tipo = data.tipo; // 'estudiante' o 'empresa'
    this.titulo = data.titulo;
    this.mensaje = data.mensaje;
    this.leida = data.leida || false;
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.relatedId = data.relatedId || null; // ID relacionado (pasantía, postulación, etc.)
    this.relatedType = data.relatedType || null; // 'pasantia', 'postulacion', etc.
  }

  // Tipos válidos de notificación
  static get validTypes() {
    return ['estudiante', 'empresa'];
  }

  // Tipos de entidades relacionadas válidas
  static get validRelatedTypes() {
    return ['pasantia', 'postulacion', 'registro', 'sistema'];
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    if (!data.usuarioId) {
      errors.push('ID de usuario es requerido');
    }

    if (!data.tipo) {
      errors.push('Tipo de notificación es requerido');
    } else if (!this.validTypes.includes(data.tipo)) {
      errors.push(`Tipo inválido. Tipos válidos: ${this.validTypes.join(', ')}`);
    }

    if (!data.titulo) {
      errors.push('Título es requerido');
    }

    if (!data.mensaje) {
      errors.push('Mensaje es requerido');
    }

    if (data.relatedType && !this.validRelatedTypes.includes(data.relatedType)) {
      errors.push(`Tipo relacionado inválido. Tipos válidos: ${this.validRelatedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Método para marcar como leída
  markAsRead() {
    this.leida = true;
  }

  // Método para marcar como no leída
  markAsUnread() {
    this.leida = false;
  }

  // Método estático para crear notificación de registro aprobado
  static createRegistroAprobado(usuarioId, tipo, nombreUsuario) {
    return new Notificacion({
      usuarioId,
      tipo,
      titulo: 'Registro Aprobado',
      mensaje: `¡Felicitaciones ${nombreUsuario}! Tu registro ha sido aprobado. Ya puedes acceder a todas las funcionalidades del sistema.`,
      relatedType: 'registro'
    });
  }

  // Método estático para crear notificación de nueva postulación
  static createNuevaPostulacion(empresaId, pasantiaId, estudianteNombre, pasantiaTitulo) {
    return new Notificacion({
      usuarioId: empresaId,
      tipo: 'empresa',
      titulo: 'Nueva Postulación',
      mensaje: `${estudianteNombre} se ha postulado a tu oferta "${pasantiaTitulo}".`,
      relatedId: pasantiaId,
      relatedType: 'postulacion'
    });
  }

  // Método estático para crear notificación de postulación aceptada
  static createPostulacionAceptada(estudianteId, pasantiaId, pasantiaTitulo, empresaNombre) {
    return new Notificacion({
      usuarioId: estudianteId,
      tipo: 'estudiante',
      titulo: 'Postulación Aceptada',
      mensaje: `¡Felicitaciones! Tu postulación para "${pasantiaTitulo}" en ${empresaNombre} ha sido aceptada.`,
      relatedId: pasantiaId,
      relatedType: 'postulacion'
    });
  }

  // Método estático para crear notificación de postulación rechazada
  static createPostulacionRechazada(estudianteId, pasantiaId, pasantiaTitulo, empresaNombre) {
    return new Notificacion({
      usuarioId: estudianteId,
      tipo: 'estudiante',
      titulo: 'Postulación No Seleccionada',
      mensaje: `Tu postulación para "${pasantiaTitulo}" en ${empresaNombre} no fue seleccionada en esta ocasión.`,
      relatedId: pasantiaId,
      relatedType: 'postulacion'
    });
  }

  // Método estático para crear notificación de oferta aprobada
  static createOfertaAprobada(empresaId, pasantiaId, pasantiaTitulo) {
    return new Notificacion({
      usuarioId: empresaId,
      tipo: 'empresa',
      titulo: 'Oferta Aprobada',
      mensaje: `Tu oferta de pasantía "${pasantiaTitulo}" ha sido aprobada y publicada.`,
      relatedId: pasantiaId,
      relatedType: 'pasantia'
    });
  }

  // Método estático para crear notificación de oferta rechazada
  static createOfertaRechazada(empresaId, pasantiaId, pasantiaTitulo, motivo) {
    return new Notificacion({
      usuarioId: empresaId,
      tipo: 'empresa',
      titulo: 'Oferta Rechazada',
      mensaje: `Tu oferta de pasantía "${pasantiaTitulo}" requiere modificaciones: ${motivo}`,
      relatedId: pasantiaId,
      relatedType: 'pasantia'
    });
  }
}

module.exports = Notificacion;
