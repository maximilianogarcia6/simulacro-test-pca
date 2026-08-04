# Hoja de ruta de migración

## Objetivo

Mover esta POC estática hacia una app más mantenible, con preguntas servidas por backend y una interfaz más robusta.

## Fase 1: estabilizar la POC

- Mantener la app actual funcionando como base de validación.
- Separar responsabilidades en archivos:
  - `index.html` para la estructura
  - `styles.css` para el diseño
  - `app.js` para la lógica
- Mantener `quiz-data.json` como fuente de preguntas mientras la app siga siendo estática.

## Fase 2: preparar la API

- Definir un contrato de datos para preguntas:
  - `id`
  - `section`
  - `question`
  - `options`
  - `answer`
  - `explanation`
- Crear un backend mínimo con una API REST que exponga preguntas.
- Hacer que el frontend consuma esa API en lugar de leer el JSON directamente.

## Fase 3: migrar a React o Vite

- Crear una app frontend con `React` + `Vite`.
- Separar UI en componentes:
  - `Home`
  - `Quiz`
  - `Results`
  - `SessionSettings`
- Mover la lógica de estado a hooks o store local.

## Fase 4: backend y persistencia real

- Guardar progreso por usuario en una base de datos o servicio backend.
- Definir autenticación o identificador de usuario.
- Centralizar la lógica de scoring y repaso.

## Fase 5: mejora de interfaz

- Usar componentes reutilizables.
- Mejorar navegación, filtros, feedback visual, y diseño responsive.
- Revisar si conviene `React` puro o `Next.js` según la necesidad de routing y SSR.

## Recomendación de arquitectura

### Ahora
- HTML/CSS/JS estático
- ideal para prototipar y validar UX

### Futuro
- `React + Vite` como frontend principal
- `Node.js` o `FastAPI`/`Python` como backend
- `Next.js` solo si necesitás routing más complejo o renderizado del lado del servidor

## Respuesta corta

Sí, separar HTML, CSS y JS te facilita muchísimo la migración a un framework, porque te deja una base limpia y modular en lugar de una app acoplada en un solo archivo.
