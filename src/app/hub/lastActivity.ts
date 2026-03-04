/**
 * Computes the most recent activity date for a project by comparing
 * the project's own updatedAt with the updatedAt of all its notes and tasks.
 */
export function getLastActivityDate(
  projectUpdatedAt: Date,
  notesDates: Date[],
  tasksDates: Date[]
): Date {
  const allDates = [projectUpdatedAt, ...notesDates, ...tasksDates];
  return new Date(Math.max(...allDates.map((d) => d.getTime())));
}
