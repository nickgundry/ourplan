import { useState } from "react";
import SettingsScreen from "../src/screens/SettingsScreen";
import AccountScreen from "../src/screens/AccountScreen";

export default function SettingsRoute() {
  const [showAccount, setShowAccount] = useState(false);

  if (showAccount) return <AccountScreen onBack={() => setShowAccount(false)} />;
  return <SettingsScreen onOpenAccount={() => setShowAccount(true)} />;
}
