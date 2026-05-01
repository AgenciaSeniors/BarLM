/* ═══════════════════════════════════════════════
   BAR LM — Admin Panel Logic (Local Server / Offline)
   ═══════════════════════════════════════════════ */

let inventarioGlobal = [];
let imagenRecortada = null; // Blob after crop+compress
let cropperInstance = null;

// Escapar HTML para prevenir XSS
function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// Categorias base (las mismas del menu publico)
const CATEGORIAS_BASE = {
    cafes_calientes: 'Cafes Calientes',
    cafes_frios: 'Cafes Frios',
    cocteles_sin_alcohol: 'Cocteles Sin Alcohol',
    cocteles_con_alcohol: 'Cocteles Con Alcohol',
    cocteles_vodka: 'Con Vodka',
    cocteles_cerveza: 'Con Cerveza',
    cocteles_vino: 'Con Vino',
    cocteles_ginebra: 'Con Ginebra',
    cocteles_tequila: 'Con Tequila',
    cocteles_whisky: 'Con Whisky',
    entrantes: 'Entrantes',
    hamburguesas: 'Hamburguesas',
    entremes: 'Entremes',
    tacos: 'Tacos Mexicanos',
    pizzas: 'Pizzas',
    cervezas: 'Cervezas',
    vinos: 'Vinos',
    refrescantes: 'Refrescantes',
    otras_bebidas: 'Otras Bebidas'
};

// ─── AUTH ───────────────────────────────────────

function checkAuth() {
    if (!sessionStorage.getItem('barlm_session')) {
        window.location.href = 'login.html';
        return;
    }
    cargarAdmin();
}

function cerrarSesion() {
    sessionStorage.removeItem('barlm_session');
    window.location.href = 'login.html';
}

// ─── LOAD INVENTORY ─────────────────────────────

async function cargarAdmin() {
    try {
        const res = await fetch('/api/productos');
        if (!res.ok) throw new Error('Error del servidor: ' + res.status);
        const data = await res.json();

        inventarioGlobal = data || [];
        poblarCategorias();
        renderInventario(inventarioGlobal);
    } catch (err) {
        document.getElementById('inventory-list').innerHTML =
            '<p class="loading-msg" style="color:var(--danger)">Error al cargar inventario.</p>';
    }
}

// ─── CATEGORIAS DINAMICAS ───────────────────────

function poblarCategorias() {
    // Extraer categorias unicas de productos + las base
    const categoriasSet = new Set(Object.keys(CATEGORIAS_BASE));
    inventarioGlobal.forEach(p => {
        if (p.categoria) categoriasSet.add(p.categoria);
    });

    const categorias = [...categoriasSet].sort();

    // Poblar datalist del formulario
    const datalist = document.getElementById('lista-categorias');
    datalist.innerHTML = categorias.map(cat => {
        const label = CATEGORIAS_BASE[cat] || cat;
        return `<option value="${cat}">${label}</option>`;
    }).join('');

    // Poblar select del filtro de inventario
    const filterSelect = document.getElementById('filter-categoria');
    const valorActual = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todas las categorias</option>' +
        categorias.map(cat => {
            const label = CATEGORIAS_BASE[cat] || cat;
            return `<option value="${cat}">${label}</option>`;
        }).join('');
    filterSelect.value = valorActual;
}

// ─── RENDER INVENTORY ───────────────────────────

function renderInventario(lista) {
    const container = document.getElementById('inventory-list');
    const countEl = document.getElementById('inventory-count');
    countEl.textContent = `${lista.length} producto${lista.length !== 1 ? 's' : ''}`;

    if (!lista.length) {
        container.innerHTML = '<p class="loading-msg">No hay productos.</p>';
        return;
    }

    const estadoLabel = { disponible: 'DISPONIBLE', agotado: 'AGOTADO' };
    const estadoClass = { disponible: 'badge-dispo', agotado: 'badge-agot' };
    const defaultImg = '/img/default-product.svg';

    container.innerHTML = lista.map(p => {
        const estado = (p.estado === 'agotado') ? 'agotado' : 'disponible';
        return `
        <div class="inventory-item">
            <img class="inv-thumb" src="${p.imagen_url || defaultImg}" alt="${esc(p.nombre)}" onerror="this.src='/img/default-product.svg'">
            <div class="inv-info">
                <span class="inv-name">${p.destacado ? '★ ' : ''}${esc(p.nombre)}</span>
                <span class="inv-price">$${Number(p.precio).toLocaleString('es-CU')}</span>
            </div>
            <span class="inv-badge ${estadoClass[estado]}">${estadoLabel[estado]}</span>
            <div class="inv-actions">
                <button class="icon-btn" onclick="editarProducto(${p.id})" title="Editar">
                    <span class="material-icons">edit</span>
                </button>
                <button class="icon-btn" onclick="toggleDestacado(${p.id})" title="Destacar">
                    <span class="material-icons">${p.destacado ? 'star' : 'star_border'}</span>
                </button>
                <button class="icon-btn" onclick="toggleEstado(${p.id})" title="Cambiar estado">
                    <span class="material-icons">sync</span>
                </button>
                <button class="icon-btn icon-btn--danger" onclick="eliminarProducto(${p.id})" title="Eliminar">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ─── FILTER INVENTORY (search + category) ───────

function filtrarInventario() {
    const cat = document.getElementById('filter-categoria').value;
    const busqueda = document.getElementById('search-inventario').value.trim().toLowerCase();

    let filtered = inventarioGlobal;

    if (cat) {
        filtered = filtered.filter(p => p.categoria === cat);
    }

    if (busqueda) {
        filtered = filtered.filter(p => p.nombre.toLowerCase().includes(busqueda));
    }

    renderInventario(filtered);
}

// ─── SAVE / UPDATE PRODUCT ──────────────────────

async function guardarProducto() {
    const btn = document.getElementById('btn-guardar');
    const idEdicion = document.getElementById('edit-id').value;

    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-categoria').value.trim().toLowerCase().replace(/\s+/g, '_');
    const estado = document.getElementById('prod-estado').value;
    const descripcion = document.getElementById('prod-descripcion').value.trim();
    const destacado = document.getElementById('prod-destacado').checked;

    // Validation
    if (!nombre || !precio || !categoria) {
        alert('Complete los campos obligatorios: Nombre, Precio y Categoria.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Procesando...';

    try {
        let urlImagen = null;
        let filenameImagen = null;

        // Upload cropped+compressed image if available
        if (imagenRecortada) {
            const formData = new FormData();
            formData.append('imagen', imagenRecortada, `barlm_${Date.now()}.jpg`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('Error al subir imagen');
            }

            const uploadData = await uploadRes.json();
            urlImagen = uploadData.url;         // e.g. /uploads/barlm_xxx.jpg
            filenameImagen = uploadData.filename; // e.g. barlm_xxx.jpg
        }

        const datos = {
            nombre,
            precio,
            categoria,
            estado,
            descripcion,
            destacado
        };

        // Guardar imagen_local (filename) para que el servidor la sirva offline
        if (urlImagen) datos.imagen_url = urlImagen;
        if (filenameImagen) datos.imagen_local = filenameImagen;

        if (idEdicion) {
            // Update existing product
            const res = await fetch(`/api/productos/${parseInt(idEdicion)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (!res.ok) throw new Error('Error al actualizar producto');
            alert('Producto actualizado.');
        } else {
            // Create new product
            if (!urlImagen) datos.imagen_url = '';
            const res = await fetch('/api/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (!res.ok) throw new Error('Error al crear producto');
            alert('Producto creado.');
        }

        limpiarFormulario();
        await cargarAdmin();

    } catch (err) {
        alert('Error: ' + (err.message || 'No se pudo guardar.'));
    }

    btn.disabled = false;
    btn.textContent = idEdicion ? 'ACTUALIZAR' : 'GUARDAR';
}

// ─── EDIT PRODUCT ───────────────────────────────

function editarProducto(id) {
    const p = inventarioGlobal.find(item => item.id === id);
    if (!p) return;

    document.getElementById('edit-id').value = p.id;
    document.getElementById('prod-nombre').value = p.nombre;
    document.getElementById('prod-precio').value = p.precio;
    document.getElementById('prod-categoria').value = p.categoria;
    document.getElementById('prod-estado').value = (p.estado === 'agotado') ? 'agotado' : 'disponible';
    document.getElementById('prod-descripcion').value = p.descripcion || '';
    document.getElementById('prod-destacado').checked = p.destacado || false;

    const previewImg = document.getElementById('preview-img');
    if (p.imagen_url) {
        previewImg.src = p.imagen_url;
        previewImg.style.display = 'block';
    } else {
        previewImg.style.display = 'none';
    }

    imagenRecortada = null;
    document.getElementById('btn-guardar').textContent = 'ACTUALIZAR';
    document.getElementById('btn-cancelar').style.display = 'block';

    document.querySelector('.upload-zone').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion() {
    limpiarFormulario();
}

function limpiarFormulario() {
    document.getElementById('edit-id').value = '';
    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-categoria').value = '';
    document.getElementById('prod-estado').value = 'disponible';
    document.getElementById('prod-descripcion').value = '';
    document.getElementById('prod-destacado').checked = false;
    document.getElementById('prod-imagen').value = '';
    document.getElementById('preview-img').style.display = 'none';
    document.getElementById('btn-guardar').textContent = 'GUARDAR';
    document.getElementById('btn-cancelar').style.display = 'none';
    document.querySelector('.upload-text').textContent = 'Click o arrastra imagen';
    document.querySelector('.upload-icon').style.display = 'block';
    imagenRecortada = null;
}

// ─── TOGGLE ESTADO (only disponible <-> agotado) ─

async function toggleEstado(id) {
    const p = inventarioGlobal.find(item => item.id === id);
    if (!p) return;

    try {
        const res = await fetch(`/api/productos/${id}/estado`, {
            method: 'PUT'
        });

        if (!res.ok) throw new Error('Error al cambiar estado');
        await cargarAdmin();
    } catch (err) {
        alert('Error al cambiar estado.');
    }
}

// ─── TOGGLE DESTACADO ───────────────────────────

async function toggleDestacado(id) {
    const p = inventarioGlobal.find(item => item.id === id);
    if (!p) return;

    try {
        const res = await fetch(`/api/productos/${id}/destacado`, {
            method: 'PUT'
        });

        if (!res.ok) throw new Error('Error al cambiar destacado');
        await cargarAdmin();
    } catch (err) {
        alert('Error al cambiar destacado.');
    }
}

// ─── DELETE (SOFT) ──────────────────────────────

async function eliminarProducto(id) {
    if (!confirm('Eliminar este producto del menu?')) return;

    try {
        const res = await fetch(`/api/productos/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Error al eliminar');
        await cargarAdmin();
    } catch (err) {
        alert('Error al eliminar producto.');
    }
}

// ─── SYNC TO SUPABASE ──────────────────────────

async function syncToSupabase() {
    const statusEl = document.getElementById('sync-status');
    statusEl.textContent = 'Sincronizando...';
    statusEl.style.color = 'var(--gold)';

    try {
        const res = await fetch('/api/sync/push', {
            method: 'POST'
        });

        if (!res.ok) throw new Error('Error en sincronizacion');

        const result = await res.json();
        const msg = `Sincronizacion completada.\nProductos: ${result.productos || 0} enviados\nOpiniones: ${result.opiniones || 0} enviadas`;
        alert(msg);

        statusEl.textContent = 'Sincronizado';
        statusEl.style.color = 'var(--success)';
    } catch (err) {
        alert('Error al sincronizar: ' + (err.message || 'Sin conexion a internet.'));
        statusEl.textContent = 'Error de sync';
        statusEl.style.color = 'var(--danger)';
    }
}

async function checkSyncStatus() {
    const statusEl = document.getElementById('sync-status');

    try {
        const res = await fetch('/api/sync/status');
        if (!res.ok) throw new Error('No se pudo obtener estado');

        const data = await res.json();

        // data.pendientes es un objeto {productos, opiniones, imagenes, total}
        const total = data.pendientes?.total ?? data.pendientes ?? 0;

        if (total > 0) {
            statusEl.textContent = `${total} cambio${total !== 1 ? 's' : ''} pendiente${total !== 1 ? 's' : ''}`;
            statusEl.style.color = 'var(--gold)';
        } else {
            statusEl.textContent = data.ultimoSync ? 'Sincronizado' : 'Sin cambios';
            statusEl.style.color = 'var(--text-muted)';
        }
    } catch (err) {
        statusEl.textContent = '';
    }
}

// ─── IMAGE CROPPER + COMPRESSION ────────────────

function abrirCropper(imageSrc) {
    const modal = document.getElementById('modal-cropper');
    const img = document.getElementById('cropper-image');

    img.src = imageSrc;
    modal.classList.add('active');

    // Wait for image to load then init cropper
    img.onload = () => {
        if (cropperInstance) cropperInstance.destroy();
        cropperInstance = new Cropper(img, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            responsive: true,
            background: false,
            guides: true
        });
    };
}

function cancelarCrop() {
    const modal = document.getElementById('modal-cropper');
    modal.classList.remove('active');
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    // Reset file input
    document.getElementById('prod-imagen').value = '';
    document.querySelector('.upload-text').textContent = 'Click o arrastra imagen';
    document.querySelector('.upload-icon').style.display = 'block';
}

async function confirmarCrop() {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
        maxWidth: 800,
        maxHeight: 800
    });

    // Compress iteratively to hit 20-100KB target
    imagenRecortada = await comprimirImagen(canvas);

    // Show preview
    const previewImg = document.getElementById('preview-img');
    previewImg.src = URL.createObjectURL(imagenRecortada);
    previewImg.style.display = 'block';

    const sizeKB = (imagenRecortada.size / 1024).toFixed(0);
    document.querySelector('.upload-text').textContent = `Imagen lista (${sizeKB} KB)`;
    document.querySelector('.upload-icon').style.display = 'none';

    // Close modal
    document.getElementById('modal-cropper').classList.remove('active');
    cropperInstance.destroy();
    cropperInstance = null;
}

function comprimirImagen(canvas) {
    return new Promise((resolve) => {
        const targetMaxKB = 100;
        const targetMinKB = 20;
        let quality = 0.8;

        function intentar() {
            canvas.toBlob((blob) => {
                const sizeKB = blob.size / 1024;

                if (sizeKB > targetMaxKB && quality > 0.1) {
                    // Too big, reduce quality
                    quality -= 0.1;
                    intentar();
                } else if (sizeKB < targetMinKB && quality < 0.95) {
                    // Too small, increase quality
                    quality += 0.05;
                    intentar();
                } else {
                    resolve(blob);
                }
            }, 'image/jpeg', quality);
        }

        intentar();
    });
}

// ─── INIT ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    checkSyncStatus();

    const fileInput = document.getElementById('prod-imagen');
    const wrapper = document.getElementById('upload-wrapper');
    const uploadText = document.querySelector('.upload-text');
    const uploadIcon = document.querySelector('.upload-icon');

    // Click to upload
    wrapper.addEventListener('click', (e) => {
        if (e.target !== fileInput) fileInput.click();
    });

    // File selected → open cropper
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                abrirCropper(e.target.result);
            };
            reader.readAsDataURL(fileInput.files[0]);
        }
    });

    // Drag & drop
    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        wrapper.classList.add('drag-over');
    });

    wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('drag-over');
    });

    wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
});
