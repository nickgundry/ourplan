import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "../src/store";
import { useNetworkMonitor } from "../src/hooks/useNetworkMonitor";
import OnboardingScreen from "../src/screens/onboarding/OnboardingScreen";
import AccountScreen from "../src/screens/AccountScreen";
import { colors } from "../src/theme";

function TabLayout() {
  useNetworkMonitor();
  const [showAccount, setShowAccount] = useState(false);

  if (showAccount) {
    return <AccountScreen onBack={() => setShowAccount(false)} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.inkLight,
        tabBarStyle: {
          backgroundColor: colors.canvas,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 82 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: "Plan",     tabBarIcon: () => null }} />
      <Tabs.Screen name="contacts"  options={{ title: "Contacts", tabBarIcon: () => null }} />
      <Tabs.Screen name="alert"     options={{ title: "Alert",    tabBarIcon: () => null, tabBarActiveTintColor: colors.slate }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: () => null,
        }}
        listeners={{ tabPress: () => {} }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  const { isAuthenticated, hasSeenOnboarding, setOnboardingComplete, loadFromStorage } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadFromStorage().then(() => setReady(true));
  }, []);

  if (!ready) return null; // Splash still showing

  return (
    <SafeAreaProvider>
      {!isAuthenticated || !hasSeenOnboarding
        ? <OnboardingScreen onComplete={() => setOnboardingComplete()} />
        : <TabLayout />
      }
    </SafeAreaProvider>
  );
}
