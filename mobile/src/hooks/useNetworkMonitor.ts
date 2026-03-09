import { useEffect, useRef } from "react";
import * as Network from "expo-network";
import { useStore } from "../store";

export function useNetworkMonitor() {
  const setOffline = useStore(s => s.setOffline);
  const flushQueuedBeacon = useStore(s => s.flushQueuedBeacon);
  const beaconQueued = useStore(s => s.beaconQueued);
  const wasOffline = useRef(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      const offline = !state.isConnected || !state.isInternetReachable;
      setOffline(offline);

      // Came back online — flush any queued beacon
      if (wasOffline.current && !offline && beaconQueued) {
        flushQueuedBeacon();
      }

      wasOffline.current = offline;
    };

    check();
    interval = setInterval(check, 8000); // check every 8s

    return () => clearInterval(interval);
  }, [beaconQueued]);
}
