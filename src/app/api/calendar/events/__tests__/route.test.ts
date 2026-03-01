import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/calendar-utils", () => ({
  expandEvents: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));

import { GET, POST } from "@/app/api/calendar/events/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { expandEvents } from "@/lib/calendar-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;
const mockFindMany = vi.mocked(prisma.calendarEvent.findMany);
const mockCreate = vi.mocked(prisma.calendarEvent.create);
const mockExpandEvents = vi.mocked(expandEvents);

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/calendar/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when start param is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("start and end");
  });

  it("returns 400 when end param is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("start and end");
  });

  it("returns 400 for invalid date format", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=invalid&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid date");
  });

  it("returns expanded events for valid date range", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);
    mockExpandEvents.mockReturnValue([
      {
        id: "evt-1",
        title: "Meeting",
        description: null,
        start: "2024-06-10 10:00",
        end: "2024-06-10 11:00",
        calendarId: "standalone",
        isAllDay: false,
        sourceType: "STANDALONE",
        sourceTaskId: null,
        originalEventId: "evt-1",
      },
    ]);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Meeting");
    expect(mockFindMany).toHaveBeenCalled();
    expect(mockExpandEvents).toHaveBeenCalled();
  });

  it("returns empty array when no events exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockResolvedValue([]);
    mockExpandEvents.mockReturnValue([]);

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockFindMany.mockRejectedValue(new Error("DB error"));

    const res = await GET(
      new Request("http://localhost:3000/api/calendar/events?start=2024-06-01&end=2024-06-30")
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

describe("POST /api/calendar/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      createRequest({ title: "Event", startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ title: "Event", startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Title");
  });

  it("returns 400 when title is empty string", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(
      createRequest({ title: "  ", startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Title");
  });

  it("returns 400 when startAt is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    const res = await POST(createRequest({ title: "Event" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Start date");
  });

  it("creates event with all fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "evt-1",
      userId: "user-1",
      title: "Team Meeting",
      description: "Weekly sync",
      startAt: new Date("2024-06-10T10:00:00Z"),
      endAt: new Date("2024-06-10T11:00:00Z"),
      isAllDay: false,
      color: "#3b82f6",
      category: "Work",
      recurrenceRule: null,
      sourceType: "STANDALONE",
      sourceTaskId: null,
      externalSyncId: null,
      timezone: "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await POST(
      createRequest({
        title: "Team Meeting",
        description: "Weekly sync",
        startAt: "2024-06-10T10:00:00Z",
        endAt: "2024-06-10T11:00:00Z",
        isAllDay: false,
        color: "#3b82f6",
        category: "Work",
        timezone: "America/New_York",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("evt-1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Team Meeting",
        description: "Weekly sync",
        color: "#3b82f6",
        category: "Work",
        sourceType: "STANDALONE",
        timezone: "America/New_York",
      }),
    });
  });

  it("creates event with minimal fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockResolvedValue({
      id: "evt-2",
      userId: "user-1",
      title: "Quick Event",
      description: null,
      startAt: new Date("2024-06-10T10:00:00Z"),
      endAt: null,
      isAllDay: false,
      color: null,
      category: null,
      recurrenceRule: null,
      sourceType: "STANDALONE",
      sourceTaskId: null,
      externalSyncId: null,
      timezone: "UTC",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const res = await POST(
      createRequest({ title: "Quick Event", startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("evt-2");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Quick Event",
        description: null,
        endAt: null,
        isAllDay: false,
        color: null,
        category: null,
        recurrenceRule: null,
        sourceType: "STANDALONE",
        timezone: "UTC",
      }),
    });
  });

  it("returns 500 on database error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);
    mockCreate.mockRejectedValue(new Error("DB error"));

    const res = await POST(
      createRequest({ title: "Event", startAt: "2024-06-10T10:00:00Z" })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
