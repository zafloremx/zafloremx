'use strict';

const STORAGE_KEY = 'zaflore_products';
const MAX_PRODUCTS = 100;
const MAX_IMPORT_BYTES = 1024 * 1024;
const ALLOWED_CATEGORIES = new Set(['premium', 'amor', 'graduacion', 'cumpleanos', 'condolencias']);
const ALLOWED_OCCASIONS = new Set(['cumpleanos', 'aniversario', 'graduacion', 'evento', 'condolencias', 'agradecimiento']);
const SAFE_IMAGE_PATH = /^images\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

let products = [];

const byId = id => document.getElementById(id);

function cleanText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function createSlug(value) {
  return cleanText(value, 70)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function validateProduct(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = /^[a-zA-Z0-9_-]{1,70}$/.test(cleanText(raw.id, 70))
    ? cleanText(raw.id, 70)
    : createSlug(raw.name);

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
  if (!Array.isArray(data) || data.length > MAX_PRODUCTS) {
    throw new Error(`El catálogo debe ser una lista de máximo ${MAX_PRODUCTS} productos.`);
  }

  const result = [];
  const ids = new Set();

  for (const raw of data) {
    const product = validateProduct(raw);
    if (!product) throw new Error('El archivo contiene uno o más productos inválidos.');
    if (ids.has(product.id)) throw new Error(`El identificador "${product.id}" está duplicado.`);

    ids.add(product.id);
    result.push(product);
  }

  return result;
}

function setStatus(message, isError = false) {
  const status = byId('adminStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function fetchOriginalCatalog() {
  const response = await fetch('products.json', {
    cache: 'no-store',
    credentials: 'same-origin'
  });

  if (!response.ok) throw new Error('No fue posible cargar products.json.');
  return validateCatalog(await response.json());
}

async function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      products = validateCatalog(JSON.parse(saved));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      products = await fetchOriginalCatalog();
      setStatus('Se ignoró una copia local inválida y se restauró el catálogo original.', true);
    }
  } else {
    products = await fetchOriginalCatalog();
  }

  renderList();
}

function saveLocal(message = 'Cambios guardados localmente.') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  renderList();
  setStatus(message);
}

function appendTextElement(parent, tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.appendChild(element);
  return element;
}

function renderList() {
  const list = byId('adminList');
  const fragment = document.createDocumentFragment();

  products.forEach(product => {
    const article = document.createElement('article');
    article.className = 'admin-item';

    const information = document.createElement('div');
    appendTextElement(information, 'strong', product.name);
    appendTextElement(
      information,
      'span',
      `$${product.price.toLocaleString('es-MX')} · ${product.category}`
    );

    const actions = document.createElement('div');

    const editButton = appendTextElement(actions, 'button', 'Editar');
    editButton.type = 'button';
    editButton.dataset.editId = product.id;

    const deleteButton = appendTextElement(actions, 'button', 'Eliminar');
    deleteButton.type = 'button';
    deleteButton.dataset.deleteId = product.id;

    article.append(information, actions);
    fragment.appendChild(article);
  });

  list.replaceChildren(fragment);
}

function splitList(value, maxItems = 8) {
  return [...new Set(
    value
      .split(',')
      .map(item => cleanText(item, 30).toLowerCase())
      .filter(Boolean)
  )].slice(0, maxItems);
}

byId('adminForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  const currentId = cleanText(byId('adminId').value, 70);
  const name = cleanText(byId('adminName').value, 80);
  const id = currentId || createSlug(name) || `producto-${Date.now()}`;

  const candidate = validateProduct({
    id,
    name,
    category: byId('adminCategory').value,
    occasion: splitList(byId('adminOccasion').value).filter(item => ALLOWED_OCCASIONS.has(item)),
    colors: splitList(byId('adminColors').value),
    price: Number(byId('adminPrice').value),
    featured: byId('adminFeatured').checked,
    image: byId('adminImage').value,
    description: byId('adminDescription').value
  });

  if (!candidate) {
    setStatus('Revisa los datos. La ruta de imagen debe comenzar con images/ y usar JPG, PNG o WEBP.', true);
    return;
  }

  const duplicateIndex = products.findIndex(product => product.id === candidate.id);
  if (duplicateIndex >= 0) {
    products[duplicateIndex] = candidate;
  } else {
    if (products.length >= MAX_PRODUCTS) {
      setStatus(`Se alcanzó el límite de ${MAX_PRODUCTS} productos.`, true);
      return;
    }
    products.push(candidate);
  }

  saveLocal('Producto guardado localmente.');
  event.currentTarget.reset();
  byId('adminId').value = '';
  byId('adminImage').value = 'images/arreglo-1.jpg';
});

byId('adminList').addEventListener('click', event => {
  const editButton = event.target.closest('button[data-edit-id]');
  const deleteButton = event.target.closest('button[data-delete-id]');

  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.editId);
    if (!product) return;

    byId('adminId').value = product.id;
    byId('adminName').value = product.name;
    byId('adminCategory').value = product.category;
    byId('adminOccasion').value = product.occasion.join(', ');
    byId('adminColors').value = product.colors.join(', ');
    byId('adminPrice').value = String(product.price);
    byId('adminFeatured').checked = product.featured;
    byId('adminImage').value = product.image;
    byId('adminDescription').value = product.description;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteId;
    const product = products.find(item => item.id === id);
    if (!product) return;

    if (window.confirm(`¿Eliminar "${product.name}"?`)) {
      products = products.filter(item => item.id !== id);
      saveLocal('Producto eliminado localmente.');
    }
  }
});

byId('resetAdmin').addEventListener('click', () => {
  byId('adminForm').reset();
  byId('adminId').value = '';
  byId('adminImage').value = 'images/arreglo-1.jpg';
  setStatus('Formulario listo para un producto nuevo.');
});

byId('exportProducts').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(products, null, 2)], {
    type: 'application/json;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'products.json';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  setStatus('Archivo products.json exportado.');
});

byId('importProducts').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';

  if (!file) return;

  if (file.size > MAX_IMPORT_BYTES) {
    setStatus('El archivo supera el límite de 1 MB.', true);
    return;
  }

  if (!file.name.toLowerCase().endsWith('.json')) {
    setStatus('Solo se permiten archivos JSON.', true);
    return;
  }

  try {
    const imported = validateCatalog(JSON.parse(await file.text()));
    products = imported;
    saveLocal(`Catálogo importado: ${products.length} productos.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'El archivo JSON no es válido.', true);
  }
});

byId('restoreProducts').addEventListener('click', async () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    products = await fetchOriginalCatalog();
    renderList();
    setStatus('Catálogo original restaurado.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'No fue posible restaurar el catálogo.', true);
  }
});

loadProducts().catch(error => {
  setStatus(error instanceof Error ? error.message : 'No fue posible abrir el administrador.', true);
});
