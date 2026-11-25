import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Acceso" }} />
      <Stack.Screen name="primer-acceso" options={{ title: "Primer acceso" }} />
      <Stack.Screen
        name="recuperar-contrasena"
        options={{ title: "Recuperar contraseña" }}
      />
    </Stack>
  );
}
