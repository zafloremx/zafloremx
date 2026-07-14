'use strict';

const WHATSAPP_NUMBER = '527204433198';
const STORAGE_KEY = 'zaflore_products';
const RECOMMENDATION_STORAGE_KEY = 'zaflore_pending_recommendations';
const MAX_PENDING_RECOMMENDATIONS = 6;
const MAX_PRODUCTS = 100;
const ALLOWED_CATEGORIES = new Set(['premium', 'amor', 'graduacion', 'cumpleanos', 'condolencias']);
const ALLOWED_OCCASIONS = new Set(['cumpleanos', 'aniversario', 'graduacion', 'evento', 'condolencias', 'agradecimiento']);
const SAFE_IMAGE_PATH = /^images\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

let catalogProducts = [];
const DEFAULT_PRODUCTS = Object.freeze([{"id":"elegancia-rosa","name":"Elegancia Rosa","category":"amor","occasion":["aniversario","cumpleanos"],"colors":["rosa","blanco"],"price":1450,"featured":true,"image":"images/arreglo-1.jpg","description":"Ramo de autor en tonos rosa y blanco, con follaje fino y acabado elegante."},{"id":"signature-gold","name":"Signature Gold","category":"premium","occasion":["aniversario","evento"],"colors":["blanco","dorado"],"price":2200,"featured":true,"image":"images/arreglo-2.jpg","description":"Diseño premium en caja con composición equilibrada y detalles de presentación."},{"id":"bouquet-celebracion","name":"Bouquet Celebración","category":"graduacion","occasion":["graduacion","cumpleanos"],"colors":["rosa","morado"],"price":1250,"featured":true,"image":"images/arreglo-3.jpg","description":"Bouquet diseñado para graduaciones, cumpleaños y celebraciones especiales."},{"id":"edicion-privada","name":"Edición Privada","category":"premium","occasion":["evento","aniversario"],"colors":["blanco","verde"],"price":3200,"featured":true,"image":"images/arreglo-4.jpg","description":"Composición floral de gran formato creada según la ocasión y el espacio."},{"id":"detalle-clasico","name":"Detalle Clásico","category":"cumpleanos","occasion":["cumpleanos","agradecimiento"],"colors":["blanco","rosa"],"price":950,"featured":false,"image":"images/arreglo-1.jpg","description":"Una opción versátil y refinada para agradecer o celebrar."},{"id":"serenidad","name":"Serenidad","category":"condolencias","occasion":["condolencias"],"colors":["blanco","verde"],"price":1800,"featured":false,"image":"images/arreglo-4.jpg","description":"Diseño sobrio y respetuoso en tonos claros y follaje natural."}]);

const byId = id => document.getElementById(id);
const loader = byId('pageLoader');
const header = byId('header');
const menu = byId('menu');
const menuToggle = byId('menuToggle');

function cleanText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function validSlug(value) {
  const slug = cleanText(value, 70);
  return /^[a-zA-Z0-9_-]{1,70}$/.test(slug) ? slug : '';
}

function validateProduct(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = validSlug(raw.id);
  const name = cleanText(raw.name, 80);
  const category = cleanText(raw.category, 30).toLowerCase();
  const description = cleanText(raw.description, 320);
  const image = cleanText(raw.image, 120);
  const price = Number(raw.price);

  const occasion = Array.isArray(raw.occasion)
    ? [...new Set(raw.occasion.map(item => cleanText(item, 30).toLowerCase()).filter(item => ALLOWED_OCCASIONS.has(item)))].slice(0, 8)
    : [];

  const colors = Array.isArray(raw.colors)
    ? [...new Set(raw.colors.map(item => cleanText(item, 30)).filter(Boolean))].slice(0, 8)
    : [];

  if (!id || !name || !ALLOWED_CATEGORIES.has(category)) return null;
  if (!Number.isFinite(price) || price < 0 || price > 100000) return null;
  if (!SAFE_IMAGE_PATH.test(image)) return null;

  return {
    id,
    name,
    category,
    occasion,
    colors,
    price: Math.round(price),
    featured: Boolean(raw.featured),
    image,
    description
  };
}

function validateCatalog(data) {
  if (!Array.isArray(data) || data.length > MAX_PRODUCTS) return [];
  const products = [];
  const usedIds = new Set();

  for (const raw of data) {
    const product = validateProduct(raw);
    if (product && !usedIds.has(product.id)) {
      products.push(product);
      usedIds.add(product.id);
    }
  }

  return products;
}


function getStoredCatalog() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('El navegador no permite leer almacenamiento local.', error);
    return null;
  }
}

function removeStoredCatalog() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('No fue posible limpiar el almacenamiento local.', error);
  }
}

function safeParseCatalog(value) {
  try {
    return validateCatalog(JSON.parse(value));
  } catch {
    return [];
  }
}

function openExternal(url) {
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (popup) popup.opener = null;
}

function openWhatsApp(message) {
  const safeMessage = cleanText(message, 1500);
  openExternal(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(safeMessage)}`);
}

window.addEventListener('load', () => {
  window.setTimeout(() => loader?.classList.add('hidden'), 350);
});

window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 24);
}, { passive: true });

menuToggle?.addEventListener('click', () => {
  const open = menu.classList.toggle('active');
  menuToggle.classList.toggle('active');
  menuToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});

document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', () => {
    menu.classList.remove('active');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  });
});

document.querySelectorAll('.whatsapp-link').forEach(control => {
  control.addEventListener('click', () => {
    openWhatsApp(control.dataset.message || 'Hola, quiero información de ZAFLORÉ.');
  });
});

async function loadCatalog() {
  let products = [];
  let source = 'respaldo integrado';

  const localValue = getStoredCatalog();

  if (localValue) {
    products = safeParseCatalog(localValue);

    if (products.length) {
      source = 'administrador local';
    } else {
      removeStoredCatalog();
    }
  }

  if (!products.length) {
    try {
      const response = await fetch('./products.json', {
        cache: 'no-store',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`products.json respondió con estado ${response.status}.`);
      }

      const fetchedProducts = validateCatalog(await response.json());

      if (!fetchedProducts.length) {
        throw new Error('products.json no contiene productos válidos.');
      }

      products = fetchedProducts;
      source = 'products.json';
    } catch (error) {
      console.warn('Se utilizará el catálogo de respaldo.', error);
      products = validateCatalog(DEFAULT_PRODUCTS);
    }
  }

  catalogProducts = products;
  renderCatalog();

  const status = byId('catalogStatus');
  if (status) {
    status.textContent = catalogProducts.length
      ? `${catalogProducts.length} diseños disponibles. Catálogo cargado desde ${source}.`
      : 'No fue posible cargar productos.';
    status.classList.toggle('catalog-error', catalogProducts.length === 0);
  }
}

function appendTextElement(parent, tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function createProductCard(product) {
  const article = document.createElement('article');
  article.className = 'product-card reveal visible';

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.name;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.width = 520;
  image.height = 420;
  article.appendChild(image);

  const body = document.createElement('div');
  body.className = 'product-card-body';
  article.appendChild(body);

  appendTextElement(body, 'span', product.category);
  appendTextElement(body, 'h3', product.name);
  appendTextElement(body, 'p', product.description || 'Diseño floral sujeto a disponibilidad.');
  appendTextElement(body, 'strong', `Desde $${product.price.toLocaleString('es-MX')} MXN`);

  const button = appendTextElement(body, 'button', 'Cotizar por WhatsApp', 'product-whatsapp');
  button.type = 'button';
  button.dataset.productId = product.id;

  return article;
}

function renderCatalog() {
  const occasion = byId('filterOccasion').value;
  const category = byId('filterCategory').value;
  const price = Number(byId('filterPrice').value || 0);

  const filtered = catalogProducts.filter(product =>
    (!occasion || product.occasion.includes(occasion)) &&
    (!category || product.category === category) &&
    (!price || product.price <= price)
  );

  const grid = byId('productGrid');
  grid.replaceChildren(...filtered.map(createProductCard));
  byId('emptyCatalog').hidden = filtered.length > 0;
}

['filterOccasion', 'filterCategory', 'filterPrice'].forEach(id => {
  byId(id)?.addEventListener('change', renderCatalog);
});

byId('clearFilters')?.addEventListener('click', () => {
  ['filterOccasion', 'filterCategory', 'filterPrice'].forEach(id => {
    byId(id).value = '';
  });
  renderCatalog();
});

byId('productGrid')?.addEventListener('click', event => {
  const button = event.target.closest('button[data-product-id]');
  if (!button) return;

  const product = catalogProducts.find(item => item.id === button.dataset.productId);
  if (!product) return;

  openWhatsApp(`Hola, me interesa el arreglo ${product.name}. ¿Podrían confirmarme disponibilidad y precio?`);
});

document.querySelectorAll('.catalog-shortcut').forEach(button => {
  button.addEventListener('click', () => {
    const occasion = cleanText(button.dataset.occasion, 30);
    if (!ALLOWED_OCCASIONS.has(occasion)) return;

    byId('filterOccasion').value = occasion;
    renderCatalog();
    byId('catalogo').scrollIntoView({ behavior: 'smooth' });
  });
});

function updateAssistant() {
  const occasion = byId('quoteOccasion').value;
  const budget = Number(byId('quoteBudget').value || 0);
  let text = 'Selecciona una ocasión y presupuesto para recibir una sugerencia.';

  if (occasion && budget) {
    const labels = {
      cumpleanos: 'un ramo alegre o una caja floral personalizada',
      aniversario: 'una composición romántica con acabado premium',
      graduacion: 'un bouquet de celebración con detalles decorativos',
      evento: 'una composición de mayor formato adaptada al espacio',
      condolencias: 'un diseño sobrio en tonos blancos y verdes'
    };

    const level = budget <= 1000
      ? 'compacto y elegante'
      : budget <= 1500
        ? 'de tamaño medio'
        : budget <= 2500
          ? 'premium'
          : 'de gran formato';

    text = `Te sugerimos ${labels[occasion]}, en formato ${level}. La selección final dependerá de la temporada y disponibilidad.`;
  }

  byId('assistantText').textContent = text;
}

['quoteOccasion', 'quoteBudget'].forEach(id => {
  byId(id)?.addEventListener('change', updateAssistant);
});

byId('quoteForm')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  const occasion = cleanText(byId('quoteOccasion').value, 30);
  const budget = cleanText(byId('quoteBudget').selectedOptions[0]?.text, 80);
  const color = cleanText(byId('quoteColor').value, 80);
  const date = cleanText(byId('quoteDate').value, 20) || 'Por definir';
  const zone = cleanText(byId('quoteZone').value, 80) || 'Por definir';
  const notes = cleanText(byId('quoteNotes').value, 600) || 'Sin indicaciones adicionales';

  openWhatsApp([
    'Hola, quiero solicitar una propuesta con ZAFLORÉ.',
    `Ocasión: ${occasion}`,
    `Presupuesto: ${budget}`,
    `Colores: ${color}`,
    `Fecha: ${date}`,
    `Zona: ${zone}`,
    `Indicaciones: ${notes}`,
    `Recomendación del asistente: ${cleanText(byId('assistantText').textContent, 400)}`
  ].join('\n'));
});

byId('contactForm')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  openWhatsApp([
    'Hola, quiero solicitar una cotización con ZAFLORÉ.',
    `Nombre: ${cleanText(byId('name').value, 80)}`,
    `Ocasión: ${cleanText(byId('occasion').value, 40)}`,
    `Presupuesto: ${cleanText(byId('budget').value, 40) || 'Por definir'}`,
    `Detalles: ${cleanText(byId('message').value, 600) || 'Sin detalles adicionales'}`
  ].join('\n'));
});



function loadPendingRecommendations() {
  try {
    const value = localStorage.getItem(RECOMMENDATION_STORAGE_KEY);
    if (!value) return [];

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item === 'object')
      .slice(0, MAX_PENDING_RECOMMENDATIONS)
      .map(item => ({
        name: cleanText(item.name, 60),
        rating: Math.min(5, Math.max(1, Number(item.rating) || 1)),
        occasion: cleanText(item.occasion, 60),
        message: cleanText(item.message, 500),
        createdAt: cleanText(item.createdAt, 40)
      }))
      .filter(item => item.name && item.message);
  } catch {
    return [];
  }
}

function savePendingRecommendations(items) {
  localStorage.setItem(
    RECOMMENDATION_STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_PENDING_RECOMMENDATIONS))
  );
}

function createPendingRecommendationCard(item) {
  const article = document.createElement('article');
  article.className = 'pending-recommendation-card';

  const header = document.createElement('header');

  const name = document.createElement('strong');
  name.textContent = item.name;

  const rating = document.createElement('span');
  rating.textContent = `${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}`;

  header.append(name, rating);

  const experience = document.createElement('p');
  experience.textContent = item.occasion;

  const message = document.createElement('p');
  message.textContent = item.message;

  const badge = document.createElement('span');
  badge.className = 'pending-badge';
  badge.textContent = 'Pendiente de aprobación';

  article.append(header, experience, message, badge);
  return article;
}

function renderPendingRecommendations() {
  const list = byId('pendingRecommendationsList');
  const help = byId('pendingRecommendationsHelp');

  if (!list || !help) return;

  const items = loadPendingRecommendations();
  list.replaceChildren(...items.map(createPendingRecommendationCard));
  help.hidden = items.length > 0;
}

byId('recommendationForm')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  const name = cleanText(byId('recommendationName').value, 60);
  const rating = Math.min(5, Math.max(1, Number(byId('recommendationRating').value) || 1));
  const occasion = cleanText(byId('recommendationOccasion').value, 60);
  const message = cleanText(byId('recommendationMessage').value, 500);
  const consent = byId('recommendationConsent').checked;

  if (!name || message.length < 20 || !consent) return;

  const item = {
    name,
    rating,
    occasion,
    message,
    createdAt: new Date().toISOString()
  };

  const items = loadPendingRecommendations();
  items.unshift(item);
  savePendingRecommendations(items);
  renderPendingRecommendations();

  openWhatsApp([
    'Hola, quiero compartir una recomendación sobre ZAFLORÉ.',
    `Nombre o iniciales: ${name}`,
    `Calificación: ${rating} de 5 estrellas`,
    `Experiencia: ${occasion}`,
    `Comentario: ${message}`,
    'Autorizo que revisen este comentario y me contacten para confirmar su publicación.'
  ].join('\n'));

  event.currentTarget.reset();
});

byId('clearPendingRecommendations')?.addEventListener('click', () => {
  localStorage.removeItem(RECOMMENDATION_STORAGE_KEY);
  renderPendingRecommendations();
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

const year = byId('year');
if (year) year.textContent = String(new Date().getFullYear());

loadCatalog();
renderPendingRecommendations();
