# Seguridad de la versión ZAFLORÉ

## Medidas incorporadas

- Política de Seguridad de Contenido (CSP) mediante etiqueta meta.
- Restricción de scripts, estilos, imágenes y conexiones a orígenes esperados.
- Política de referencia estricta.
- Desactivación declarativa de cámara, micrófono, geolocalización, pagos y USB.
- Enlaces externos con `noopener noreferrer`.
- Validación de datos del catálogo antes de mostrarlos.
- Construcción del catálogo con `textContent` y nodos DOM, sin insertar datos administrables mediante `innerHTML`.
- Validación y límite de 1 MB para archivos JSON importados.
- Restricción de rutas de imágenes a la carpeta `images/`.
- Límites de longitud en formularios.
- El administrador incluye `noindex` y ya no está enlazado desde la página pública.

## Limitación importante

GitHub Pages es alojamiento estático y no permite configurar todos los encabezados HTTP de seguridad desde el repositorio. La CSP incluida ayuda, pero no sustituye encabezados configurados en el servidor.

Para un endurecimiento superior se recomienda publicar detrás de Cloudflare Pages, Netlify o un servicio que permita configurar:

- `Content-Security-Policy` como encabezado HTTP.
- `Strict-Transport-Security`.
- `X-Content-Type-Options: nosniff`.
- `Cross-Origin-Opener-Policy`.
- `Cross-Origin-Resource-Policy`.
- Protección real del módulo administrador mediante autenticación y backend.

El archivo `admin.html` continúa siendo públicamente accesible si alguien conoce su dirección. No se debe guardar información sensible en ese módulo.


## Acceso a carpetas locales

La función de escritura de imágenes utiliza la File System Access API del navegador.

- Requiere una acción explícita del usuario.
- El navegador muestra un selector y solicita permisos.
- El sitio no puede explorar otras carpetas sin autorización.
- Los permisos pueden revocarse cerrando la pestaña o desde la configuración del navegador.
- No se escriben archivos directamente en GitHub; únicamente en la carpeta local seleccionada.

## Archivos Excel

- Tamaño máximo: 5 MB.
- Solo se procesa la primera hoja.
- Los valores se tratan como datos, no como código.
- Las rutas de imagen se restringen a nombres JPG, JPEG, PNG o WEBP.
- Las filas inválidas no se incorporan al catálogo.
