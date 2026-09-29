import { Karla_400Regular, Karla_500Medium, Karla_600SemiBold, Karla_700Bold } from "@expo-google-fonts/karla";
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_500Medium_Italic,
  Newsreader_600SemiBold,
  Newsreader_700Bold,
} from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import { initializeSession, useSession } from "../src/session";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useTheme, useThemeMode } from "../src/theme";

export default function RootLayout() {
  const session = useSession();
  useEffect(() => { void initializeSession(); }, []);
  const [loaded] = useFonts({
    Karla_400Regular,
    Karla_500Medium,
    Karla_600SemiBold,
    Karla_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
  });
  const theme = useTheme();
  const mode = useThemeMode();
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loaded && (session.ready || session.error)) {
      const el = document.getElementById("splash");
      if (el) { el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }
    }
  }, [loaded, session.ready, session.error]);

  if (!loaded) return null;
  if (!session.ready) return (
    <SafeAreaProvider><View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: theme.bg }}>
      {session.error ? <><Text style={{ color: theme.ink }}>{session.error}</Text><Button title="Try again" onPress={() => { void initializeSession(); }} /></> : <ActivityIndicator color={theme.accent} />}
    </View></SafeAreaProvider>
  );

  return (
    <SafeAreaProvider>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack
        key={session.version}
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)/sign-in" />
        <Stack.Screen name="onboarding/welcome" />
        <Stack.Screen name="onboarding/location" />
        <Stack.Screen name="care" />
        <Stack.Protected guard={session.signedIn || session.demo}>
          <Stack.Screen name="index" />
          <Stack.Screen name="journal" />
          <Stack.Screen name="record" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="qr" />
          <Stack.Screen name="dev/theme-check" />
          <Stack.Screen name="story/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="profile"
            options={{
              presentation: "transparentModal",
              animation: "none",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
