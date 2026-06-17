# RecoveryOS Architecture

## Objetivo

Construir una aplicacion personal donde el chat sea la interfaz principal y la captura manual sea minima.

## Monorepo

- `apps/api`: API NestJS con modulos hexagonales.
- `apps/web`: cliente Next.js App Router.

## Reglas

- `domain`: entidades, value objects, interfaces de repositorio y puertos.
- `application`: casos de uso y DTOs de entrada.
- `infrastructure`: adapters concretos, Prisma, Better Auth, OpenAI, integraciones externas.
- `presentation`: controllers HTTP en backend y componentes/paginas en frontend.

## Decision importante

El chat no escribe directamente en la base de datos. Primero pasa por un parser de intencion y despues delega en casos de uso del modulo correspondiente.

## Evolucion prevista

1. Sustituir repositorios en memoria por Prisma repositories.
2. Sustituir `MockAiIntentParser` por adapter OpenAI con structured outputs.
3. Conectar Better Auth real en `auth/infrastructure`.
4. Añadir modulo `training` para actividades manuales y sincronizadas con Strava/Coros.

