-- ══════════════════════════════════════════════════
-- BAR LM — Esquema SQLite para servidor offline
-- ══════════════════════════════════════════════════
-- Este esquema replica la estructura de Supabase localmente.
-- Se usa IF NOT EXISTS para poder ejecutar en cada arranque sin errores.

-- ──────────────────────────────────────────────────
-- Tabla de productos (espejo de Supabase "productos")
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    supabase_id INTEGER,                            -- ID original en Supabase (NULL si fue creado offline)
    nombre      TEXT NOT NULL,
    precio      REAL NOT NULL DEFAULT 0,
    categoria   TEXT NOT NULL,
    descripcion TEXT,
    imagen_url  TEXT,                                -- URL remota (Supabase Storage / externa)
    imagen_local TEXT,                               -- Ruta local en server/uploads/
    estado      TEXT NOT NULL DEFAULT 'disponible',  -- disponible | agotado | proximamente
    destacado   INTEGER NOT NULL DEFAULT 0,          -- 0 = normal, 1 = producto TOP
    activo      INTEGER NOT NULL DEFAULT 1,          -- 0 = eliminado (soft delete)
    restaurant_id TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    synced      INTEGER NOT NULL DEFAULT 0           -- 0 = pendiente de sincronizar, 1 = sincronizado
);

-- ──────────────────────────────────────────────────
-- Tabla de opiniones / reseñas
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opiniones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    supabase_id     INTEGER,                         -- ID original en Supabase (NULL si fue creada offline)
    producto_id     INTEGER NOT NULL REFERENCES productos(id),
    cliente_nombre  TEXT DEFAULT 'Anónimo',
    comentario      TEXT,
    puntuacion      INTEGER NOT NULL CHECK(puntuacion >= 1 AND puntuacion <= 5),
    restaurant_id   TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    synced          INTEGER NOT NULL DEFAULT 0        -- 0 = pendiente, 1 = sincronizada
);

-- ──────────────────────────────────────────────────
-- Tabla de usuarios admin (autenticación local)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);

-- ──────────────────────────────────────────────────
-- Log de sincronizaciones (auditoría)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type       TEXT NOT NULL,                    -- 'push' | 'pull' | 'full'
    records_pushed  INTEGER DEFAULT 0,
    errors          TEXT,                             -- JSON con errores si hubo
    started_at      TEXT DEFAULT (datetime('now')),
    finished_at     TEXT
);
