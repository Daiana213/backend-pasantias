const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('../utils/dbUtils');
const PasswordUtils = require('../utils/passwordUtils');

/**
 * Script de migración para convertir contraseñas en texto plano a hash bcrypt
 * 🚨 CRÍTICO: Este script debe ejecutarse INMEDIATAMENTE para asegurar las contraseñas
 */

async function migratePasswords() {
  console.log('🔐 Iniciando migración de contraseñas...');
  console.log('⚠️  Este proceso convertirá todas las contraseñas en texto plano a hash bcrypt\n');

  try {
    // Leer datos actuales
    const data = readDB();
    let migrationCount = 0;
    
    // Crear backup antes de migración
    await createBackup(data);

    console.log('👥 Migrando contraseñas de estudiantes...');
    
    // Migrar estudiantes
    if (data.estudiantes && Array.isArray(data.estudiantes)) {
      for (let i = 0; i < data.estudiantes.length; i++) {
        const estudiante = data.estudiantes[i];
        
        if (estudiante.password && !isAlreadyHashed(estudiante.password)) {
          console.log(`   🔄 Migrando estudiante: ${estudiante.email} (${estudiante.legajo})`);
          
          try {
            // Verificar que la contraseña actual cumple requisitos mínimos
            const validation = PasswordUtils.validatePasswordStrength(estudiante.password);
            if (!validation.isValid) {
              console.warn(`   ⚠️  Contraseña débil para ${estudiante.email}:`, validation.errors);
              console.warn('       Se hasheará pero se recomienda que el usuario la cambie');
            }

            // Hashear contraseña
            const hashedPassword = await PasswordUtils.hashPassword(estudiante.password);
            data.estudiantes[i].password = hashedPassword;
            migrationCount++;
            
            console.log(`   ✅ Contraseña migrada exitosamente para ${estudiante.email}`);
          } catch (error) {
            console.error(`   ❌ Error migrando contraseña para ${estudiante.email}:`, error.message);
            throw error;
          }
        } else if (estudiante.password && isAlreadyHashed(estudiante.password)) {
          console.log(`   ✅ Contraseña ya hasheada para ${estudiante.email}`);
        } else {
          console.warn(`   ⚠️  Estudiante ${estudiante.email} no tiene contraseña configurada`);
        }
      }
    }

    console.log('\n🏢 Migrando contraseñas de empresas...');
    
    // Migrar empresas
    if (data.empresas && Array.isArray(data.empresas)) {
      for (let i = 0; i < data.empresas.length; i++) {
        const empresa = data.empresas[i];
        
        if (empresa.contraseña && !isAlreadyHashed(empresa.contraseña)) {
          console.log(`   🔄 Migrando empresa: ${empresa.nombre} (${empresa.correo})`);
          
          try {
            // Verificar que la contraseña actual cumple requisitos mínimos
            const validation = PasswordUtils.validatePasswordStrength(empresa.contraseña);
            if (!validation.isValid) {
              console.warn(`   ⚠️  Contraseña débil para ${empresa.correo}:`, validation.errors);
              console.warn('       Se hasheará pero se recomienda que el usuario la cambie');
            }

            // Hashear contraseña
            const hashedPassword = await PasswordUtils.hashPassword(empresa.contraseña);
            data.empresas[i].contraseña = hashedPassword;
            migrationCount++;
            
            console.log(`   ✅ Contraseña migrada exitosamente para ${empresa.nombre}`);
          } catch (error) {
            console.error(`   ❌ Error migrando contraseña para ${empresa.correo}:`, error.message);
            throw error;
          }
        } else if (empresa.contraseña && isAlreadyHashed(empresa.contraseña)) {
          console.log(`   ✅ Contraseña ya hasheada para ${empresa.nombre}`);
        } else {
          console.warn(`   ⚠️  Empresa ${empresa.nombre} no tiene contraseña configurada`);
        }
      }
    }

    // Guardar datos migrados
    writeDB(data);
    
    console.log('\n🎉 Migración completada exitosamente!');
    console.log(`📊 Estadísticas de migración:`);
    console.log(`   - Contraseñas migradas: ${migrationCount}`);
    console.log(`   - Estudiantes totales: ${data.estudiantes?.length || 0}`);
    console.log(`   - Empresas totales: ${data.empresas?.length || 0}`);
    console.log('\n✅ Todas las contraseñas están ahora hasheadas con bcrypt (salt rounds: 12)');
    console.log('💡 Se recomienda notificar a usuarios con contraseñas débiles para que las actualicen');

    return { success: true, migrationCount };

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    console.error('🔄 Restaurando desde backup...');
    
    try {
      await restoreFromBackup();
      console.log('✅ Backup restaurado exitosamente');
    } catch (restoreError) {
      console.error('❌ Error crítico: No se pudo restaurar el backup:', restoreError.message);
      console.error('🚨 REVISAR MANUALMENTE: db.json y db.backup.json');
    }
    
    throw error;
  }
}

/**
 * Verifica si una contraseña ya está hasheada con bcrypt
 */
function isAlreadyHashed(password) {
  // Los hashes de bcrypt siempre empiezan con $2a$, $2b$, $2x$, o $2y$
  return typeof password === 'string' && /^\$2[abxy]\$/.test(password);
}

/**
 * Crea backup de la base de datos antes de la migración
 */
async function createBackup(data) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const backupPath = path.join(__dirname, '..', 'db.backup.json');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedBackupPath = path.join(__dirname, '..', `db.backup.${timestamp}.json`);
    
    // Backup principal
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    
    // Backup con timestamp
    fs.writeFileSync(timestampedBackupPath, JSON.stringify(data, null, 2));
    
    console.log('💾 Backup creado exitosamente:');
    console.log(`   - ${backupPath}`);
    console.log(`   - ${timestampedBackupPath}\n`);
  } catch (error) {
    console.error('❌ Error creando backup:', error.message);
    throw new Error('No se pudo crear backup de seguridad');
  }
}

/**
 * Restaura la base de datos desde el backup
 */
async function restoreFromBackup() {
  const fs = require('fs');
  const path = require('path');
  
  const backupPath = path.join(__dirname, '..', 'db.backup.json');
  const dbPath = path.join(__dirname, '..', 'db.json');
  
  if (!fs.existsSync(backupPath)) {
    throw new Error('Archivo de backup no encontrado');
  }
  
  const backupData = fs.readFileSync(backupPath, 'utf8');
  fs.writeFileSync(dbPath, backupData);
}

/**
 * Función para validar la migración
 */
async function validateMigration() {
  console.log('\n🔍 Validando migración...');
  
  try {
    const data = readDB();
    let validationErrors = [];
    
    // Validar estudiantes
    if (data.estudiantes) {
      for (const estudiante of data.estudiantes) {
        if (estudiante.password && !isAlreadyHashed(estudiante.password)) {
          validationErrors.push(`Estudiante ${estudiante.email} tiene contraseña sin hashear`);
        }
      }
    }
    
    // Validar empresas
    if (data.empresas) {
      for (const empresa of data.empresas) {
        if (empresa.contraseña && !isAlreadyHashed(empresa.contraseña)) {
          validationErrors.push(`Empresa ${empresa.correo} tiene contraseña sin hashear`);
        }
      }
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Errores de validación encontrados:');
      validationErrors.forEach(error => console.error(`   - ${error}`));
      return false;
    }
    
    console.log('✅ Validación exitosa: Todas las contraseñas están hasheadas');
    return true;
  } catch (error) {
    console.error('❌ Error durante validación:', error.message);
    return false;
  }
}

/**
 * Función principal para ejecutar la migración
 */
async function runMigration() {
  try {
    console.log('🛡️  MIGRACIÓN DE SEGURIDAD - CONTRASEÑAS');
    console.log('=====================================\n');
    
    // Verificar que el módulo PasswordUtils existe
    try {
      await PasswordUtils.hashPassword('test');
      console.log('✅ PasswordUtils funciona correctamente\n');
    } catch (error) {
      console.error('❌ Error: PasswordUtils no disponible:', error.message);
      process.exit(1);
    }
    
    // Ejecutar migración
    const result = await migratePasswords();
    
    // Validar resultado
    const isValid = await validateMigration();
    
    if (!isValid) {
      throw new Error('Validación de migración falló');
    }
    
    console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('🔐 Todas las contraseñas están ahora hasheadas de forma segura');
    console.log('🛡️  El sistema es ahora significativamente más seguro\n');
    
    // Mostrar siguiente pasos
    console.log('📋 Siguientes pasos recomendados:');
    console.log('1. 📧 Notificar a usuarios con contraseñas débiles');
    console.log('2. 🔄 Implementar política de cambio de contraseña');
    console.log('3. 📊 Configurar monitoreo de intentos de login');
    console.log('4. 🔍 Revisar logs de acceso regularmente\n');
    
    return result;

  } catch (error) {
    console.error('\n💥 MIGRACIÓN FALLÓ:', error.message);
    console.error('🔧 Revisar logs y contactar al equipo de desarrollo');
    process.exit(1);
  }
}

// Si se ejecuta directamente (no importado)
if (require.main === module) {
  runMigration();
}

module.exports = {
  migratePasswords,
  validateMigration,
  runMigration
};
