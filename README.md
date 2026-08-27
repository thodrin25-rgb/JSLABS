# North/Shop — Landing Page

Landing page estática para North/Shop, agencia Shopify Plus.

## Desarrollo

El sitio usa Astro y Tailwind CSS compilado. Abre la carpeta en Cursor y ejecuta la tarea
`JSLABS: servidor local` desde `Terminal > Run Task`; Astro mostrará la URL local.

También puedes iniciarlo desde la terminal:

```powershell
pnpm dev
```

Genera una versión optimizada para producción y comprueba tipos con:

```powershell
pnpm build
```

El formateo se ejecuta automáticamente antes de cada commit. También puedes ejecutar:

```powershell
pnpm format
```

## Resend

El formulario de contacto envía la solicitud mediante `POST /api/contact`. Copia `.env.example` a `.env` y define:

- `RESEND_API_KEY`: API key creada en Resend.
- `RESEND_FROM_EMAIL`: remitente perteneciente a un dominio verificado en Resend.
- `RESEND_TO_EMAIL`: buzón donde North/Shop recibirá las solicitudes.

La API key se usa únicamente en el servidor. El endpoint valida los campos, limita solicitudes repetidas, incluye un
honeypot y usa una clave de idempotencia para evitar correos duplicados. Para probar el envío real, inicia el sitio con
las variables configuradas y envía el formulario desde la página.

## SEO y despliegue

Antes de publicar, define `SITE_URL` con el dominio final (hay una plantilla en `.env.example`).
Astro prerenderiza las páginas, `sitemap-index.xml`, `robots.txt`, etiquetas canonical y metadatos Open Graph/Twitter.
La ruta `/api/contact` se genera bajo demanda con el adaptador Node oficial, por lo que el despliegue debe ejecutar un
servidor Node compatible; GitHub Pages por sí solo no ejecuta el formulario. Después de `pnpm build`, inicia el servidor
de producción con:

```powershell
pnpm start
```

Configura `SITE_URL` y las tres variables de Resend tanto durante el despliegue como en el entorno de ejecución.
