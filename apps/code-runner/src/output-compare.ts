/**
 * Output normalisation & comparison for judge results.
 *
 * Rules (applied to both program output and expected output):
 *  - CRLF / CR line endings are converted to LF.
 *  - Trailing whitespace on every line is removed.
 *  - A run of trailing blank lines is dropped.
 * This keeps the judge forgiving about Windows line endings and trailing
 * whitespace while still treating a change in the number of interior blank
 * lines or extra spaces inside a line as a mismatch.
 */
export function normaliseOutput(output: string | undefined): string {
  return (output ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/, '')
    .trimEnd();
}

export function outputsMatch(actual: string | undefined, expected: string): boolean {
  return normaliseOutput(actual) === normaliseOutput(expected);
}
