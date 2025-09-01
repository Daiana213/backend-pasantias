const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');

const readDB = () => {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (error) {
    return { estudiantes: [], empresas: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    // Log seguro sin exponer datos sensibles
    console.log('Datos guardados exitosamente en la base de datos');
  } catch (error) {
    console.error('Error al guardar datos:', error);
    throw error;
  }
};

module.exports = {
  readDB,
  writeDB
};