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
    console.log('Datos guardados exitosamente:', data);
  } catch (error) {
    console.error('Error al guardar datos:', error);
    throw error;
  }
};

module.exports = {
  readDB,
  writeDB
};