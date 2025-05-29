const nodemailer = require('nodemailer');

const CONFIG = {
  email: {
    user: 'daianapalacios213@gmail.com',
    pass: 'fjly mbqh gebp cqbc'
  }
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.pass
  }
});

const enviarEmail = async (destinatario, asunto, contenidoHtml) => {
  try {
    const info = await transporter.sendMail({
      from: CONFIG.email.user,
      to: destinatario,
      subject: asunto,
      html: contenidoHtml
    });
    console.log('Email enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
};

module.exports = {
  enviarEmail
};