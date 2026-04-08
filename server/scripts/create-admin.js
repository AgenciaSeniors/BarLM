// ══════════════════════════════════════════════════
// BAR LM — Crear usuario administrador en SQLite
// ══════════════════════════════════════════════════
// Uso: npm run create-admin
//
// Lee ADMIN_EMAIL y ADMIN_PASSWORD del archivo .env,
// hashea la contraseña con bcrypt (10 rondas) e inserta
// o actualiza el registro en la tabla admin_users.
//
// Seguro de ejecutar múltiples veces — si el email ya
// existe, simplemente actualiza la contraseña hasheada.

const path = require('path');

// Cargar variables de entorno desde .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const db = require('../db/database');

// Número de rondas de bcrypt (10 es buen balance seguridad/velocidad)
const SALT_ROUNDS = 10;

async function crearAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    // Validar que las credenciales estén configuradas en .env
    if (!email || !password) {
        console.error('[Admin] ERROR: Faltan variables de entorno.');
        console.error('Configura ADMIN_EMAIL y ADMIN_PASSWORD en el archivo .env');
        console.error('Ejemplo:');
        console.error('  ADMIN_EMAIL=admin@barlm.com');
        console.error('  ADMIN_PASSWORD=tu_contraseña_segura');
        process.exit(1);
    }

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('  BAR LM — Creando usuario administrador');
    console.log('══════════════════════════════════════════════════');
    console.log('');

    try {
        // Hashear la contraseña con bcrypt
        console.log(`[Admin] Hasheando contraseña (${SALT_ROUNDS} rondas de bcrypt)...`);
        const hash = await bcrypt.hash(password, SALT_ROUNDS);

        // INSERT OR REPLACE: si el email ya existe, sobreescribe el registro
        // Esto permite actualizar la contraseña ejecutando el script de nuevo
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO admin_users (email, password_hash, created_at)
            VALUES (?, ?, datetime('now'))
        `);

        stmt.run(email, hash);

        console.log(`[Admin] Usuario creado/actualizado exitosamente.`);
        console.log(`  Email:    ${email}`);
        console.log(`  Password: ${'*'.repeat(password.length)} (hasheada con bcrypt)`);
        console.log('');
        console.log('══════════════════════════════════════════════════');
        console.log('  Ahora puedes iniciar sesión en el panel admin.');
        console.log('══════════════════════════════════════════════════');
        console.log('');

    } catch (err) {
        console.error('[Admin] Error al crear usuario:', err.message);
        process.exit(1);
    }
}

// Ejecutar y capturar errores fatales
crearAdmin().catch((err) => {
    console.error('[Admin] Error fatal:', err);
    process.exit(1);
});
