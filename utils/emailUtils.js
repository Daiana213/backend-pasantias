const nodemailer = require('nodemailer');
const validator = require('validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Configurar DOMPurify para server-side
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// SEGURIDAD: Variables de entorno son obligatorias - sin fallbacks inseguros
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('🚨 FATAL: EMAIL_USER y EMAIL_PASS deben estar configurados en variables de entorno');
  console.error('Configure las variables antes de iniciar el servidor.');
  process.exit(1);
}

const CONFIG = {
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

const API_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.pass
  }
});

/**
 * Clase para sanitización segura de datos en emails
 */
class EmailSecurity {
  /**
   * Sanitiza texto para uso seguro en templates de email
   */
  static sanitizeForEmail(input) {
    if (typeof input !== 'string') return '';
    
    // 1. Escapar HTML para prevenir inyección
    let sanitized = validator.escape(input);
    
    // 2. Limpiar con DOMPurify (solo texto, sin tags)
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // 3. Limitar longitud para prevenir overflow
    sanitized = sanitized.substring(0, 500);
    
    // 4. Remover caracteres de control
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return sanitized.trim();
  }

  /**
   * Sanitiza múltiples campos de datos
   */
  static sanitizeEmailData(data) {
    if (!data || typeof data !== 'object') return {};
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = this.sanitizeForEmail(value);
    }
    return sanitized;
  }

  /**
   * Valida que un email sea seguro antes de enviarlo
   */
  static validateEmailContent(content) {
    // Verificar que no hay scripts o contenido peligroso
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        throw new Error('Contenido de email contiene elementos peligrosos');
      }
    }

    return true;
  }
}

// Template base para emails
const getEmailTemplate = (titulo, contenido) => {
  // Sanitizar título
  const safeTitulo = EmailSecurity.sanitizeForEmail(titulo);
  
  // Validar contenido antes de usar
  EmailSecurity.validateEmailContent(contenido);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${titulo}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: white; padding: 20px; border-radius: 5px; border: 1px solid #e9ecef; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px; }
        .btn-success { background-color: #28a745; }
        .btn-danger { background-color: #dc3545; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sistema de Pasantías UTN</h1>
      </div>
      <div class="content">
        ${contenido}
      </div>
      <div class="footer">
        <p>Este es un email automático del Sistema de Pasantías UTN. Por favor, no responda a este correo.</p>
        <p>© ${new Date().getFullYear()} Universidad Tecnológica Nacional</p>
      </div>
    </body>
    </html>
  `;
};

// Función base para enviar emails
const enviarEmail = async (destinatario, asunto, contenidoHtml) => {
  try {
    const info = await transporter.sendMail({
      from: `"Sistema de Pasantías UTN" <${CONFIG.email.user}>`,
      to: destinatario,
      subject: asunto,
      html: contenidoHtml
    });
    console.log('Email enviado:', info.messageId, 'a', destinatario);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar email a', destinatario, ':', error);
    return { success: false, error: error.message };
  }
};

// Función simplificada para enviar emails con manejo de errores integrado
const enviarEmailSimple = async (destinatario, asunto, mensaje) => {
  // Si el mensaje es texto plano, lo convertimos a HTML básico
  const contenidoHtml = mensaje.startsWith('<') 
    ? mensaje 
    : `<p>${mensaje.replace(/\n/g, '</p><p>')}</p>`;
  
  return enviarEmail(destinatario, asunto, contenidoHtml);
};

// Función para enviar email usando una plantilla predefinida
const enviarEmailConPlantilla = async (destinatario, asunto, nombrePlantilla, datos) => {
  try {
    if (!emailTemplates[nombrePlantilla]) {
      throw new Error(`Plantilla '${nombrePlantilla}' no encontrada`);
    }
    
    const contenidoHtml = emailTemplates[nombrePlantilla](...datos);
    return enviarEmail(destinatario, asunto, contenidoHtml);
  } catch (error) {
    console.error(`Error al usar plantilla '${nombrePlantilla}':`, error);
    return { success: false, error: error.message };
  }
};

// Templates específicos para diferentes tipos de emails
const emailTemplates = {
  // Email de bienvenida para estudiante registrado
  estudianteRegistrado: (email, legajo) => {
    // Sanitizar datos de entrada
    const safeEmail = EmailSecurity.sanitizeForEmail(email);
    const safeLegajo = EmailSecurity.sanitizeForEmail(legajo);
    
    const contenido = `
      <h2>¡Gracias por registrarte!</h2>
      <p>Tu solicitud de registro ha sido recibida y está siendo procesada.</p>
      <p><strong>Datos de registro:</strong></p>
      <ul>
        <li>Legajo: ${safeLegajo}</li>
        <li>Email: ${safeEmail}</li>
      </ul>
      <p>Recibirás una confirmación cuando tu cuenta sea activada.</p>
    `;
    return getEmailTemplate('Registro Exitoso', contenido);
  },

  // Email de notificación al admin para nuevo estudiante
  nuevoEstudiante: (email, legajo, estudianteId) => {
    // Sanitizar datos de entrada
    const safeEmail = EmailSecurity.sanitizeForEmail(email);
    const safeLegajo = EmailSecurity.sanitizeForEmail(legajo);
    const safeEstudianteId = EmailSecurity.sanitizeForEmail(estudianteId);
    
    const contenido = `
      <h2>Nueva solicitud de registro de estudiante</h2>
      <p>Se ha recibido una nueva solicitud de registro:</p>
      <ul>
        <li>Legajo: ${safeLegajo}</li>
        <li>Email: ${safeEmail}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${API_URL}/api/auth/aprobar-registro/${safeEstudianteId}?tipo=estudiante&aprobar=true" 
           class="btn btn-success">Aprobar Registro</a>
      </div>
    `;
    return getEmailTemplate('Nuevo Registro de Estudiante', contenido);
  },

  // Email de bienvenida para empresa registrada
  empresaRegistrada: (nombre, correo) => {
    // Sanitizar datos de entrada
    const safeNombre = EmailSecurity.sanitizeForEmail(nombre);
    const safeCorreo = EmailSecurity.sanitizeForEmail(correo);
    
    const contenido = `
      <h2>¡Gracias por registrar tu empresa!</h2>
      <p>Tu solicitud de registro ha sido recibida y está siendo procesada.</p>
      <p><strong>Datos de registro:</strong></p>
      <ul>
        <li>Empresa: ${safeNombre}</li>
        <li>Email: ${safeCorreo}</li>
      </ul>
      <p>Recibirás una confirmación cuando tu cuenta sea activada.</p>
    `;
    return getEmailTemplate('Registro Exitoso', contenido);
  },

  // Email de notificación al admin para nueva empresa
  nuevaEmpresa: (nombre, correo, personaContacto, empresaId) => {
    // Sanitizar datos de entrada
    const safeNombre = EmailSecurity.sanitizeForEmail(nombre);
    const safeCorreo = EmailSecurity.sanitizeForEmail(correo);
    const safePersonaContacto = EmailSecurity.sanitizeForEmail(personaContacto);
    const safeEmpresaId = EmailSecurity.sanitizeForEmail(empresaId);
    
    const contenido = `
      <h2>Nueva solicitud de registro de empresa</h2>
      <p>Se ha recibido una nueva solicitud de registro:</p>
      <ul>
        <li>Empresa: ${safeNombre}</li>
        <li>Email: ${safeCorreo}</li>
        <li>Contacto: ${safePersonaContacto}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${API_URL}/api/auth/aprobar-registro/${safeEmpresaId}?tipo=empresa&aprobar=true" 
           class="btn btn-success">Aprobar Registro</a>
      </div>
    `;
    return getEmailTemplate('Nuevo Registro de Empresa', contenido);
  },

  // Email de cuenta activada
  cuentaActivada: (nombreUsuario) => {
    const contenido = `
      <h2>¡Tu cuenta ha sido activada!</h2>
      <p>Hola ${nombreUsuario},</p>
      <p>Tu registro ha sido aprobado exitosamente.</p>
      <p>Ya puedes iniciar sesión en el sistema y acceder a todas las funcionalidades.</p>
      <p><strong>¡Bienvenido al Sistema de Pasantías UTN!</strong></p>
    `;
    return getEmailTemplate('Cuenta Activada', contenido);
  },

  // Email de nueva oferta para revisar
  nuevaOferta: (empresaNombre, titulo, carrera, area, pasantiaId) => {
    const contenido = `
      <h2>Nueva oferta de pasantía para revisar</h2>
      <p>Se ha recibido una nueva oferta de pasantía:</p>
      <ul>
        <li>Empresa: ${empresaNombre}</li>
        <li>Título: ${titulo}</li>
        <li>Carrera: ${carrera}</li>
        <li>Área: ${area}</li>
      </ul>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${API_URL}/api/pasantias/${pasantiaId}/aprobar" class="btn btn-success">Aprobar Oferta</a>
      </div>
    `;
    return getEmailTemplate('Nueva Oferta de Pasantía', contenido);
  },

  // Email de oferta aprobada
  ofertaAprobada: (titulo) => {
    const contenido = `
      <h2>¡Tu oferta de pasantía ha sido aprobada!</h2>
      <p>La oferta "${titulo}" ha sido revisada y aprobada por el SAU.</p>
      <p>La oferta ya está publicada y visible para los estudiantes.</p>
    `;
    return getEmailTemplate('Oferta Aprobada', contenido);
  },

  // Email de nueva postulación
  nuevaPostulacion: (pasantiaTitulo, estudianteEmail, legajo) => {
    const contenido = `
      <h2>Nueva postulación recibida</h2>
      <p>Se ha recibido una nueva postulación para tu oferta de pasantía:</p>
      <ul>
        <li>Oferta: ${pasantiaTitulo}</li>
        <li>Estudiante: ${estudianteEmail}</li>
        <li>Legajo: ${legajo}</li>
        <li>Fecha: ${new Date().toLocaleString()}</li>
      </ul>
      <p>Puedes revisar la postulación en tu panel de control.</p>
    `;
    return getEmailTemplate('Nueva Postulación', contenido);
  },

  // Email de postulación aceptada
  postulacionAceptada: (pasantiaTitulo, empresaInfo) => {
    const contenido = `
      <h2>¡Felicitaciones!</h2>
      <p>Tu postulación para la pasantía "${pasantiaTitulo}" ha sido aceptada.</p>
      <p><strong>Detalles de contacto:</strong></p>
      <ul>
        <li>Empresa: ${empresaInfo.nombre}</li>
        <li>Contacto: ${empresaInfo.personaContacto}</li>
        <li>Email: ${empresaInfo.correo}</li>
        <li>Teléfono: ${empresaInfo.telefono}</li>
      </ul>
      <p>Por favor, contacta a la empresa para coordinar los siguientes pasos.</p>
    `;
    return getEmailTemplate('Postulación Aceptada', contenido);
  },

  // Email de postulación rechazada
  postulacionRechazada: (pasantiaTitulo, motivo = null) => {
    const contenido = `
      <h2>Actualización de tu postulación</h2>
      <p>Tu postulación para la pasantía "${pasantiaTitulo}" no fue seleccionada en esta ocasión.</p>
      ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
      <p>Te animamos a seguir buscando otras oportunidades en nuestro sistema.</p>
      <p>¡Gracias por tu interés!</p>
    `;
    return getEmailTemplate('Actualización de Postulación', contenido);
  }
};

module.exports = {
  enviarEmail,
  enviarEmailSimple,
  enviarEmailConPlantilla,
  getEmailTemplate,
  emailTemplates
};
