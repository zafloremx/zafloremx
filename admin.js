
'use strict';

const STORAGE_KEY = 'zaflore_products';
const MAX_PRODUCTS = 100;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_CATEGORIES = new Set(['premium', 'amor', 'graduacion', 'cumpleanos', 'condolencias']);
const ALLOWED_OCCASIONS = new Set(['cumpleanos', 'aniversario', 'graduacion', 'evento', 'condolencias', 'agradecimiento']);
const SAFE_IMAGE_PATH = /^images\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;
const SAFE_IMAGE_NAME = /^[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i;

let products = [];
let projectDirectoryHandle = null;
let imagesDirectoryHandle = null;
let selectedImageFile = null;
let previewObjectUrl = null;
let feedbackObjectUrl = null;

const byId = id => document.getElementById(id);

function cleanText(value, maxLength = 300) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeHeader(value) {
  return cleanText(value, 80)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
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

function normalizeImageFilename(value) {
  const raw = cleanText(value, 120).replace(/^images\//i, '');
  const dot = raw.lastIndexOf('.');
  const extension = dot >= 0 ? raw.slice(dot).toLowerCase() : '';
  const base = dot >= 0 ? raw.slice(0, dot) : raw;
  const normalizedBase = createSlug(base).replace(/-/g, '_') || `imagen_${Date.now()}`;
  return `${normalizedBase}${extension}`;
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

function setFolderStatus(message, isError = false) {
  const status = byId('folderStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function fetchOriginalCatalog() {
  const response = await fetch('products.json', { cache: 'no-store', credentials: 'same-origin' });
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

    const thumbnail = document.createElement('img');
    thumbnail.className = 'admin-item-thumbnail';
    thumbnail.src = product.image;
    thumbnail.alt = '';

    const information = document.createElement('div');
    appendTextElement(information, 'strong', product.name);
    appendTextElement(information, 'span', `$${product.price.toLocaleString('es-MX')} · ${product.category}`);
    appendTextElement(information, 'small', product.image);

    const actions = document.createElement('div');
    const editButton = appendTextElement(actions, 'button', 'Editar');
    editButton.type = 'button';
    editButton.dataset.editId = product.id;

    const deleteButton = appendTextElement(actions, 'button', 'Eliminar');
    deleteButton.type = 'button';
    deleteButton.dataset.deleteId = product.id;

    article.append(thumbnail, information, actions);
    fragment.appendChild(article);
  });

  list.replaceChildren(fragment);
}

function splitList(value, maxItems = 8) {
  return [...new Set(
    String(value ?? '')
      .split(',')
      .map(item => cleanText(item, 30).toLowerCase())
      .filter(Boolean)
  )].slice(0, maxItems);
}

function updatePreview(source, message = '') {
  const preview = byId('adminImagePreview');
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  if (source instanceof File) {
    previewObjectUrl = URL.createObjectURL(source);
    preview.src = previewObjectUrl;
  } else {
    preview.src = source || 'images/arreglo-1.jpg';
  }
  byId('adminImageHelp').textContent = message || 'Vista previa de la imagen del producto.';
}

async function selectProjectFolder() {
  if (!('showDirectoryPicker' in window)) {
    setFolderStatus('Este navegador no permite seleccionar carpetas. Usa Chrome o Edge actualizado.', true);
    return;
  }

  try {
    projectDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    imagesDirectoryHandle = await projectDirectoryHandle.getDirectoryHandle('images', { create: true });
    setFolderStatus(`Proyecto seleccionado: ${projectDirectoryHandle.name}/images`);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      setFolderStatus('No fue posible abrir la carpeta del proyecto.', true);
    }
  }
}

async function saveImageToProject(file, filename) {
  if (!imagesDirectoryHandle) {
    throw new Error('Selecciona primero la carpeta local del proyecto.');
  }

  const handle = await imagesDirectoryHandle.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
}

async function imageExists(filename) {
  if (!SAFE_IMAGE_NAME.test(filename)) return false;

  if (imagesDirectoryHandle) {
    try {
      await imagesDirectoryHandle.getFileHandle(filename);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const response = await fetch(`images/${encodeURIComponent(filename)}`, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'same-origin'
    });
    return response.ok;
  } catch {
    return false;
  }
}

byId('selectProjectFolder').addEventListener('click', selectProjectFolder);

byId('adminImageFile').addEventListener('change', event => {
  const file = event.target.files?.[0] || null;
  selectedImageFile = null;

  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES) {
    setStatus('La imagen supera el límite de 8 MB.', true);
    event.target.value = '';
    return;
  }

  if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type)) {
    setStatus('Solo se permiten imágenes JPG, PNG o WEBP.', true);
    event.target.value = '';
    return;
  }

  const filename = normalizeImageFilename(file.name);
  if (!SAFE_IMAGE_NAME.test(filename)) {
    setStatus('El nombre de imagen no es válido.', true);
    event.target.value = '';
    return;
  }

  selectedImageFile = file;
  byId('adminImage').value = `images/${filename}`;
  updatePreview(file, `Vista previa: ${filename}. Se guardará al registrar el producto.`);
});

byId('adminImage').addEventListener('input', event => {
  if (!selectedImageFile) updatePreview(cleanText(event.target.value, 120));
});

byId('adminForm').addEventListener('submit', async event => {
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
    setStatus('Revisa los datos. La ruta debe comenzar con images/ y usar JPG, PNG o WEBP.', true);
    return;
  }

  try {
    if (selectedImageFile) {
      await saveImageToProject(selectedImageFile, candidate.image.replace(/^images\//, ''));
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

    saveLocal(selectedImageFile
      ? 'Producto guardado e imagen copiada en la carpeta images.'
      : 'Producto guardado localmente.');

    event.currentTarget.reset();
    byId('adminId').value = '';
    byId('adminImage').value = 'images/arreglo-1.jpg';
    selectedImageFile = null;
    updatePreview('images/arreglo-1.jpg');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'No fue posible guardar el producto.', true);
  }
});

byId('adminList').addEventListener('click', event => {
  const editButton = event.target.closest('button[data-edit-id]');
  const deleteButton = event.target.closest('button[data-delete-id]');

  if (editButton) {
    const product = products.find(item => item.id === editButton.dataset.editId);
    if (!product) return;

    selectedImageFile = null;
    byId('adminImageFile').value = '';
    byId('adminId').value = product.id;
    byId('adminName').value = product.name;
    byId('adminCategory').value = product.category;
    byId('adminOccasion').value = product.occasion.join(', ');
    byId('adminColors').value = product.colors.join(', ');
    byId('adminPrice').value = String(product.price);
    byId('adminFeatured').checked = product.featured;
    byId('adminImage').value = product.image;
    byId('adminDescription').value = product.description;
    updatePreview(product.image);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteId;
    const product = products.find(item => item.id === id);
    if (product && window.confirm(`¿Eliminar "${product.name}"?`)) {
      products = products.filter(item => item.id !== id);
      saveLocal('Producto eliminado localmente. La imagen no se eliminó de la carpeta.');
    }
  }
});

byId('resetAdmin').addEventListener('click', () => {
  byId('adminForm').reset();
  byId('adminId').value = '';
  byId('adminImage').value = 'images/arreglo-1.jpg';
  selectedImageFile = null;
  updatePreview('images/arreglo-1.jpg');
  setStatus('Formulario listo para un producto nuevo.');
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId('exportProducts').addEventListener('click', () => {
  downloadBlob(
    new Blob([JSON.stringify(products, null, 2)], { type: 'application/json;charset=utf-8' }),
    'products.json'
  );
  setStatus('Archivo products.json exportado.');
});

byId('importProducts').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (file.size > MAX_IMPORT_BYTES) {
    setStatus('El archivo supera el límite de 5 MB.', true);
    return;
  }

  try {
    products = validateCatalog(JSON.parse(await file.text()));
    saveLocal(`Catálogo JSON importado: ${products.length} productos.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'El archivo JSON no es válido.', true);
  }
});

function valueByHeader(row, headerMap, names) {
  for (const name of names) {
    const index = headerMap.get(name);
    if (index !== undefined) return row[index] ?? '';
  }
  return '';
}

async function createFeedbackDownload(rows) {
  if (feedbackObjectUrl) URL.revokeObjectURL(feedbackObjectUrl);
  const blob = await XLSXCatalog.write(rows, 'Retroalimentacion');
  feedbackObjectUrl = URL.createObjectURL(blob);

  const link = byId('downloadFeedbackExcel');
  link.href = feedbackObjectUrl;
  link.hidden = false;
}

byId('importCatalogExcel').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (file.size > MAX_IMPORT_BYTES) {
    setStatus('El archivo Excel supera el límite de 5 MB.', true);
    return;
  }

  const feedback = byId('excelFeedback');
  feedback.textContent = 'Validando catálogo e imágenes…';

  try {
    const rows = await XLSXCatalog.read(await file.arrayBuffer());
    if (rows.length < 2) throw new Error('El archivo no contiene productos.');

    const headers = rows[0].map(normalizeHeader);
    const headerMap = new Map(headers.map((header, index) => [header, index]));

    const required = ['nombre', 'categoria', 'precio', 'imagen'];
    const missingHeaders = required.filter(header => !headerMap.has(header));
    if (missingHeaders.length) {
      throw new Error(`Faltan columnas obligatorias: ${missingHeaders.join(', ')}.`);
    }

    const feedbackHeaders = [
      'id', 'nombre', 'categoria', 'ocasiones', 'colores', 'precio',
      'destacado', 'imagen', 'descripcion', 'estado_imagen', 'retroalimentacion'
    ];
    const feedbackRows = [feedbackHeaders];
    const validProducts = [];
    let missingImages = 0;
    let invalidRows = 0;

    for (let index = 1; index < rows.length; index++) {
      const row = rows[index];
      if (!row || row.every(value => cleanText(value, 500) === '')) continue;

      const imageRaw = cleanText(valueByHeader(row, headerMap, ['imagen']), 120);
      const filename = imageRaw.replace(/^images\//i, '');
      const imageValid = SAFE_IMAGE_NAME.test(filename) && await imageExists(filename);

      const raw = {
        id: cleanText(valueByHeader(row, headerMap, ['id']), 70),
        name: valueByHeader(row, headerMap, ['nombre']),
        category: valueByHeader(row, headerMap, ['categoria']),
        occasion: splitList(valueByHeader(row, headerMap, ['ocasiones', 'ocasion'])),
        colors: splitList(valueByHeader(row, headerMap, ['colores', 'color'])),
        price: Number(valueByHeader(row, headerMap, ['precio'])),
        featured: /^(si|sí|true|1|x)$/i.test(cleanText(valueByHeader(row, headerMap, ['destacado']), 10)),
        image: `images/${filename}`,
        description: valueByHeader(row, headerMap, ['descripcion'])
      };

      const product = validateProduct(raw);
      const messages = [];

      if (!product) {
        invalidRows++;
        messages.push('Datos del producto inválidos.');
      }

      if (!imageValid) {
        missingImages++;
        messages.push(imagesDirectoryHandle
          ? `No se encontró ${filename} en la carpeta images seleccionada.`
          : `No se encontró ${filename} en el sitio publicado. Selecciona la carpeta local para validarla directamente.`);
      }

      if (product && imageValid) validProducts.push(product);

      feedbackRows.push([
        raw.id || createSlug(raw.name),
        cleanText(raw.name, 80),
        cleanText(raw.category, 30),
        raw.occasion.join(', '),
        raw.colors.join(', '),
        Number.isFinite(raw.price) ? raw.price : '',
        raw.featured ? 'SI' : 'NO',
        filename,
        cleanText(raw.description, 320),
        imageValid ? 'ENCONTRADA' : 'NO ENCONTRADA',
        messages.length ? messages.join(' ') : 'Fila válida e imagen localizada.'
      ]);
    }

    await createFeedbackDownload(feedbackRows);

    if (validProducts.length) {
      products = validateCatalog(validProducts);
      saveLocal(`Excel procesado: ${validProducts.length} productos válidos importados.`);
    }

    feedback.textContent =
      `Resultado: ${validProducts.length} productos importados, ` +
      `${missingImages} imágenes no encontradas y ${invalidRows} filas inválidas. ` +
      'Descarga el Excel con retroalimentación para revisar el detalle.';
  } catch (error) {
    feedback.textContent = '';
    setStatus(error instanceof Error ? error.message : 'No fue posible procesar el archivo Excel.', true);
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

window.addEventListener('beforeunload', () => {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  if (feedbackObjectUrl) URL.revokeObjectURL(feedbackObjectUrl);
});

loadProducts().catch(error => {
  setStatus(error instanceof Error ? error.message : 'No fue posible abrir el administrador.', true);
});
