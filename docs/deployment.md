# Deployment

## Objetivo

Mantener `RecoveryOS` como un monorepo y desplegar:

- `apps/web` en Vercel
- `apps/api` en Railway

## Estructura recomendada

- Un solo repositorio GitHub
- Dos proyectos conectados al mismo repositorio
- Cada plataforma apuntando a su subdirectorio

## Vercel

Crear un proyecto nuevo desde el repo y configurar:

- Root Directory: `apps/web`
- Framework: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`

### Variables de entorno

- `NEXT_PUBLIC_API_URL=https://TU_API_PUBLICA.up.railway.app`

## Railway

Crear un servicio nuevo desde el mismo repo y configurar:

- Root Directory: `apps/api`
- Config as Code: `/apps/api/railway.toml`

La API ya soporta:

- `PORT` dinámico
- `start` de producción
- healthcheck en `/api/health`

### Variables de entorno

- `DATABASE_URL=...`
- `DIRECT_URL=...`
- `BETTER_AUTH_SECRET=...`
- `BETTER_AUTH_URL=https://TU_API_PUBLICA.up.railway.app`
- `FRONTEND_URL=https://TU_WEB_PUBLICA.vercel.app`
- `OPENAI_API_KEY=...` cuando actives IA real

## Better Auth en producción

Debes alinear dominios:

- `BETTER_AUTH_URL` debe ser la URL pública del backend
- `FRONTEND_URL` debe ser la URL pública del frontend
- `NEXT_PUBLIC_API_URL` debe apuntar al backend público

## Orden recomendado

1. Subir repo a GitHub
2. Crear proyecto de API en Railway
3. Configurar variables de entorno API
4. Verificar `https://api.../api/health`
5. Crear proyecto web en Vercel
6. Configurar `NEXT_PUBLIC_API_URL`
7. Probar registro, login, sesión y logout

## Notas

- Ahora mismo `apps/api` y `apps/web` son desplegables de forma aislada aunque vivan en el mismo repo.
- Si en el futuro extraes paquetes compartidos, habrá que revisar la estrategia de build del monorepo.
