import { useState } from "react";
import * as Location from "expo-location";
import { useStore } from "../store";

export function useLocation() {
  const [loading, setLoading] = useState(false);
  const prefs = useStore(s => s.prefs);

  const getLocation = async (): Promise<{ lat: number; lng: number; accuracy?: number } | null> => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: prefs.reduceLocation
          ? Location.Accuracy.Balanced     // neighbourhood-level
          : Location.Accuracy.High,
      });

      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      };
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getLocation, loading };
}
