import { Stack } from "expo-router";
import { LanguageProvider } from "../context/LanguageContext";
import { QueryProvider } from "../services/QueryProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </LanguageProvider>
    </QueryProvider>
  );
}
