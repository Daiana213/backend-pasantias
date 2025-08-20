class Pasantia {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.empresaId = data.empresaId;
    this.titulo = data.titulo;
    this.carreraSugerida = data.carreraSugerida;
    this.areaSector = data.areaSector;
    this.descripcionTareas = data.descripcionTareas;
    this.requisitos = data.requisitos;
    this.duracionEstimada = data.duracionEstimada;
    this.cargaHorariaSemanal = data.cargaHorariaSemanal;
    this.horarioPropuesto = data.horarioPropuesto;
    this.tipoJornada = data.tipoJornada;
    this.modalidad = data.modalidad;
    this.fechaInicioEstimada = data.fechaInicioEstimada;
    this.fechaLimitePostulacion = data.fechaLimitePostulacion;
    this.observacionesAdicionales = data.observacionesAdicionales;
    this.estado = data.estado || 'pendiente_sau';
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.postulaciones = data.postulaciones || [];
    this.estudianteSeleccionado = data.estudianteSeleccionado || null;
    this.fechaInicio = data.fechaInicio || null;
    this.fechaAprobacion = data.fechaAprobacion || null;
    this.fechaRechazo = data.fechaRechazo || null;
    this.motivoRechazo = data.motivoRechazo || null;
  }

  // Campos requeridos para crear una pasantía
  static get requiredFields() {
    return [
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
  }

  // Estados válidos de una pasantía
  static get validStates() {
    return [
      'pendiente_sau',
      'oferta',
      'rechazada',
      'en_proceso',
      'completada',
      'cancelada'
    ];
  }

  // Validaciones
  static validate(data) {
    const errors = [];

    // Validar campos requeridos
    const missingFields = this.requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      errors.push(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }

    // Validar fechas
    if (data.fechaInicioEstimada && data.fechaLimitePostulacion) {
      const fechaInicio = new Date(data.fechaInicioEstimada);
      const fechaLimite = new Date(data.fechaLimitePostulacion);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
      
      if (fechaLimite >= fechaInicio) {
        errors.push('La fecha límite de postulación debe ser anterior a la fecha de inicio estimada');
      }
      
      if (fechaLimite < hoy) {
        errors.push('La fecha límite de postulación debe ser hoy o futura');
      }
    }

    // Validar estado
    if (data.estado && !this.validStates.includes(data.estado)) {
      errors.push(`Estado inválido. Estados válidos: ${this.validStates.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Método para agregar una postulación
  addPostulacion(estudianteId) {
    // Verificar si ya está postulado
    if (this.postulaciones.some(p => p.estudianteId === estudianteId)) {
      return { success: false, message: 'El estudiante ya se postuló a esta pasantía' };
    }

    this.postulaciones.push({
      estudianteId,
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    });

    return { success: true, message: 'Postulación agregada exitosamente' };
  }

  // Método para aceptar una postulación
  acceptPostulacion(estudianteId) {
    const postulacion = this.postulaciones.find(p => p.estudianteId === estudianteId);
    
    if (!postulacion) {
      return { success: false, message: 'Postulación no encontrada' };
    }

    // Actualizar estado de la postulación y la pasantía
    postulacion.estado = 'aceptada';
    this.estado = 'en_proceso';
    this.estudianteSeleccionado = estudianteId;
    this.fechaInicio = new Date().toISOString();

    // Rechazar otras postulaciones
    this.postulaciones.forEach(p => {
      if (p.estudianteId !== estudianteId) {
        p.estado = 'rechazada';
      }
    });

    return { success: true, message: 'Postulación aceptada exitosamente' };
  }

  // Método para aprobar la oferta
  aprobar() {
    this.estado = 'oferta';
    this.fechaAprobacion = new Date().toISOString();
  }

  // Método para rechazar la oferta
  rechazar(motivo) {
    this.estado = 'rechazada';
    this.fechaRechazo = new Date().toISOString();
    this.motivoRechazo = motivo;
  }

  // Método para verificar si la pasantía está disponible para postulaciones
  isAvailableForApplications() {
    return this.estado === 'oferta' && 
           new Date() <= new Date(this.fechaLimitePostulacion);
  }

  // Método para obtener datos públicos de la pasantía
  getPublicData() {
    return {
      id: this.id,
      titulo: this.titulo,
      carreraSugerida: this.carreraSugerida,
      areaSector: this.areaSector,
      descripcionTareas: this.descripcionTareas,
      requisitos: this.requisitos,
      duracionEstimada: this.duracionEstimada,
      cargaHorariaSemanal: this.cargaHorariaSemanal,
      horarioPropuesto: this.horarioPropuesto,
      tipoJornada: this.tipoJornada,
      modalidad: this.modalidad,
      fechaInicioEstimada: this.fechaInicioEstimada,
      fechaLimitePostulacion: this.fechaLimitePostulacion,
      observacionesAdicionales: this.observacionesAdicionales,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion
    };
  }
}

module.exports = Pasantia;
