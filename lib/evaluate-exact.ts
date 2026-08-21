export function evaluateExactAnswer(submitted: string, expected: string) {
  const a = submitted.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  return {
    passed: a === b,
    feedback:
      a === b
        ? "Confirmed against the warehouse snapshot."
        : "That doesn't match the snapshot. Re-check the tables.",
  };
}
