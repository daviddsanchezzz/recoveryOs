# RecoveryOS

Monorepo inicial para una aplicacion personal centrada en salud, recuperacion deportiva, nutricion y seguimiento de habitos.

## Estructura

- `apps/api`: backend NestJS con TypeScript, Prisma y arquitectura hexagonal por modulo.
- `apps/web`: frontend Next.js App Router con TypeScript, Tailwind y una UI inicial centrada en dashboard y chat.

## Modulos MVP

- `auth`
- `weight`
- `injury`
- `nutrition`
- `ai-chat`
- `dashboard`
- `weekly-summary`

## Notas

- El backend usa implementaciones en memoria como base de desarrollo para respetar puertos y casos de uso desde el primer commit.
- `Better Auth` y `OpenAI` quedan encapsulados en adapters de infraestructura para poder sustituir mocks por integraciones reales sin tocar dominio ni aplicacion.
- Prisma incluye el modelo de datos del producto; las tablas exactas de `Better Auth` deben alinearse con la version instalada cuando se conecte la libreria real.

## Deploy

- Mantener un solo repositorio Git para `apps/web` y `apps/api`.
- Desplegar `apps/web` en Vercel configurando `Root Directory = apps/web`.
- Desplegar `apps/api` en Railway configurando `Root Directory = apps/api`.
- Railway usa `apps/api/railway.toml` para build, start y healthcheck.
- Variables minimas:
  - Web: `NEXT_PUBLIC_API_URL`
  - API: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`

Guia breve en `docs/deployment.md`.
