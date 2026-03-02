"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const client = new Ably.Realtime({
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

    clientRef.current = client;

    client.connection.on("connected", () => setIsConnected(true));
    client.connection.on("disconnected", () => setIsConnected(false));
    client.connection.on("closed", () => setIsConnected(false));
    client.connection.on("failed", () => setIsConnected(false));

    return () => {
      client.close();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [session?.user?.id]);

  return (
    <AblyContext.Provider value={{ client: clientRef.current, isConnected }}>
      {children}
    </AblyContext.Provider>
  );
}
