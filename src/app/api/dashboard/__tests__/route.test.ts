import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subProfile: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    financialEntry: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    calendarEvent: {
      findMany: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
    },
    notification: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/dashboard/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = vi.mocked(auth) as any;

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when user is SUB role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "SUB" },
      expires: "",
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("returns aggregated dashboard data for DOMME user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    vi.mocked(prisma.subProfile.count).mockResolvedValue(3);
    vi.mocked(prisma.subProfile.findMany).mockResolvedValue([
      {
        id: "sub-1",
        fullName: "Test Sub",
        subType: ["Finsub"],
        arrangementType: ["Online"],
        createdAt: new Date("2024-01-01"),
      },
    ] as never);

    vi.mocked(prisma.financialEntry.aggregate)
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "5000.00" } },
        _count: 25,
      } as never)
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "1200.00" } },
        _count: 8,
      } as never);

    vi.mocked(prisma.financialEntry.groupBy).mockResolvedValue([
      {
        subId: "sub-1",
        _sum: { amount: { toString: () => "3000.00" } },
      },
    ] as never);

    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(2) // overdueCount
      .mockResolvedValueOnce(3) // inProgressCount
      .mockResolvedValueOnce(5); // completedThisWeekCount

    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([
      {
        id: "event-1",
        title: "Meeting",
        startAt: new Date(),
        isAllDay: false,
        sourceType: "STANDALONE",
      },
    ] as never);

    vi.mocked(prisma.financialEntry.findMany).mockResolvedValue([
      {
        id: "entry-1",
        amount: { toString: () => "100.00" },
        currency: "USD",
        category: "Tribute",
        date: new Date("2024-06-01"),
        createdAt: new Date("2024-06-01"),
        sub: { fullName: "Test Sub" },
      },
    ] as never);

    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        id: "task-1",
        title: "Completed Task",
        completedAt: new Date(),
        sub: { fullName: "Test Sub" },
      },
    ] as never);

    vi.mocked(prisma.note.findMany).mockResolvedValue([
      {
        id: "note-1",
        title: "Test Note",
        updatedAt: new Date(),
        project: { id: "proj-1", name: "Test Project" },
      },
    ] as never);

    vi.mocked(prisma.notification.count).mockResolvedValue(2);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);

    // Sub overview
    expect(data.subOverview.totalCount).toBe(3);
    expect(data.subOverview.recentSubs).toHaveLength(1);
    expect(data.subOverview.recentSubs[0].fullName).toBe("Test Sub");

    // Financial summary
    expect(data.financialSummary.allTimeTotal).toBe("5000.00");
    expect(data.financialSummary.allTimeCount).toBe(25);
    expect(data.financialSummary.recentTotal).toBe("1200.00");
    expect(data.financialSummary.recentCount).toBe(8);
    expect(data.financialSummary.topEarners).toHaveLength(1);
    expect(data.financialSummary.topEarners[0].subName).toBe("Test Sub");
    expect(data.financialSummary.topEarners[0].total).toBe("3000.00");

    // Task summary
    expect(data.taskSummary.overdueCount).toBe(2);
    expect(data.taskSummary.inProgressCount).toBe(3);
    expect(data.taskSummary.completedThisWeekCount).toBe(5);

    // Upcoming events
    expect(data.upcomingEvents).toHaveLength(1);
    expect(data.upcomingEvents[0].title).toBe("Meeting");

    // Recent activity
    expect(data.recentActivity.financialEntries).toHaveLength(1);
    expect(data.recentActivity.financialEntries[0].category).toBe("Tribute");
    expect(data.recentActivity.completedTasks).toHaveLength(1);
    expect(data.recentActivity.completedTasks[0].title).toBe("Completed Task");
    expect(data.recentActivity.recentNotes).toHaveLength(1);
    expect(data.recentActivity.recentNotes[0].title).toBe("Test Note");

    // Notifications
    expect(data.unreadNotifications).toBe(2);
  });

  it("returns empty data when no records exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    vi.mocked(prisma.subProfile.count).mockResolvedValue(0);
    vi.mocked(prisma.subProfile.findMany).mockResolvedValue([]);

    vi.mocked(prisma.financialEntry.aggregate)
      .mockResolvedValueOnce({
        _sum: { amount: null },
        _count: 0,
      } as never)
      .mockResolvedValueOnce({
        _sum: { amount: null },
        _count: 0,
      } as never);

    vi.mocked(prisma.financialEntry.groupBy).mockResolvedValue([] as never);

    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.financialEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.count).mockResolvedValue(0);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subOverview.totalCount).toBe(0);
    expect(data.subOverview.recentSubs).toHaveLength(0);
    expect(data.financialSummary.allTimeTotal).toBe("0");
    expect(data.financialSummary.allTimeCount).toBe(0);
    expect(data.financialSummary.topEarners).toHaveLength(0);
    expect(data.taskSummary.overdueCount).toBe(0);
    expect(data.taskSummary.inProgressCount).toBe(0);
    expect(data.taskSummary.completedThisWeekCount).toBe(0);
    expect(data.upcomingEvents).toHaveLength(0);
    expect(data.recentActivity.financialEntries).toHaveLength(0);
    expect(data.recentActivity.completedTasks).toHaveLength(0);
    expect(data.recentActivity.recentNotes).toHaveLength(0);
    expect(data.unreadNotifications).toBe(0);
  });

  it("resolves top earner names correctly", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: "DOMME" },
      expires: "",
    } as never);

    vi.mocked(prisma.subProfile.count).mockResolvedValue(2);

    // First call returns recent subs, second call returns top earner subs
    vi.mocked(prisma.subProfile.findMany)
      .mockResolvedValueOnce([]) // recentSubs
      .mockResolvedValueOnce([
        { id: "sub-1", fullName: "Alpha Sub" },
        { id: "sub-2", fullName: "Beta Sub" },
      ] as never); // topEarnerSubs

    vi.mocked(prisma.financialEntry.aggregate)
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "10000.00" } },
        _count: 50,
      } as never)
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "2000.00" } },
        _count: 10,
      } as never);

    vi.mocked(prisma.financialEntry.groupBy).mockResolvedValue([
      { subId: "sub-1", _sum: { amount: { toString: () => "6000.00" } } },
      { subId: "sub-2", _sum: { amount: { toString: () => "4000.00" } } },
    ] as never);

    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.financialEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.count).mockResolvedValue(0);

    const res = await GET();
    const data = await res.json();

    expect(data.financialSummary.topEarners[0].subName).toBe("Alpha Sub");
    expect(data.financialSummary.topEarners[0].total).toBe("6000.00");
    expect(data.financialSummary.topEarners[1].subName).toBe("Beta Sub");
    expect(data.financialSummary.topEarners[1].total).toBe("4000.00");
  });

  it("scopes all queries to the authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-42", role: "DOMME" },
      expires: "",
    } as never);

    vi.mocked(prisma.subProfile.count).mockResolvedValue(0);
    vi.mocked(prisma.subProfile.findMany).mockResolvedValue([]);
    vi.mocked(prisma.financialEntry.aggregate).mockResolvedValue({
      _sum: { amount: null },
      _count: 0,
    } as never);
    vi.mocked(prisma.financialEntry.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.calendarEvent.findMany).mockResolvedValue([]);
    vi.mocked(prisma.financialEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.count).mockResolvedValue(0);

    await GET();

    // Check that subProfile.count was called with the correct userId
    expect(prisma.subProfile.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-42" }),
      })
    );

    // Check that notification.count was called with the correct userId
    expect(prisma.notification.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-42" }),
      })
    );
  });
});
