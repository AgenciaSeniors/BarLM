// ══════════════════════════════════════════════════
// BAR LM — MENU ENGINE (Supabase)
// ══════════════════════════════════════════════════

let searchTimeout;
let todosLosProductos = [];
let productoActual = null;
let puntuacionSeleccionada = 0;

// === CATEGORY CONFIG ===
const CATEGORIAS = {
    cafes_calientes:       { nombre: 'Cafés Calientes', icono: '☕', quote: '"Tu cerebro dice agua, tu corazón dice tequila, pero el reloj dice café."' },
    cafes_frios:           { nombre: 'Cafés Fríos', icono: '🧊', quote: '' },
    cocteles_sin_alcohol:  { nombre: 'Cocteles Sin Alcohol', icono: '🍹', quote: '"No te preguntes qué llevan. Solo confía en el bartender."' },
    cocteles_con_alcohol:  { nombre: 'Cocteles Con Alcohol', icono: '🍸', quote: '' },
    cocteles_vodka:        { nombre: 'Con Vodka', icono: '🍷', quote: '"Dime qué base pides y te diré quién eres."' },
    cocteles_cerveza:      { nombre: 'Con Cerveza', icono: '🍺', quote: '' },
    cocteles_vino:         { nombre: 'Con Vino', icono: '🍷', quote: '' },
    cocteles_ginebra:      { nombre: 'Con Ginebra', icono: '🫒', quote: '' },
    cocteles_tequila:      { nombre: 'Con Tequila', icono: '🌵', quote: '' },
    cocteles_whisky:       { nombre: 'Con Whisky', icono: '🥃', quote: '' },
    entrantes:             { nombre: 'Entrantes', icono: '🍟', quote: '"El famoso yo no tengo hambre, solo voy a picar algo empieza oficialmente aquí."' },
    hamburguesas:          { nombre: 'Hamburguesas', icono: '🍔', quote: '' },
    entremes:              { nombre: 'Entremés', icono: '🧀', quote: '' },
    tacos:                 { nombre: 'Tacos Mexicanos', icono: '🌮', quote: '' },
    pizzas:                { nombre: 'Pizzas', icono: '🍕', quote: '"Si la respuesta es pizza, la pregunta no importa."' },
    cervezas:              { nombre: 'Cervezas', icono: '🍺', quote: '"Algunos beben para pensar. Otros para no hacerlo."' },
    vinos:                 { nombre: 'Vinos', icono: '🍷', quote: '' },
    refrescantes:          { nombre: 'Refrescantes', icono: '🥤', quote: '' },
    otras_bebidas:         { nombre: 'Otras Bebidas', icono: '🥃', quote: '' },
};

// ══════════════════════════════════════════════════
// 1. CARGAR MENÚ DESDE SUPABASE
// ══════════════════════════════════════════════════
async function cargarMenu() {
    const grid = document.getElementById('menu-grid');
    if (grid) grid.innerHTML = '<p style="text-align:center; color:#9b8ab0; padding:40px;">Cargando carta...</p>';

    try {
        if (typeof supabaseClient === 'undefined') {
            throw new Error("Supabase no está conectado.");
        }

        let { data: productos, error } = await supabaseClient
            .from('productos')
            .select('*, opiniones(puntuacion)')
            .eq('activo', true)
            .eq('restaurant_id', CONFIG.RESTAURANT_ID)
            .order('categoria', { ascending: true })
            .order('destacado', { ascending: false })
            .order('id', { ascending: false });

        if (error) throw error;

        todosLosProductos = (productos || []).map(prod => {
            const opiniones = prod.opiniones || [];
            const total = opiniones.length;
            const suma = opiniones.reduce((acc, curr) => acc + curr.puntuacion, 0);
            prod.ratingPromedio = total ? (suma / total).toFixed(1) : null;
            return prod;
        });

    } catch (err) {
        console.error("Error cargando:", err);
        const grid = document.getElementById('menu-grid');
        if (grid) grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠</div><p>Error al cargar el menú. Recarga la página.</p></div>';
        return;
    }

    renderizarMenu(todosLosProductos);
}

// ══════════════════════════════════════════════════
// 2. RENDERIZAR MENÚ
// ══════════════════════════════════════════════════
function renderizarMenu(lista) {
    const contenedor = document.getElementById('menu-grid');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<div class="empty-state"><div class="empty-icon">◆</div><p>No se encontraron productos.</p></div>';
        return;
    }

    Object.keys(CATEGORIAS).forEach(catKey => {
        const items = lista.filter(p => p.categoria === catKey);
        if (items.length === 0) return;

        const cat = CATEGORIAS[catKey];
        const section = document.createElement('div');
        section.className = 'category-section';
        section.id = `section-${catKey}`;
        section.setAttribute('data-categoria', catKey);

        section.innerHTML = `
            <h2 class="category-title"><span class="cat-icon">${cat.icono}</span> ${cat.nombre}</h2>
            ${cat.quote ? `<p class="category-quote">${cat.quote}</p>` : ''}
            <div class="horizontal-scroll">
                ${items.map(item => {
                    const esAgotado = item.estado === 'agotado';
                    const esProximamente = item.estado === 'proximamente';
                    const claseEstado = esAgotado ? 'is-agotado' : esProximamente ? 'is-proximamente' : '';
                    const clickable = !esAgotado;

                    return `
                        <div class="card ${claseEstado}" ${clickable ? `onclick="abrirDetalle(${item.id})"` : ''}>
                            <div class="card-img-container">
                                ${esAgotado ? '<div class="badge-agotado"><span>AGOTADO</span></div>' : ''}
                                ${esProximamente ? '<div class="badge-proximamente"><span>PRÓXIMAMENTE</span></div>' : ''}
                                <img src="${item.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop'}" alt="${item.nombre}" loading="lazy">
                                ${item.destacado ? '<span class="tag-top">TOP</span>' : ''}
                            </div>
                            <div class="card-body">
                                <h3>${item.nombre}</h3>
                                <div class="card-footer">
                                    <span class="card-price">${item.precio > 0 ? '$' + item.precio.toLocaleString() : ''}</span>
                                    ${item.ratingPromedio ? `<span class="card-rating">★ ${item.ratingPromedio}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        contenedor.appendChild(section);
    });

    activarObservador();
}

// ══════════════════════════════════════════════════
// 3. DETALLE DEL PRODUCTO
// ══════════════════════════════════════════════════
async function abrirDetalle(id) {
    const idNum = Number(id);
    productoActual = todosLosProductos.find(p => p.id === idNum);
    if (!productoActual) return;

    document.getElementById('det-titulo').textContent = productoActual.nombre;
    document.getElementById('det-desc').textContent = productoActual.descripcion || '';
    document.getElementById('det-price').textContent = `$${productoActual.precio.toLocaleString()}`;
    document.getElementById('det-img').src = productoActual.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop';

    // Calcular promedio real desde Supabase
    try {
        const { data: notas, error } = await supabaseClient
            .from('opiniones')
            .select('puntuacion')
            .eq('producto_id', idNum);

        if (error) throw error;

        let promedio = "0.0";
        let cantidad = 0;

        if (notas && notas.length > 0) {
            const suma = notas.reduce((acc, curr) => acc + curr.puntuacion, 0);
            promedio = (suma / notas.length).toFixed(1);
            cantidad = notas.length;
        }

        document.getElementById('det-rating').textContent = promedio;
        document.getElementById('det-reviews-count').textContent = `(${cantidad} reseñas)`;
    } catch (err) {
        console.error("Error en promedio:", err);
    }

    const modal = document.getElementById('modal-detalle');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function cerrarDetalle() {
    const modal = document.getElementById('modal-detalle');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 400);
    }
}

// ══════════════════════════════════════════════════
// 4. SISTEMA DE OPINIONES
// ══════════════════════════════════════════════════
function abrirOpinion() {
    cerrarDetalle();
    const m = document.getElementById('modal-opinion');
    if (m) {
        m.classList.add('active');
        resetOpinion();
    }
}

function cerrarOpinion() {
    const m = document.getElementById('modal-opinion');
    if (m) m.classList.remove('active');
}

function resetOpinion() {
    puntuacionSeleccionada = 0;
    document.querySelectorAll('#stars-container span').forEach(s => s.classList.remove('lit'));
    document.getElementById('op-nombre').value = '';
    document.getElementById('op-comentario').value = '';
}

async function enviarOpinion() {
    if (!puntuacionSeleccionada || puntuacionSeleccionada === 0) {
        showToast('⚠️ Selecciona una puntuación con las estrellas.');
        return;
    }

    const elNombre = document.getElementById('op-nombre');
    const elComentario = document.getElementById('op-comentario');

    if (!elNombre || !elComentario) return;

    const btn = document.getElementById('btn-enviar');
    btn.disabled = true;
    btn.textContent = "ENVIANDO...";

    try {
        const { error } = await supabaseClient
            .from('opiniones')
            .insert([{
                producto_id: productoActual.id,
                cliente_nombre: elNombre.value.trim() || "Anónimo",
                comentario: elComentario.value.trim(),
                puntuacion: puntuacionSeleccionada,
                restaurant_id: CONFIG.RESTAURANT_ID
            }]);

        if (error) throw error;

        showToast('✅ ¡Gracias! Tu opinión ha sido enviada.');
        cerrarOpinion();

    } catch (err) {
        console.error("Error al enviar:", err);
        showToast('❌ No se pudo enviar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "ENVIAR";
    }
}

async function abrirListaOpiniones() {
    const contenedor = document.getElementById('reviews-list');
    const modalLista = document.getElementById('modal-reviews');

    if (!productoActual) return;

    modalLista.classList.add('active');
    contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:#9b8ab0;">Cargando...</p>';

    try {
        const { data: opiniones, error } = await supabaseClient
            .from('opiniones')
            .select('*')
            .eq('producto_id', productoActual.id)
            .order('id', { ascending: false });

        if (error) throw error;

        if (!opiniones || opiniones.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; padding:20px; color:#5e4f73;">Sin reseñas aún.</p>';
            return;
        }

        contenedor.innerHTML = opiniones.map(op => `
            <div style="background:rgba(255,255,255,0.03); padding:14px; border-radius:10px; margin-bottom:10px; border-left:3px solid var(--neon-primary);">
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:var(--text-primary); font-size:0.9rem;">${op.cliente_nombre || 'Anónimo'}</strong>
                    <span style="color:#fbbf24; font-size:0.8rem;">${'★'.repeat(op.puntuacion)}</span>
                </div>
                <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:6px;">"${op.comentario || 'Sin comentario.'}"</p>
            </div>
        `).join('');

    } catch (err) {
        contenedor.innerHTML = '<p style="color:#ef4444; text-align:center;">Error al conectar.</p>';
    }
}

function cerrarReviews() {
    const m = document.getElementById('modal-reviews');
    if (m) m.classList.remove('active');
}

// ══════════════════════════════════════════════════
// 5. ESTRELLAS
// ══════════════════════════════════════════════════
document.addEventListener('click', e => {
    const star = e.target.closest('#stars-container span');
    if (!star) return;
    puntuacionSeleccionada = parseInt(star.dataset.val);
    document.querySelectorAll('#stars-container span').forEach((s, i) => {
        s.classList.toggle('lit', i < puntuacionSeleccionada);
    });
});

// ══════════════════════════════════════════════════
// 6. BUSCADOR
// ══════════════════════════════════════════════════
document.getElementById('search-input').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
            renderizarMenu(todosLosProductos);
            return;
        }
        const filtrados = todosLosProductos.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(q))
        );
        renderizarMenu(filtrados);
    }, 300);
});

// ══════════════════════════════════════════════════
// 7. FILTROS DE CATEGORÍA
// ══════════════════════════════════════════════════
document.getElementById('filters-nav').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cat = btn.dataset.cat;
    if (cat === 'inicio') {
        document.getElementById('search-input').value = '';
        renderizarMenu(todosLosProductos);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    const search = document.getElementById('search-input');
    if (search.value) {
        search.value = '';
        renderizarMenu(todosLosProductos);
    }

    const section = document.getElementById(`section-${cat}`);
    if (section) {
        const pos = section.offsetTop - 120;
        window.scrollTo({ top: pos, behavior: 'smooth' });
    }
});

// ══════════════════════════════════════════════════
// 8. INTERSECTION OBSERVER (auto-highlight filtros)
// ══════════════════════════════════════════════════
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const cat = entry.target.dataset.categoria;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.cat === cat) {
                    btn.classList.add('active');
                    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }
    });
}, { rootMargin: '-150px 0px -70% 0px', threshold: 0 });

function activarObservador() {
    document.querySelectorAll('.category-section').forEach(sec => observer.observe(sec));
}

// ══════════════════════════════════════════════════
// 9. TOAST
// ══════════════════════════════════════════════════
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════════
// 10. IR AL INICIO
// ══════════════════════════════════════════════════
function irAlInicio(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('search-input').value = '';
    renderizarMenu(todosLosProductos);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', cargarMenu);
