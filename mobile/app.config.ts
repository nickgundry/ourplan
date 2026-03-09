import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Prepared",
  slug: "prepared",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FAF8F5",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.prepared.app",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Prepared uses your location when you send an alert so your contacts know where you are.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Prepared can access your location in the background to send an alert if signal is lost.",
      UIBackgroundModes: ["fetch", "location"],
    },
    entitlements: {
      "com.apple.developer.networking.networkextension": ["content-filter-provider"],
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Prepared uses your location when sending an alert.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#4A7C59",
      },
    ],
  ],
  extra: {
    apiBase: process.env.API_BASE_URL || "https://your-app.vercel.app",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    eas: {
      projectId: "your-eas-project-id",
    },
  },
  scheme: "prepared",
});
