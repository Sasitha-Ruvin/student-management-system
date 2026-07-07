export function deactivationBlockedMessage(activeStudentCount: number): string {
  const label = activeStudentCount === 1 ? "student" : "students";
  return `Cannot deactivate: ${activeStudentCount} active ${label} still enrolled in open batches at this branch.`;
}
