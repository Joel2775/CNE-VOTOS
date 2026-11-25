---
name: 01-ui-theme
description: >
  Sistema de diseño "Filoo" para apps móviles (React Native / Expo): estética morada con degradados
  rosa y naranja, tarjetas blancas muy redondeadas, sombras suaves, iconos 3D tipo glass y
  animaciones Lottie. Incluye tokens de diseño, componentes base, pantalla de onboarding, login
  con estados (válido / fallido), carga de datos (loading / vacío / error) y envío de formularios
  (éxito / fallo) con animaciones. Úsala SIEMPRE que el usuario pida diseñar, estilizar,
  "embellecer" o animar pantallas de una app móvil, mencione Lottie, login animado, pantallas de
  carga, feedback de éxito/error, "diseño morado", "estilo Filoo" o quiera replicar el diseño de
  una captura de referencia, aunque no diga explícitamente "skill" ni "design system".
---

# Filoo UI Design — Skill

Replica el estilo visual de la app de referencia **Filoo** (gestor de archivos): fondo lavanda,
cabeceras con degradado morado, tarjetas blancas flotantes, botones rosa/naranja con degradado,
iconos cuadrados con degradado y animaciones fluidas con Lottie.

> **Stack por defecto:** React Native + Expo + TypeScript.
> Si el proyecto usa otro stack (Flutter, web), conserva los tokens y las reglas de la sección
> "Reglas de estilo" y adapta solo la implementación.

---

## 1. Antes de empezar

1. Revisa el proyecto: ¿Expo o React Native CLI? ¿TypeScript o JS? ¿Qué navegación usa
   (Expo Router / React Navigation)? Adáptate a lo que ya exista; no cambies la arquitectura.
2. Instala dependencias (si faltan):

```bash
npx expo install lottie-react-native expo-linear-gradient react-native-reanimated \
  react-native-svg expo-font @expo-google-fonts/plus-jakarta-sans expo-haptics
```

3. Crea esta estructura (ajusta rutas al proyecto):

```
src/
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   └── index.ts
├── components/ui/
│   ├── GradientHeader.tsx
│   ├── Card.tsx
│   ├── GradientButton.tsx
│   ├── AppInput.tsx
│   ├── IconTile.tsx
│   ├── ListItem.tsx
│   ├── ProgressBar.tsx
│   ├── SegmentedTabs.tsx
│   └── LottieState.tsx
├── hooks/
│   └── useAsyncAction.ts
└── screens/
    ├── Onboarding.tsx
    ├── Login.tsx
    ├── Home.tsx
    └── DetailList.tsx
assets/lottie/
├── loading.json          # carga de datos
├── login-success.json    # login válido
├── login-error.json      # login fallido
├── submit-success.json   # envío válido
├── submit-error.json     # envío fallido
├── empty.json            # sin datos
└── onboarding.json       # ilustración de bienvenida
```

4. **Animaciones Lottie:** no inventes archivos JSON. Descárgalos de LottieFiles
   (lottiefiles.com, licencia gratuita) buscando: `loading`, `success check`, `error cross`,
   `empty box`, `cloud upload`. Si aún no están, deja el componente funcionando con un
   `fallback` (ver `LottieState`) y avisa al usuario qué archivos debe colocar y dónde.

---

## 2. Tokens de diseño

### `theme/colors.ts`

```ts
export const colors = {
  // Fondos
  bg: "#F1ECFF", // lavanda de fondo
  surface: "#FFFFFF", // tarjetas
  surfaceSoft: "#F8F6FF", // items dentro de tarjetas

  // Morado (marca)
  primary: "#7C4DF0",
  primaryDark: "#6636E0",
  primaryLight: "#A582FF",

  // Acentos
  pink: "#FF6FD8",
  pinkSoft: "#FFA6EA",
  orange: "#FFA03C",
  orangeSoft: "#FFC27A",
  teal: "#3FE0C5",
  cyan: "#4FC3F7",

  // Texto
  text: "#23213A", // títulos
  textMuted: "#8C88A8", // subtítulos
  textOnPrimary: "#FFFFFF",

  // Estados
  success: "#2ED8A3",
  error: "#FF5C7A",
  warning: "#FFB020",
  border: "#ECE7FA",
} as const;

// Degradados (usar con expo-linear-gradient)
export const gradients = {
  header: ["#8B5CF6", "#6636E0"],
  hero: ["#8E5CFF", "#6A3BE8"],
  pink: ["#FF8AE2", "#FF5CCB"],
  orange: ["#FFB35C", "#FF8A3D"],
  teal: ["#5CF0D8", "#2FD3B5"],
  cyan: ["#7AD8FF", "#3FB5F0"],
  violet: ["#9B7BFF", "#6A3BE8"],
  progress: ["#FF6B8A", "#A06CFF", "#3FC8F0"], // barra de storage
  error: ["#FF8AA0", "#FF4D6D"],
  success: ["#5CF0C0", "#20C997"],
} as const;
```

### `theme/index.ts`

```ts
export const radius = { sm: 12, md: 16, lg: 24, xl: 32, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Sombra morada suave (la "firma" visual del diseño)
export const shadow = {
  card: {
    shadowColor: "#7C4DF0",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  button: {
    shadowColor: "#FF6FD8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  hero: {
    shadowColor: "#6636E0",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
};
```

### `theme/typography.ts`

Fuente: **Plus Jakarta Sans** (geométrica, redondeada, muy similar a la de la referencia).

```ts
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
};

export const type = {
  hero: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  section: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
};
```

Carga de fuentes en el layout raíz con `useFonts` de `@expo-google-fonts/plus-jakarta-sans`
y no renderices nada hasta que estén listas (usa `expo-splash-screen`).

---

## 3. Reglas de estilo (lo que hace que "se vea Filoo")

1. **Fondo de pantalla:** `colors.bg` (lavanda), nunca blanco puro ni negro.
2. **Cabecera:** bloque con degradado `gradients.header`, esquinas inferiores muy redondeadas
   (`radius.xl`), título blanco centrado y el contenido siguiente "montado" encima con margen
   negativo (efecto de tarjeta que sale del header).
3. **Tarjetas:** blancas, `radius.lg`, `shadow.card`, padding 16–20. Nunca bordes duros.
4. **Hero card** (promo/estado principal): degradado morado, texto blanco, botón naranja
   pequeño tipo píldora con ilustración 3D a la izquierda.
5. **Botón primario:** degradado rosa (`gradients.pink`), `radius.pill`, texto blanco, `shadow.button`.
   Botón secundario/promo: degradado naranja.
6. **Iconos:** cuadrados `56×56`, `radius.md`, con degradado propio (rosa, naranja, teal, violeta)
   y glifo blanco. Siempre con una sombra del mismo color al 25 % de opacidad.
7. **Listas:** cada fila es una tarjeta blanca `surfaceSoft`, icono a la izquierda, título en
   `semibold`, subtítulo `caption` en `textMuted`, chevron `›` a la derecha.
8. **Barra de progreso:** pista gris-lavanda de 6 px y relleno con `gradients.progress` + "knob"
   circular morado con borde blanco.
9. **Tabs segmentados:** contenedor blanco píldora; el activo con degradado rosa y texto blanco.
10. **Espaciado generoso:** mínimo 16 px entre bloques, 24 px de margen lateral en pantalla.
11. **Inputs:** fondo blanco, `radius.md`, borde `colors.border`; en foco, borde `primary` +
    sombra morada suave; en error, borde `error` + mensaje debajo con shake.
12. **Texto:** títulos `colors.text`, nunca negro puro (#000).
13. **Modo oscuro:** fuera de alcance salvo que el usuario lo pida.

---

## 4. Componentes base

### `LottieState.tsx` — un único componente para todos los estados animados

```tsx
import LottieView from "lottie-react-native";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { type } from "../../theme";

const sources = {
  loading: require("../../../assets/lottie/loading.json"),
  loginSuccess: require("../../../assets/lottie/login-success.json"),
  loginError: require("../../../assets/lottie/login-error.json"),
  submitSuccess: require("../../../assets/lottie/submit-success.json"),
  submitError: require("../../../assets/lottie/submit-error.json"),
  empty: require("../../../assets/lottie/empty.json"),
} as const;

type Props = {
  name: keyof typeof sources;
  size?: number;
  loop?: boolean;
  message?: string;
  onFinish?: () => void;
};

export function LottieState({
  name,
  size = 160,
  loop,
  message,
  onFinish,
}: Props) {
  // loading y empty hacen loop; success/error se reproducen una vez
  const shouldLoop = loop ?? (name === "loading" || name === "empty");
  return (
    <View style={styles.wrap}>
      <LottieView
        source={sources[name]}
        autoPlay
        loop={shouldLoop}
        onAnimationFinish={onFinish}
        style={{ width: size, height: size }}
      />
      {message ? <Text style={styles.msg}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  msg: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
});
```

> Si un JSON aún no existe, `require` fallará en compilación: crea un `{}` mínimo válido de
> Lottie o comenta esa clave, y dile al usuario qué archivo falta.

### `GradientButton.tsx` — con estado de carga, éxito y error

```tsx
import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { gradients } from "../../theme/colors";
import { radius, shadow } from "../../theme";
import { type } from "../../theme";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "pink" | "orange" | "violet";
};

export function GradientButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "pink",
}: Props) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[anim, shadow.button, { borderRadius: radius.pill }]}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => (scale.value = withSpring(0.96))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <LinearGradient
          colors={gradients[variant] as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, (disabled || loading) && { opacity: 0.7 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.text}>{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  text: { ...type.button, color: "#fff" },
});
```

### `AppInput.tsx` — con shake en error

```tsx
import { useEffect } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../theme/colors";
import { radius, shadow, type } from "../../theme";

type Props = TextInputProps & { error?: string };

export function AppInput({ error, ...props }: Props) {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  useEffect(() => {
    if (error) {
      x.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error]);

  return (
    <View style={{ marginBottom: 16 }}>
      <Animated.View
        style={[styles.box, error && { borderColor: colors.error }, style]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          {...props}
        />
      </Animated.View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    ...shadow.card,
    shadowOpacity: 0.06,
  },
  input: { ...type.body, height: 52, color: colors.text },
  err: { ...type.caption, color: colors.error, marginTop: 6, marginLeft: 6 },
});
```

### Resto de componentes (implementar con las reglas de la sección 3)

- **`GradientHeader`**: `LinearGradient` `gradients.header`, `borderBottomLeftRadius/RightRadius: radius.xl`,
  título blanco centrado, botón atrás a la izquierda y menú `⋮` a la derecha.
- **`Card`**: `View` blanca, `radius.lg`, `shadow.card`, `padding: 20`.
- **`IconTile`**: 56×56 con `LinearGradient` por variante (`pink | orange | teal | cyan | violet`).
- **`ListItem`**: `Card` compacta con `IconTile`, título, subtítulo y chevron.
- **`ProgressBar`**: pista + relleno animado (`withTiming`, 800 ms) con `gradients.progress`.
- **`SegmentedTabs`**: píldora blanca; el tab activo se anima (`withSpring`) como "thumb" rosa.

Todas las listas deben entrar con animación escalonada:
`entering={FadeInDown.delay(index * 80).springify()}` (Reanimated).

---

## 5. Pantallas y estados animados

### 5.1 Onboarding

Fondo `gradients.hero`, ilustración Lottie (`onboarding.json`) flotando arriba y tarjeta blanca
inferior con título (`hero`), descripción y botón circular rosa con flecha `→` que navega al login.
Los puntos del paginador se animan (el activo se ensancha a píldora).

### 5.2 Login — flujo completo con estados

Usa **una máquina de estados simple** y nunca mezcles booleanos sueltos:

```ts
type AuthStatus = "idle" | "loading" | "success" | "error";
```

**Validación de formulario (antes de llamar al backend):**

- Email: regex básica; mensaje "Ingresa un correo válido".
- Contraseña: mínimo 6 caracteres; mensaje "Mínimo 6 caracteres".
- Mostrar errores bajo cada input con shake. El botón queda deshabilitado mientras `loading`.

```tsx
const [status, setStatus] = useState<AuthStatus>("idle");
const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

async function onLogin() {
  const e = validate(email, password);
  setErrors(e);
  if (Object.keys(e).length) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }

  setStatus("loading");
  try {
    await api.login(email, password); // lanza error si credenciales inválidas
    setStatus("success"); // → Lottie login-success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // navegar cuando termine la animación (onFinish) ó tras ~1.4 s
  } catch (err) {
    setStatus("error"); // → Lottie login-error
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => setStatus("idle"), 2200); // permite reintentar
  }
}
```

**Qué se ve en cada estado:**

| Estado    | UI                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `idle`    | Formulario + botón rosa "Iniciar sesión"                                                                                                        |
| `loading` | Botón con spinner; formulario atenuado (`opacity .6`, sin interacción)                                                                          |
| `success` | Overlay blanco translúcido con `LottieState name="loginSuccess"` + texto "¡Bienvenido, {nombre}!"; al terminar → `router.replace('/home')`      |
| `error`   | Overlay/bottom-sheet con `LottieState name="loginError"` + "Credenciales incorrectas", inputs con borde rojo y shake; botón "Intentar de nuevo" |

El overlay aparece con `FadeIn` y el contenido con `ZoomIn.springify()`.

### 5.3 Carga de datos (listas / dashboard)

Hook reutilizable:

```ts
// hooks/useAsyncAction.ts
import { useCallback, useState } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export function useAsyncAction<T, A extends any[]>(
  fn: (...a: A) => Promise<T>,
) {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: A) => {
      setStatus("loading");
      setError(null);
      try {
        const r = await fn(...args);
        setData(r);
        setStatus("success");
        return r;
      } catch (e: any) {
        setError(e?.message ?? "Error inesperado");
        setStatus("error");
        throw e;
      }
    },
    [fn],
  );

  return { status, data, error, run, reset: () => setStatus("idle") };
}
```

Pantallas con datos deben manejar **cuatro** casos, siempre animados:

1. **Cargando:** `LottieState name="loading"` centrado **o** skeletons con shimmer
   (tarjetas lavanda que pulsan con `withRepeat`). Prefiere skeletons en listas, Lottie en pantalla completa.
2. **Con datos:** lista con entrada escalonada (`FadeInDown`), `ProgressBar` animada.
3. **Vacío:** `LottieState name="empty"` + "Aún no hay elementos" + botón primario para crear.
4. **Error:** `LottieState name="submitError"` + mensaje + botón "Reintentar" que llama a `run()`.

Añade `RefreshControl` con `tintColor={colors.primary}` en toda lista.

### 5.4 Envío de datos (crear / editar / subir)

Mismo patrón de estados que el login:

- **Validación previa** por campo (mensajes claros, shake en el campo inválido).
- **`loading`:** botón con spinner y, si es subida, `ProgressBar` con porcentaje real.
- **`success`:** `LottieState name="submitSuccess"` en un modal central (tarjeta blanca, `radius.xl`),
  texto "¡Guardado correctamente!", se cierra solo en ~1.6 s y refresca la lista.
  Opcional: confeti (otro Lottie) encima.
- **`error`:** `LottieState name="submitError"` + mensaje devuelto por el servidor
  (o "No se pudo enviar. Revisa tu conexión") + botón "Reintentar" que **conserva** lo que escribió el usuario.
- Nunca borres el formulario si falló. Solo límpialo en éxito.

---

## 6. Animaciones — guía rápida

| Dónde                      | Animación                          | Herramienta                  |
| -------------------------- | ---------------------------------- | ---------------------------- |
| Entrada de pantallas       | `FadeInDown` + `springify()`       | Reanimated layout animations |
| Items de lista             | Escalonada 80 ms por item          | Reanimated                   |
| Botones                    | Escala 0.96 al presionar + háptico | Reanimated + expo-haptics    |
| Inputs en error            | Shake horizontal                   | Reanimated                   |
| Éxito / error / carga      | Lottie                             | lottie-react-native          |
| Barra de progreso          | `withTiming` 800 ms                | Reanimated                   |
| Transiciones de navegación | `slide_from_right` / `fade`        | Router                       |

**Reglas:** duraciones entre 200–500 ms (Lottie puede durar 1–2 s); nunca bloquees al usuario más de
2.5 s con una animación de resultado; usa `useReducedMotion()` de Reanimated para desactivar
animaciones decorativas si el usuario lo pidió en accesibilidad.

---

## 7. Checklist de entrega

Antes de dar por terminada la tarea, verifica y reporta al usuario:

- [ ] Fuentes cargadas y tokens de color usados (cero hex sueltos en pantallas).
- [ ] Todas las pantallas con fondo `colors.bg`, header con degradado y tarjetas con sombra morada.
- [ ] Login: validación, loading, **éxito animado** y **fallo animado** probados.
- [ ] Listas: loading, datos, vacío y error implementados.
- [ ] Formularios: envío válido (éxito animado) y fallido (error animado, datos conservados).
- [ ] Archivos Lottie presentes en `assets/lottie/` (si faltan, listar cuáles y dónde descargarlos).
- [ ] Probado en Android e iOS (o al menos uno) sin warnings de Reanimated.
- [ ] Textos de usuario en **español** salvo que el proyecto use otro idioma.

## 8. Qué NO hacer

- No usar negro puro, grises fríos ni bordes de 1 px oscuros.
- No mezclar más de 3 colores de acento en una misma pantalla.
- No usar `Alert.alert` para errores: usa siempre el componente animado.
- No bloquear la UI con spinners nativos sin contexto; siempre acompaña con texto.
- No copiar assets protegidos de la captura (ilustraciones del diseño original): usa
  Lottie/ilustraciones con licencia libre o propias.
