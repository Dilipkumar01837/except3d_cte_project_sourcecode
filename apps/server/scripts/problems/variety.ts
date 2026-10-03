import { ChallengeDifficulty, ChallengeType } from '@prisma/client';

export interface VarietyTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface VarietyChallenge {
  slug: string;
  title: string;
  statement: string;
  constraints: string;
  difficulty: ChallengeDifficulty;
  type: ChallengeType;
  tags: string[];
  xpReward: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  /** Python starter shown in the editor. May contain deliberate gaps for
   *  FILL_IN_THE_BLANK / CODE_COMPLETION / DEBUGGING items. */
  starterCode: string;
  /** Reference Python solution, stored for admin review. */
  solution: string;
  hints: string[];
  testCases: VarietyTestCase[];
}

/**
 * Supplementary content that exercises every remaining `ChallengeType` and the
 * MEDIUM/HARD `ChallengeDifficulty` values, none of which the beginner set uses.
 *
 * These are still code-submission challenges: the client's single editor +
 * judge pipeline is the interaction for every type. DEBUGGING, CODE_COMPLETION
 * and FILL_IN_THE_BLANK differ only by what the starter contains; the client
 * renders type-specific guidance above the editor. OUTPUT_PREDICTION shows a
 * snippet in the statement and asks the player to reproduce its output, since
 * there is no separate answer-comparison pipeline.
 */
export const varietyChallenges: VarietyChallenge[] = [
  {
    slug: 'python-balanced-brackets',
    title: 'Python: Balanced Brackets',
    statement:
      'Read a single line made only of the characters ( ) [ ] { }. Print YES if every opening\n' +
      'bracket is closed by the matching bracket in the correct order, otherwise print NO.\n' +
      'An empty line is balanced.',
    constraints: 'The line contains at most 100000 characters from the set ()[]{}.',
    difficulty: ChallengeDifficulty.MEDIUM,
    type: ChallengeType.DATA_STRUCTURES,
    tags: ['stack', 'strings', 'medium'],
    xpReward: 80,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'import sys\n\n' +
      'line = sys.stdin.readline().strip()\n' +
      '# Print YES if the brackets are balanced, otherwise NO.\n',
    solution:
      'import sys\n\n' +
      'PAIRS = {")": "(", "]": "[", "}": "{"}\n' +
      'stack = []\n' +
      'for char in sys.stdin.readline().strip():\n' +
      '    if char in "([{":\n' +
      '        stack.append(char)\n' +
      '    elif char in PAIRS:\n' +
      '        if not stack or stack.pop() != PAIRS[char]:\n' +
      '            print("NO")\n' +
      '            break\n' +
      'else:\n' +
      '    print("YES" if not stack else "NO")\n',
    hints: [
      'Keep track of opening brackets you have seen but not closed yet.',
      'A list works as a stack: push on an opening bracket, pop and check on a closing one.',
    ],
    testCases: [
      { input: '()', expectedOutput: 'YES', isHidden: false, explanation: 'Simple pair.' },
      { input: '([{}])', expectedOutput: 'YES', isHidden: false, explanation: 'Properly nested.' },
      { input: '(]', expectedOutput: 'NO', isHidden: false, explanation: 'Mismatched types.' },
      { input: '((()))', expectedOutput: 'YES', isHidden: true },
      { input: '([)]', expectedOutput: 'NO', isHidden: true },
      { input: '{{{{', expectedOutput: 'NO', isHidden: true },
      { input: ')', expectedOutput: 'NO', isHidden: true },
      { input: '[](){}', expectedOutput: 'YES', isHidden: true },
      { input: '', expectedOutput: 'YES', isHidden: true },
    ],
  },
  {
    slug: 'python-fix-off-by-one',
    title: 'Python: Fix the Off-by-One',
    statement:
      'The program below should read an integer n and print 1 + 2 + ... + n, but it is off by\n' +
      'one and misses the final term. Fix the bug so the tests pass.\n\n' +
      '    import sys\n' +
      '    n = int(sys.stdin.readline())\n' +
      '    total = 0\n' +
      '    for value in range(1, n):\n' +
      '        total += value\n' +
      '    print(total)',
    constraints: '0 <= n <= 1000000',
    difficulty: ChallengeDifficulty.EASY,
    type: ChallengeType.DEBUGGING,
    tags: ['debugging', 'loops', 'easy'],
    xpReward: 40,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'import sys\n\n' +
      'n = int(sys.stdin.readline())\n' +
      'total = 0\n' +
      'for value in range(1, n):\n' +
      '    total += value\n' +
      'print(total)\n',
    solution:
      'import sys\n\n' +
      'n = int(sys.stdin.readline())\n' +
      'total = 0\n' +
      'for value in range(1, n + 1):\n' +
      '    total += value\n' +
      'print(total)\n',
    hints: [
      'Compare range(1, n) with the terms 1 through n inclusive.',
      'range stops before its second argument, so the last term is dropped.',
    ],
    testCases: [
      { input: '5', expectedOutput: '15', isHidden: false, explanation: '1+2+3+4+5.' },
      { input: '1', expectedOutput: '1', isHidden: false, explanation: 'Single term.' },
      { input: '3', expectedOutput: '6', isHidden: false, explanation: '1+2+3.' },
      { input: '10', expectedOutput: '55', isHidden: true },
      { input: '100', expectedOutput: '5050', isHidden: true },
      { input: '2', expectedOutput: '3', isHidden: true },
      { input: '0', expectedOutput: '0', isHidden: true },
      { input: '7', expectedOutput: '28', isHidden: true },
      { input: '1000', expectedOutput: '500500', isHidden: true },
    ],
  },
  {
    slug: 'python-predict-skipped-sum',
    title: 'Python: Predict the Output',
    statement:
      'Study the snippet and work out what it prints for a given n, then write a program that\n' +
      'reads n and prints exactly that value.\n\n' +
      '    n = int(input())\n' +
      '    total = 0\n' +
      '    for i in range(1, n + 1):\n' +
      '        if i % 3 == 0:\n' +
      '            continue\n' +
      '        total += i\n' +
      '    print(total)',
    constraints: '0 <= n <= 1000000',
    difficulty: ChallengeDifficulty.MEDIUM,
    type: ChallengeType.OUTPUT_PREDICTION,
    tags: ['output-prediction', 'loops', 'medium'],
    xpReward: 60,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'n = int(input())\n# Print the value the snippet in the statement produces for n.\n',
    solution:
      'n = int(input())\n' +
      'total = 0\n' +
      'for i in range(1, n + 1):\n' +
      '    if i % 3 == 0:\n' +
      '        continue\n' +
      '    total += i\n' +
      'print(total)\n',
    hints: [
      'The continue statement skips the current value entirely.',
      'Add every integer from 1 to n except the multiples of 3.',
    ],
    testCases: [
      { input: '5', expectedOutput: '12', isHidden: false, explanation: '1+2+4+5=12.' },
      { input: '3', expectedOutput: '3', isHidden: false, explanation: '1+2=3.' },
      { input: '1', expectedOutput: '1', isHidden: false, explanation: 'Just 1.' },
      { input: '6', expectedOutput: '12', isHidden: true },
      { input: '10', expectedOutput: '37', isHidden: true },
      { input: '2', expectedOutput: '3', isHidden: true },
      { input: '0', expectedOutput: '0', isHidden: true },
      { input: '9', expectedOutput: '27', isHidden: true },
      { input: '12', expectedOutput: '48', isHidden: true },
    ],
  },
  {
    slug: 'python-fill-largest',
    title: 'Python: Fill in the Comparison',
    statement:
      'The program should read two integers and print the larger one (or that value when they\n' +
      'are equal). Replace the blank marked with underscores in the condition so it works.',
    constraints: '-1000000000 <= a, b <= 1000000000',
    difficulty: ChallengeDifficulty.EASY,
    type: ChallengeType.FILL_IN_THE_BLANK,
    tags: ['fill-in-the-blank', 'conditionals', 'easy'],
    xpReward: 30,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'import sys\n\n' +
      'a = int(sys.stdin.readline())\n' +
      'b = int(sys.stdin.readline())\n' +
      'if a ____ b:\n' +
      '    print(a)\n' +
      'else:\n' +
      '    print(b)\n',
    solution:
      'import sys\n\n' +
      'a = int(sys.stdin.readline())\n' +
      'b = int(sys.stdin.readline())\n' +
      'if a >= b:\n' +
      '    print(a)\n' +
      'else:\n' +
      '    print(b)\n',
    hints: [
      'You want the first branch to run whenever a is not smaller than b.',
      'Use >= so the equal case still prints the value.',
    ],
    testCases: [
      { input: '3\n8', expectedOutput: '8', isHidden: false, explanation: 'b is larger.' },
      { input: '10\n2', expectedOutput: '10', isHidden: false, explanation: 'a is larger.' },
      { input: '5\n5', expectedOutput: '5', isHidden: false, explanation: 'Equal values.' },
      { input: '0\n0', expectedOutput: '0', isHidden: true },
      { input: '-1\n-5', expectedOutput: '-1', isHidden: true },
      { input: '100\n99', expectedOutput: '100', isHidden: true },
      { input: '7\n7', expectedOutput: '7', isHidden: true },
      { input: '2\n9', expectedOutput: '9', isHidden: true },
      { input: '-3\n-4', expectedOutput: '-3', isHidden: true },
    ],
  },
  {
    slug: 'python-complete-fibonacci',
    title: 'Python: Complete Fibonacci',
    statement:
      'Complete the fibonacci function so it returns the n-th Fibonacci number, where\n' +
      'fibonacci(0) = 0, fibonacci(1) = 1, and each later value is the sum of the previous two.',
    constraints: '0 <= n <= 90',
    difficulty: ChallengeDifficulty.MEDIUM,
    type: ChallengeType.CODE_COMPLETION,
    tags: ['code-completion', 'functions', 'medium'],
    xpReward: 70,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'import sys\n\n\n' +
      'def fibonacci(n):\n' +
      '    # TODO: return the n-th Fibonacci number.\n' +
      '    pass\n\n\n' +
      'n = int(sys.stdin.readline())\n' +
      'print(fibonacci(n))\n',
    solution:
      'import sys\n\n\n' +
      'def fibonacci(n):\n' +
      '    previous, current = 0, 1\n' +
      '    for _ in range(n):\n' +
      '        previous, current = current, previous + current\n' +
      '    return previous\n\n\n' +
      'n = int(sys.stdin.readline())\n' +
      'print(fibonacci(n))\n',
    hints: [
      'You only need the previous two values to compute the next one.',
      'Track two variables and update them n times; the first holds the answer.',
    ],
    testCases: [
      { input: '0', expectedOutput: '0', isHidden: false, explanation: 'Base case.' },
      { input: '1', expectedOutput: '1', isHidden: false, explanation: 'Base case.' },
      { input: '10', expectedOutput: '55', isHidden: false, explanation: 'F(10).' },
      { input: '2', expectedOutput: '1', isHidden: true },
      { input: '3', expectedOutput: '2', isHidden: true },
      { input: '7', expectedOutput: '13', isHidden: true },
      { input: '20', expectedOutput: '6765', isHidden: true },
      { input: '15', expectedOutput: '610', isHidden: true },
      { input: '30', expectedOutput: '832040', isHidden: true },
    ],
  },
  {
    slug: 'python-merge-intervals',
    title: 'Python: Merge Intervals',
    statement:
      'Read an integer n, then n lines each holding two integers start and end (start <= end).\n' +
      'Merge every pair of overlapping or touching intervals, then print the merged intervals in\n' +
      'ascending order, one per line, as two space-separated integers.',
    constraints: '1 <= n <= 100000; 0 <= start <= end <= 1000000000',
    difficulty: ChallengeDifficulty.HARD,
    type: ChallengeType.ALGORITHMS,
    tags: ['sorting', 'intervals', 'hard'],
    xpReward: 150,
    timeLimitMs: 10_000,
    memoryLimitMb: 128,
    starterCode:
      'import sys\n\n\n' +
      'def main():\n' +
      '    data = sys.stdin.read().split()\n' +
      '    if not data:\n' +
      '        return\n' +
      '    n = int(data[0])\n' +
      '    intervals = []\n' +
      '    index = 1\n' +
      '    for _ in range(n):\n' +
      '        intervals.append((int(data[index]), int(data[index + 1])))\n' +
      '        index += 2\n' +
      '    # TODO: merge overlapping intervals and print each as "start end".\n' +
      '    for start, end in intervals:\n' +
      '        print(start, end)\n\n\n' +
      'if __name__ == "__main__":\n' +
      '    main()\n',
    solution:
      'import sys\n\n\n' +
      'def main():\n' +
      '    data = sys.stdin.read().split()\n' +
      '    if not data:\n' +
      '        return\n' +
      '    n = int(data[0])\n' +
      '    intervals = []\n' +
      '    index = 1\n' +
      '    for _ in range(n):\n' +
      '        intervals.append((int(data[index]), int(data[index + 1])))\n' +
      '        index += 2\n' +
      '    intervals.sort()\n' +
      '    merged = []\n' +
      '    for start, end in intervals:\n' +
      '        if merged and start <= merged[-1][1]:\n' +
      '            merged[-1] = (merged[-1][0], max(merged[-1][1], end))\n' +
      '        else:\n' +
      '            merged.append((start, end))\n' +
      '    for start, end in merged:\n' +
      '        print(start, end)\n\n\n' +
      'if __name__ == "__main__":\n' +
      '    main()\n',
    hints: [
      'Sort the intervals by their start before merging.',
      'An interval merges into the previous one when its start is <= the previous end.',
    ],
    testCases: [
      {
        input: '3\n1 3\n2 6\n8 10',
        expectedOutput: '1 6\n8 10',
        isHidden: false,
        explanation: 'First two overlap.',
      },
      { input: '1\n5 5', expectedOutput: '5 5', isHidden: false, explanation: 'Single point.' },
      { input: '2\n1 4\n4 5', expectedOutput: '1 5', isHidden: false, explanation: 'Touching.' },
      {
        input: '4\n1 2\n3 4\n5 6\n7 8',
        expectedOutput: '1 2\n3 4\n5 6\n7 8',
        isHidden: true,
      },
      { input: '3\n1 10\n2 3\n4 5', expectedOutput: '1 10', isHidden: true },
      {
        input: '5\n5 6\n1 2\n2 3\n10 12\n11 13',
        expectedOutput: '1 3\n5 6\n10 13',
        isHidden: true,
      },
      { input: '2\n1 5\n2 3', expectedOutput: '1 5', isHidden: true },
      { input: '2\n0 0\n0 1', expectedOutput: '0 1', isHidden: true },
    ],
  },
];
