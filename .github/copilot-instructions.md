# Proyecto: Control Electoral (React Native + Expo + TypeScript)

App móvil para el escrutinio electoral de una organización política. Se entrega como APK de Android.

## Fuente de verdad
- Requisitos y supuestos: `docs/requisitos.md`.
- Decisiones técnicas: `docs/adr/ADR-01` a `ADR-09`.
- Antes de cada tarea, lee solo el ADR y los RF/RNF que le corresponden.

## Reglas obligatorias
1. NO cambies ninguna decisión de los ADR (stack, librerías, arquitectura). Si algo choca con un ADR o falta información, detente y pregúntame.
2. No agregues librerías que no estén en los ADR sin preguntarme.
3. Cada cambio debe indicar qué RF/RNF cumple.
4. Las llaves y secretos van en variables de entorno. Nunca las escribas en el código ni en archivos versionados.
5. En la app solo van valores públicos (`EXPO_PUBLIC_*`: URL y anon key de Supabase). La `service_role` y la contraseña SMTP nunca van en la app.
6. Trabaja un paso a la vez: primero dame el plan corto y espera mi OK antes de implementar.
7. Escribe código simple y comentado en lo importante, porque debo poder explicarlo en la defensa oral.

## Stack acordado (resumen)
Expo + TypeScript + Expo Router (ADR-09) · Supabase con RLS, Auth, Storage y Realtime (ADR-01) · Edge Function + Gmail SMTP para cuentas (ADR-02) · Expo SQLite con outbox y SecureStore (ADR-03) · expo-camera, expo-location, WebView con Leaflet/OSM (ADR-04) · Zustand + TanStack Query (ADR-05) · Uniwind + Lottie + Reanimated (ADR-06) · EAS Build + Sentry (ADR-07) · React Hook Form + Zod (ADR-08).

## Arquitectura (ADR-05): Clean Architecture por funcionalidad
- `domain`: entidades, esquemas Zod, casos de uso e interfaces de repositorio. NO importa nada de React Native, Expo ni Supabase.
- `data`: implementa las interfaces del dominio; es la única capa que habla con Supabase o SQLite.
- `presentation`: pantallas, componentes y hooks. Solo llama casos de uso.
- Los archivos de `app/` son delgados: solo importan y exportan una pantalla de `presentation`.
- Las reglas del acta viven en `domain/esquemas` y se repiten en SQL (`supabase/migrations`) como segunda barrera (RNF-03).

## Estructura
```
app/                 rutas: (auth) (provincial) (recinto) (veedor)
src/core/            di, supabase, storage, red, observabilidad, store
src/ui/              tema, componentes, animaciones
src/features/        cuentas, recintos, asignaciones, actas, evidencia,
                     sincronizacion, panel   (cada una: domain/data/presentation)
supabase/            migrations, seed.sql, functions/crear-cuenta
docs/                requisitos.md y adr/
```

## Mapa ADR -> carpeta
| ADR | Dónde |
| :--- | :--- |
| 01 | supabase/migrations, seed.sql, features/panel |
| 02 | supabase/functions/crear-cuenta, features/cuentas |
| 03 | core/storage, features/sincronizacion |
| 04 | features/evidencia |
| 05 | estructura completa y core/store |
| 06 | src/ui |
| 07 | core/observabilidad, eas.json |
| 08 | domain/esquemas de cada feature |
| 09 | app/ |

## Orden de trabajo
1. Esqueleto y navegación por rol (ADR-05, 09)
2. Esquema Supabase, RLS, historial y precarga (ADR-01)
3. Cuentas, correo y primer acceso (ADR-02)
4. Formulario del acta y validaciones (ADR-08)
5. Foto, GPS y mapa (ADR-04)
6. Registro sin conexión y cola de envío (ADR-03)
7. Paneles y tiempo real (ADR-01)
8. Interfaz con Uniwind, Lottie y Reanimated (ADR-06)
9. Sentry y APK (ADR-07)
