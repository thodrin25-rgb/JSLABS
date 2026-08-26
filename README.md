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

## SEO y despliegue

Antes de publicar, define `SITE_URL` con el dominio final (hay una plantilla en `.env.example`).
Astro genera rutas estáticas, `sitemap-index.xml`, `robots.txt`, etiquetas canonical y metadatos
Open Graph/Twitter para cada página. El resultado compilado queda en `dist/` y puede publicarse
en GitHub Pages o cualquier hosting estático.
