// ══════════════════════════════════════════════════
// BAR LM — Ruta de subida de imágenes
// ══════════════════════════════════════════════════
// Permite al admin subir fotos de productos desde el panel.
// Las imágenes se guardan en server/uploads/ y se sirven como estáticos.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ──────────────────────────────────────────────────
// Configuración de Multer (manejo de archivos)
// ──────────────────────────────────────────────────

// Directorio de destino
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    // Guardar en server/uploads/
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    // Nombre del archivo: barlm_<timestamp>.<extension>
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
        const nombre = `barlm_${Date.now()}${extension}`;
        cb(null, nombre);
    }
});

// Filtro: solo aceptar imágenes
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'), false);
    }
};

// Instancia de multer con límite de 5MB
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024  // 5MB máximo
    }
});

// ──────────────────────────────────────────────────
// POST / — Subir imagen
// ──────────────────────────────────────────────────
// Acepta multipart/form-data con campo "imagen".
// Devuelve la URL local para usar en el producto.
router.post('/', upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo' });
        }

        // URL relativa para acceder a la imagen desde el frontend
        const url = `/uploads/${req.file.filename}`;

        console.log(`[Upload] Imagen guardada: ${req.file.filename} (${(req.file.size / 1024).toFixed(1)} KB)`);

        res.json({
            url,
            filename: req.file.filename,
            size: req.file.size
        });

    } catch (err) {
        console.error('[Upload] Error:', err.message);
        res.status(500).json({ error: 'Error al subir imagen' });
    }
});

// ──────────────────────────────────────────────────
// Manejo de errores de Multer
// ──────────────────────────────────────────────────
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'La imagen excede el tamaño máximo (5MB)' });
        }
        return res.status(400).json({ error: `Error de subida: ${err.message}` });
    }

    if (err) {
        return res.status(400).json({ error: err.message });
    }

    next();
});

module.exports = router;
