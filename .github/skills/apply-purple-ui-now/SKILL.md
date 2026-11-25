---
name: apply-purple-ui-now
description: EJECUTA y edita directamente el código de las pantallas y estilos existentes del proyecto para aplicar el diseño Soft Purple UI (gradientes morados, tarjetas blancas redondeadas, sombras suaves e iconos pastel). Úsala siempre que el usuario pida cambiar o aplicar el diseño visual.
---

# Acción Directa: Aplicar Diseño Soft Purple UI en los Archivos del Proyecto

**INSTRUCCIÓN CRÍTICA DE EJECUCIÓN:** NO te limites a explicar ni a dar un plan en el chat. **EDITA Y GUARDA directamente los archivos del proyecto** usando tus herramientas de edición de código hasta que todas las pantallas tengan el nuevo diseño aplicado.

## Paso 1: Localizar Archivos de UI (Máximo 1 lectura rápida)
1. Busca los archivos de pantallas y estilos en `app/`, `src/app/`, `src/screens/`, `src/components/`, `constants/` o `theme/`.
2. Revisa `package.json` para ver si existe `expo-linear-gradient` (si es Expo/React Native).
   - Si **existe** `expo-linear-gradient`, impórtalo (`import { LinearGradient } from 'expo-linear-gradient';`) para los banners, headers y botones.
   - Si **NO existe**, usa colores sólidos vibrantes (`#7546F6`) con vistas internas translúcidas (`rgba(255,255,255,0.15)`) para simular el degradado sin que falle la compilación por falta de paquetes.

## Paso 2: Reemplazar Paleta y Estilos Globales
Si existe un archivo de tema/colores (`theme.ts`, `colors.ts`, `globals.css`), actualiza sus valores. Además, aplica estos estilos directamente en cada archivo de pantalla que edites:

- **Fondo de pantalla (`container`):** `backgroundColor: '#F6F5FB'`
- **Tarjetas (`card`):**
  ```ts
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  padding: 18,
  shadowColor: '#6D28D9',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,