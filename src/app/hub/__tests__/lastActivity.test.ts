import { describe, it, expect } from "vitest";
import { getLastActivityDate } from "../lastActivity";

describe("getLastActivityDate", () => {
  it("returns the project date when there are no notes or tasks", () => {
    const projectDate = new Date("2024-06-15T10:00:00Z");
    const result = getLastActivityDate(projectDate, [], []);
    expect(result).toEqual(projectDate);
  });

  it("returns a note date when a note was updated more recently than the project", () => {
    const projectDate = new Date("2024-06-01T00:00:00Z");
    const noteDate = new Date("2024-06-20T00:00:00Z");
    const result = getLastActivityDate(projectDate, [noteDate], []);
    expect(result).toEqual(noteDate);
  });

  it("returns a task date when a task was updated more recently than the project", () => {
    const projectDate = new Date("2024-06-01T00:00:00Z");
    const taskDate = new Date("2024-07-01T00:00:00Z");
    const result = getLastActivityDate(projectDate, [], [taskDate]);
    expect(result).toEqual(taskDate);
  });

  it("returns the most recent date across project, notes, and tasks", () => {
    const projectDate = new Date("2024-01-01T00:00:00Z");
    const notesDates = [
      new Date("2024-03-01T00:00:00Z"),
      new Date("2024-05-01T00:00:00Z"),
    ];
    const tasksDates = [
      new Date("2024-04-01T00:00:00Z"),
      new Date("2024-06-15T00:00:00Z"),
    ];
    const result = getLastActivityDate(projectDate, notesDates, tasksDates);
    expect(result).toEqual(new Date("2024-06-15T00:00:00Z"));
  });

  it("returns the project date when it is the most recent", () => {
    const projectDate = new Date("2024-12-01T00:00:00Z");
    const notesDates = [new Date("2024-06-01T00:00:00Z")];
    const tasksDates = [new Date("2024-08-01T00:00:00Z")];
    const result = getLastActivityDate(projectDate, notesDates, tasksDates);
    expect(result).toEqual(projectDate);
  });

  it("handles multiple notes and tasks with the latest being a note", () => {
    const projectDate = new Date("2024-01-01T00:00:00Z");
    const notesDates = [
      new Date("2024-02-01T00:00:00Z"),
      new Date("2024-09-15T12:30:00Z"),
    ];
    const tasksDates = [
      new Date("2024-03-01T00:00:00Z"),
      new Date("2024-07-01T00:00:00Z"),
    ];
    const result = getLastActivityDate(projectDate, notesDates, tasksDates);
    expect(result).toEqual(new Date("2024-09-15T12:30:00Z"));
  });
});
