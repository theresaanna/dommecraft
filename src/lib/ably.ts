import Ably from "ably";

let ablyRest: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest {
  if (!ablyRest) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY environment variable is not set");
    }
    ablyRest = new Ably.Rest({ key: apiKey });
  }
  return ablyRest;
}

export function createTokenRequest(clientId: string): Promise<Ably.TokenRequest> {
  const rest = getAblyRest();
  return rest.auth.createTokenRequest({ clientId });
}
