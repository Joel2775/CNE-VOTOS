import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function VeedorLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Mis mesas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="capturar" options={{ href: null }} />
    </Tabs>
  );
}
