// ══════════════════════════════════════════════════
// BAR LM — Servidor Offline (Express + SQLite)
// ══════════════════════════════════════════════════
// Este servidor permite que el menú funcione sin internet.
// Los clientes se conectan a la red WiFi local del bar,
// escanean el QR y acceden al menú servido desde esta laptop.
//
// Uso:
//   npm start          → Arranca el servidor
//   npm run import     → Importa productos desde Supabase
//   npm run create-admin → Crea usuario admin local

require('dotenv').config();

const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// ──────────────────────────────────────────────────
// Middlewares globales
// ──────────────────────────────────────────────────

// Parsear JSON en el body de las peticiones
app.use(express.json());

// CORS habilitado para desarrollo (permite peticiones desde cualquier origen)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Responder inmediatamente a preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ──────────────────────────────────────────────────
// Archivos estáticos
// ──────────────────────────────────────────────────

// Menú público: servir la carpeta raíz del proyecto (../  desde server/)
// Incluye index.html, style.css, script.js, config.js, logo.png, etc.
app.use('/', express.static(path.join(__dirname, '..')));

// Imágenes subidas localmente por el admin
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Librerías vendor (ej: supabase-js para modo online)
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));

// ──────────────────────────────────────────────────
// Rutas de la API
// ──────────────────────────────────────────────────

const productosRouter = require('./routes/productos');
const opinionesRouter = require('./routes/opiniones');
const uploadRouter = require('./routes/upload');
const authRouter = require('./routes/auth');
const syncRouter = require('./routes/sync');

app.use('/api/productos', productosRouter);
app.use('/api/opiniones', opinionesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);

// ──────────────────────────────────────────────────
// Ruta de salud / diagnóstico
// ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'Bar LM Offline Server',
        timestamp: new Date().toISOString()
    });
});

// ──────────────────────────────────────────────────
// Iniciar servidor
// ──────────────────────────────────────────────────

/**
 * Obtiene las direcciones IP de la máquina en la red local.
 * Esto es lo que los clientes usarán para acceder al menú.
 */
function obtenerIPsLocales() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const nombre of Object.keys(interfaces)) {
        for (const iface of interfaces[nombre]) {
            // Solo IPv4 y no loopback
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ nombre, ip: iface.address });
            }
        }
    }
    return ips;
}

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('   BAR LM — Servidor Offline');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log(`   Puerto: ${PORT}`);
    console.log(`   Local:  http://localhost:${PORT}`);
    console.log('');

    // Mostrar IPs de red local (para el QR code)
    const ips = obtenerIPsLocales();
    if (ips.length > 0) {
        console.log('   Red local (para QR del bar):');
        ips.forEach(({ nombre, ip }) => {
            console.log(`   -> http://${ip}:${PORT}  (${nombre})`);
        });
    } else {
        console.log('   [!] No se detectaron interfaces de red local.');
        console.log('       Conecta la laptop a la red WiFi del bar.');
    }

    console.log('');
    console.log('   API:    http://localhost:' + PORT + '/api/health');
    console.log('   Admin:  http://localhost:' + PORT + '/admin.html');
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('');
});
