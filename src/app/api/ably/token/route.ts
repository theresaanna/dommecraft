import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTokenRequest } from "@/lib/ably";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tokenRequest = await createTokenRequest(session.user.id);
    return NextResponse.json(tokenRequest);
  } catch {
    return NextResponse.json(
      { error: "Failed to create token request" },
      { status: 500 }
    );
  }
}
