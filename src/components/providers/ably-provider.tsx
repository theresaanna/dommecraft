"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import Ably from "ably";

type AblyContextValue = {
  client: Ably.Realtime | null;
  isConnected: boolean;
};

const AblyContext = createContext<AblyContextValue>({
  client: null,
  isConnected: false,
});

export function useAbly() {
  return useContext(AblyContext);
}

async function fetchTokenRequest(): Promise<Ably.TokenRequest> {
  const res = await fetch("/api/ably/token");
  if (!res.ok) {
    throw new Error("Failed to fetch Ably token");
  }
  return res.json();
}

export function AblyProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const ablyClient = new Ably.Realtime({
      authCallback: async (_params, callback) => {
        try {
          const tokenRequest = await fetchTokenRequest();
          callback(null, tokenRequest);
        } catch (err) {
          callback(err as Ably.ErrorInfo, null);
        }
      },
      clientId: session.user.id,
    });

    // Expose client immediately so consumers can subscribe
    // (Ably queues subscriptions until connection is established)
    setClient(ablyClient);

    ablyClient.connection.on("connected", () => setIsConnected(true));
    ablyClient.connection.on("disconnected", () => setIsConnected(false));
    ablyClient.connection.on("closed", () => setIsConnected(false));
    ablyClient.connection.on("failed", () => setIsConnected(false));

    return () => {
      ablyClient.close();
      setClient(null);
      setIsConnected(false);
    };
  }, [session?.user?.id]);

  return (
    <AblyContext.Provider value={{ client, isConnected }}>
      {children}
    </AblyContext.Provider>
  );
}
