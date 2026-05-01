# BAR LM — Guía de Instalación en la Laptop del Bar
**Agencia Señores · Mayo 2026**

---

## Lo que necesitas llevar

- [ ] Tu laptop de desarrollo (para copiar archivos)
- [ ] USB con el proyecto (o acceso a GitHub)
- [ ] USB con el instalador de Node.js descargado
- [ ] El router Huawei 4G
- [ ] Cable USB-C (para anclaje de internet desde el celular)
- [ ] Esta guía impresa o en el celular

---

## PASO 1 — Instalar Node.js en la laptop del bar

1. Descarga el instalador desde: **https://nodejs.org** → botón "LTS"
   *(Si no hay internet en el bar, descárgalo antes en tu laptop y pásalo por USB)*

2. Ejecuta el instalador `.msi` y sigue los pasos (todo por defecto, Next → Next → Install)

3. Cuando termine, abre **PowerShell** y verifica:
   ```
   node --version
   ```
   Debe mostrar algo como `v20.x.x` ✓

---

## PASO 2 — Copiar el proyecto

### Opción A: Por USB (sin internet)
1. En tu laptop copia la carpeta entera `bar-lm-menu-completo` a un USB
   - **Excluye** la carpeta `server/node_modules` (pesa mucho, se regenera)
   - **Incluye** `server/db/barlm.db` (la base de datos con todos los productos y fotos)
   - **Incluye** `server/uploads/` (las fotos subidas)
2. En la laptop del bar, pega la carpeta en `C:\BarLM\`

### Opción B: Por GitHub (con internet)
```
git clone https://github.com/AgenciaSeniors/BarLM.git C:\BarLM
```

---

## PASO 3 — Instalar dependencias

1. Abre **PowerShell**
2. Entra a la carpeta del servidor:
   ```
   cd C:\BarLM\server
   ```
3. Instala las dependencias:
   ```
   npm install
   ```
   *(Requiere internet. Tarda 2-3 minutos. Si no hay internet, copia node_modules desde el USB)*

---

## PASO 4 — Crear el archivo de configuración (.env)

### Opción A: Copiar desde el USB
Copia el archivo `server/.env` desde tu laptop al USB y pégalo en `C:\BarLM\server\.env`

### Opción B: Crearlo manualmente
Crea el archivo `C:\BarLM\server\.env` con este contenido exacto:

```
PORT=3000
SUPABASE_URL=https://xwkmhpcombsauoozyidi.supabase.co
SUPABASE_KEY=[pegar la service_role key de Supabase]
RESTAURANT_ID=5b1b7ba9-eb12-4848-80f2-597149d52f3e
ADMIN_EMAIL=barlm@gmail.com
ADMIN_PASSWORD=[contraseña que quiera el dueño]
```

> ⚠️ El ADMIN_EMAIL y ADMIN_PASSWORD son las credenciales del panel gerencial.
> Cámbialas por algo seguro antes de entregar al cliente.

---

## PASO 5 — Crear el usuario administrador

```
cd C:\BarLM\server
npm run create-admin
```

Esto crea el login del panel gerencial con el email y contraseña del `.env`.

---

## PASO 6 — Importar productos desde Supabase

*(Solo necesario si copiaste el proyecto por GitHub sin la base de datos)*
*(Omite este paso si copiaste el barlm.db por USB — ya tiene todo)*

Con internet activo en la laptop:
```
npm run import
```

Importa todos los productos, precios y fotos desde Supabase a la base de datos local.
Tarda 1-2 minutos.

---

## PASO 7 — Arrancar el servidor

```
cd C:\BarLM\server
npm start
```

Debes ver algo así:
```
══════════════════════════════════════════════
   BAR LM — Servidor Offline
══════════════════════════════════════════════
   Puerto: 3000
   Red local:
   -> http://192.168.X.X:3000  (Wi-Fi)
══════════════════════════════════════════════
```

Anota la IP que aparece bajo "Wi-Fi" — esa es la dirección del menú para los clientes.

---

## PASO 8 — Conectar el router y verificar

1. Enciende el router Huawei 4G
2. Conecta la laptop al WiFi del router
3. Reinicia el servidor (`Ctrl+C` → `npm start`)
4. Ahora la IP que aparece es la definitiva del bar
5. Desde tu celular (conectado al mismo WiFi del router):
   - Abre el navegador → escribe la IP → `http://192.168.X.X:3000`
   - Debe cargar el menú completo ✓

---

## PASO 9 — Generar e imprimir el código QR

1. Abre **https://qr.io** o **https://www.qrcode-monkey.com** en el celular
2. Pega la IP del menú: `http://192.168.X.X:3000`
3. Genera el QR
4. Imprímelo o muéstralo en una pantalla en el bar

> 💡 Si la IP cambia algún día (raro), hay que regenerar el QR.
> Para evitarlo, asigna IP fija (ver Paso 10B).

---

## PASO 10 — Configurar inicio automático (IMPORTANTE)

El servidor debe arrancar solo cuando se enciende la laptop, sin que nadie tenga que abrir PowerShell.

### Crear el archivo de arranque
Crea el archivo `C:\BarLM\iniciar-servidor.bat` con este contenido:
```batch
@echo off
cd /d C:\BarLM\server
node server.js
```

### Agregar al inicio de Windows
1. Presiona `Win + R` → escribe `shell:startup` → Enter
2. Se abre una carpeta de Windows
3. Copia el archivo `iniciar-servidor.bat` dentro de esa carpeta
4. Listo — cada vez que encienda la laptop, el servidor arranca automáticamente

> ⚠️ La ventana negra del servidor debe quedarse abierta siempre.
> Si la cierran, el menú deja de funcionar.
> Dile al personal del bar que NO cierren esa ventana.

---

## PASO 10B — IP fija (opcional pero recomendado)

Para que el QR nunca cambie, asigna una IP fija a la laptop:

1. Abre **Configuración de Windows** → Red e Internet → WiFi → Propiedades del hardware
2. En "Asignación de IP" → selecciona **Manual**
3. Activa IPv4 y pon:
   - Dirección IP: `192.168.8.100`
   - Máscara: `255.255.255.0`
   - Puerta de enlace: `192.168.8.1`
4. Guardar

---

## PASO 11 — Entregar al cliente

Entrégale al dueño:
- La dirección del panel gerencial: `http://localhost:3000/admin.html`
- Su usuario y contraseña del panel
- Instrucción: cuando encienda la laptop y tenga internet (hotspot del celular por USB), presionar **SINCRONIZAR** en el panel para actualizar el menú online

---

## Resumen del día a día del bar

```
1. Encender laptop → servidor arranca automático
2. Encender router Huawei → clientes se conectan al WiFi
3. Clientes escanean QR → ven el menú
4. Admin necesita cambiar algo → abre localhost:3000/admin.html
5. Cambia precio / sube foto / activa producto → guardar
6. Cuando tiene internet (hotspot celular por USB) → SINCRONIZAR
7. El menú online en agenciaseniors.com se actualiza automático
```

---

## Solución de problemas frecuentes

| Problema | Solución |
|----------|----------|
| El menú no carga en el celular | Verificar que laptop y celular estén en el mismo WiFi del router |
| La ventana del servidor se cerró | Doble clic en `iniciar-servidor.bat` |
| El servidor no arranca al encender | Verificar que el .bat esté en la carpeta de inicio de Windows |
| Error al sincronizar | Verificar que el celular esté conectado por USB con Anclaje USB activo |
| La IP cambió y el QR no funciona | Asignar IP fija (Paso 10B) o regenerar el QR |
| Olvidaron la contraseña del admin | Abrir PowerShell → `cd C:\BarLM\server` → `npm run create-admin` |

---

*Sistema desarrollado por Agencia Señores · agenciaseniors.com*
