# ZAFLORÉ Premium Plus

Esta versión amplía el sitio premium para GitHub Pages.

## Funciones incluidas
- Menú con sección de Políticas.
- Catálogo dinámico cargado desde `products.json`.
- Filtros por ocasión, categoría y presupuesto.
- Cotizador guiado conectado a WhatsApp.
- Asistente de recomendación basado en reglas.
- Panel local de administración en `admin.html`.
- Exportación e importación del catálogo.
- Galería enlazada a Instagram.
- Diseño responsivo y animaciones.
- SEO básico y metadatos.

## Importante sobre GitHub Pages
GitHub Pages sirve sitios estáticos. Por ello:

1. El panel `admin.html` guarda temporalmente en el navegador.
2. Para publicar cambios, exporta `products.json` y reemplázalo en GitHub.
3. Una administración con usuarios, base de datos y cambios automáticos requiere un backend como Firebase, Supabase o un CMS.
4. La actualización automática desde Instagram requiere una cuenta profesional, una aplicación de Meta y tokens de la API oficial.
5. El asistente incluido recomienda mediante reglas. Una IA generativa real requiere una API externa y no debe exponer claves dentro del código público.

## Archivos nuevos
- `politicas.html`
- `admin.html`
- `admin.js`
- `products.json`

## Fotografías
Mantén en `images/`:
- portada.jpg
- arreglo-1.jpg
- arreglo-2.jpg
- arreglo-3.jpg
- arreglo-4.jpg
- personalizado.jpg
- nosotros.jpg

## Publicación
Sube todos los archivos a la raíz del repositorio. En Settings > Pages selecciona `main` y `/root`.

## Revisión legal
El contenido de `politicas.html` es una plantilla inicial y debe revisarse para ajustarse a la operación real de ZAFLORÉ.

## Cambios de la versión segura

- Se agregó `images/logo.jpg` al encabezado y al pie de página.
- Ambos logotipos regresan al inicio al seleccionarlos.
- Las tarjetas de Cumpleaños, Amor, Graduaciones y Eventos tienen imágenes de fondo desvanecidas.
- Se agregaron accesos a Instagram, Facebook, TikTok y correo.
- Se normalizaron imágenes PNG/JPG para evitar fotografías faltantes.
- Se reforzó la validación del catálogo y el módulo administrador.
- Consulta `SEGURIDAD.md` para conocer las medidas y limitaciones de GitHub Pages.

### Acceso al administrador

El enlace se retiró de la página pública. Se abre manualmente con:

`https://TUUSUARIO.github.io/TUREPOSITORIO/admin.html`


## Actualización visual

- Logotipo más grande en encabezado y pie de página.
- Barra vertical flotante con WhatsApp, Instagram, Facebook, TikTok y correo.
- WhatsApp aparece primero y con mayor tamaño.


## Actualización de logotipo

- Encabezado actualizado con el logo horizontal.
- Portada principal actualizada con el logo horizontal.
- Pantalla de transición/carga actualizada con `logoza`.
- Archivos nuevos:
  - `images/logowebprincipal_banner.png`
  - `images/logoza.png`


## Ajustes solicitados posteriores

- Se eliminó el logo centrado de la portada.
- Se quitaron los marcos/bordes de los logos.
- `logoza` ahora aparece mucho más grande en la transición/carga.
- Se aumentó la visibilidad de las imágenes de fondo en:
  - Cumpleaños
  - Amor
  - Graduaciones
  - Eventos


## Actualización: logoweb-banner

- Se creó una nueva versión del logotipo horizontal: `images/logoweb-banner.png`
- Sus bordes ahora se difuminan y se pierden con el fondo para integrarse mejor con la estética negra/dorada.
- Se actualizaron los encabezados y las referencias del sitio para usar `logoweb-banner.png`.
- `logoza.png` se conserva como logotipo de transición/carga.


## Sección de referencias y recomendaciones

Se agregó una nueva opción **Referencias** al menú principal.

### Referencias de Facebook

La página incluye tres tarjetas enlazadas a publicaciones públicas de ZAFLORÉ:

- Graduaciones y bouquets personalizados.
- Diseños con color y significado.
- Arreglos para celebraciones familiares.

Estas tarjetas son referencias de contenido publicado por la marca y no se muestran como reseñas de clientes.

### Recomendaciones de visitantes

El formulario permite ingresar:

- Nombre o iniciales.
- Calificación de 1 a 5 estrellas.
- Tipo de experiencia.
- Comentario o retroalimentación.
- Autorización para revisión y contacto.

Al enviar:

1. Se genera un mensaje para WhatsApp.
2. El borrador queda guardado solamente en el navegador del visitante.
3. Aparece como **Pendiente de aprobación**.
4. ZAFLORÉ debe revisar el comentario antes de publicarlo como recomendación oficial.

### Limitación de GitHub Pages

GitHub Pages no tiene una base de datos. Los comentarios no se publican automáticamente para todos los visitantes.

Para publicar recomendaciones aprobadas de manera automática se requiere integrar un servicio externo como Firebase, Supabase o un CMS.


## Corrección del catálogo vacío

Esta versión incluye una copia de respaldo del catálogo dentro de `script.js`.

El orden de carga ahora es:

1. Catálogo guardado por el administrador local, cuando sea válido.
2. Archivo `products.json`.
3. Catálogo de respaldo integrado, si el navegador bloquea `products.json`.

Esto permite visualizar productos incluso al abrir `index.html` directamente desde una carpeta. Para una prueba completa del administrador se sigue recomendando GitHub Pages o un servidor local.

También se agregaron versiones a `style.css` y `script.js` para reducir problemas de caché del navegador.


## Administrador mejorado: imágenes y Excel

### Adjuntar imagen

El formulario del administrador ahora permite:

1. Seleccionar la carpeta local del proyecto.
2. Adjuntar una imagen JPG, PNG o WEBP.
3. Ver una vista previa.
4. Guardar la imagen dentro de la subcarpeta `images` de la copia local seleccionada.
5. Registrar automáticamente la ruta `images/nombre-de-imagen.ext`.

Por seguridad, el navegador siempre solicita autorización para abrir y modificar una carpeta local.

### Limitación de GitHub Pages

GitHub Pages es un alojamiento estático y no permite que JavaScript modifique directamente los archivos del repositorio remoto.

El administrador escribe en la copia local autorizada. Después se deben subir a GitHub:

- la imagen nueva dentro de `images`;
- el archivo `products.json` exportado.

### Plantilla Excel

La página `admin.html` incluye un enlace directo a:

`plantilla_catalogo_zaflore.xlsx`

La plantilla contiene las columnas:

- id
- nombre
- categoria
- ocasiones
- colores
- precio
- destacado
- imagen
- descripcion
- estado_imagen
- retroalimentacion

En la columna `imagen` debe escribirse solamente el nombre del archivo, por ejemplo:

`arreglo-5.jpg`

### Validación del Excel

Al cargar el Excel:

- se revisan los datos de cada producto;
- se valida que el nombre de la imagen sea seguro;
- se busca la imagen dentro de la carpeta `images` seleccionada;
- si no se seleccionó carpeta, se intenta validar contra la versión publicada;
- solo se importan filas válidas con imagen localizada;
- se genera un enlace temporal para descargar un Excel con:
  - estado de la imagen;
  - errores encontrados;
  - retroalimentación por fila.

### Archivos agregados

- `plantilla_catalogo_zaflore.xlsx`
- `jszip.min.js`
- `xlsx-catalog.js`

`jszip.min.js` se incluye localmente para evitar dependencias externas durante la lectura y creación de archivos Excel.
