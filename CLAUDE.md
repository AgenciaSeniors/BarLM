# BAR LM — Menú Digital

## Resumen del Proyecto
Menú digital para **Bar LM**, un bar/club nocturno en Cuba. Desarrollado por **Agencia Señores** (AgenciaSeniors). El menú está basado en el sistema ya funcional de La Casona (repo: AgenciaSeniors/La-Casona-) pero con estética propia y una arquitectura híbrida offline/online.

## Stack
- **Frontend:** HTML/CSS/JS vanilla (NO framework)
- **Backend:** Supabase (compartido con otros negocios de la agencia)
- **Futura Fase 2:** Node.js + Express + SQLite para servidor local offline

## Supabase
- **Proyecto compartido** con otros restaurantes (La Casona, etc.)
- **URL:** `https://xwkmhpcombsauoozyidi.supabase.co`
- **Key:** `sb_publishable_5iDJi-xK69y1DM0nFYjqlw_TaozemSt`
- **Restaurant ID (Bar LM):** `5b1b7ba9-eb12-4848-80f2-597149d52f3e`
- **Tablas:** `restaurantes`, `productos`, `opiniones`
- Los productos ya están insertados (107 productos en 19 categorías)

## Estructura de Archivos
```
bar-lm/
├── index.html          # Menú público (LISTO)
├── style.css           # Estilos neón púrpura (LISTO)
├── script.js           # Motor del menú conectado a Supabase (LISTO)
├── config.js           # Configuración Supabase (LISTO)
├── logo.png            # Logo transparente (corona neón) (LISTO)
├── login.html          # Panel login admin (PENDIENTE)
├── admin.html          # Panel administración (PENDIENTE)
├── admin.js            # Lógica admin (PENDIENTE)
└── img/                # Imágenes de productos
```

## Diseño / Estética
- **Tema:** Oscuro nocturno con neón púrpura/magenta
- **Colores principales:** Fondo #06060e, Neón #d946ef, Accent #e879f9, Gold #fbbf24
- **Fonts:** Cinzel (display/headers), Outfit (body), Playfair Display (quotes itálicas)
- **Logo:** Corona neón con texto "Centro / Bar-Club Nocturno" — es la imagen del cliente, NO modificar. El nombre del negocio es "Bar LM" (no "Centro")
- **Referencia visual:** Los PDFs del menú físico están en la carpeta del proyecto original

## Categorías (19 total, en este orden)
1. cafes_calientes, cafes_frios
2. cocteles_sin_alcohol, cocteles_con_alcohol
3. cocteles_vodka, cocteles_cerveza, cocteles_vino, cocteles_ginebra, cocteles_tequila, cocteles_whisky
4. entrantes, hamburguesas, entremes, tacos
5. pizzas
6. cervezas, vinos, refrescantes, otras_bebidas

## Funcionalidades del Menú (COMPLETADAS)
- Catálogo por categorías con scroll horizontal (cards)
- Buscador de productos en tiempo real
- Filtros por categoría con auto-scroll + highlight automático (IntersectionObserver)
- Modal de detalle (imagen, precio, descripción)
- Sistema de valoraciones/reseñas (enviar + ver lista)
- Estados: disponible / agotado / proximamente
- Productos destacados (badge "TOP")
- Moneda: CUP (peso cubano), formato $X,XXX

## PENDIENTE — Panel Admin
Crear login.html, admin.html y admin.js. Referencia funcional: el admin de La Casona (repo AgenciaSeniors/La-Casona-). Debe tener:
- Login con Supabase Auth
- CRUD de productos (agregar, editar, eliminar)
- Cambiar estado (disponible/agotado/proximamente)
- Cambiar precios
- Subir imágenes
- Misma estética neón púrpura que el menú

## PENDIENTE — Fase 2: Modo Offline (Arquitectura Híbrida)
El bar tiene solo ~3 horas de internet al día. Se necesita:
- **Servidor local** en una laptop del establecimiento (Node.js + Express + SQLite)
- **Red WiFi local** (router proporcionado por el cliente) donde los clientes escanean QR → acceden al menú desde la laptop
- **Mismo frontend** sirviéndose localmente sin internet
- **Botón "Sincronizar"** en el admin: cuando hay internet, empuja cambios locales (SQLite) → Supabase (online)
- Dirección de sync: Local → Supabase (la laptop es la fuente de verdad)

## PENDIENTE — Fase 3: Deploy
- Subir menú online a hosting (agenciaseniors.com/menues/bar-lm/ o similar)
- Configurar servidor local en la laptop del cliente
- Generar QR codes (uno para online, otro para red local)

## Notas Importantes
- NO modificar datos de otros restaurantes en Supabase (hay 3 más activos)
- Las imagen_url de los productos están vacías — se irán agregando
- Muchos productos están como "proximamente" (55 de 107) — se activarán cuando el bar tenga stock
- El sistema de La Casona (repo La-Casona-) es la referencia funcional para todo lo que falta
