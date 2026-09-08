import {
  ChallengeDifficulty,
  ChallengeType,
  PrismaClient,
  ProgrammingLanguage,
} from '@prisma/client';
import '../src/config/index.js';

const prisma = new PrismaClient();

type ProblemKey = 'sum-two-numbers' | 'even-or-odd' | 'largest-of-three';

type Problem = {
  key: ProblemKey;
  title: string;
  statement: string;
  constraints: string;
  tags: string[];
  visible: Array<[string, string]>;
  hidden: Array<[string, string]>;
  hints: string[];
};

type LanguageContent = {
  language: ProgrammingLanguage;
  label: string;
  starter: Record<ProblemKey, string>;
  solution: Record<ProblemKey, string>;
};

const problems: Problem[] = [
  {
    key: 'sum-two-numbers',
    title: 'Sum of Two Numbers',
    statement:
      'Read two integers and print their sum. The two numbers are separated by whitespace.',
    constraints: '-1000000000 <= a, b <= 1000000000',
    tags: ['beginner', 'input-output', 'arithmetic'],
    visible: [
      ['5 7', '12'],
      ['10 20', '30'],
      ['-5 10', '5'],
    ],
    hidden: [
      ['0 0', '0'],
      ['-8 -12', '-20'],
      ['1000000000 -1', '999999999'],
      ['42 -42', '0'],
      ['123456 654321', '777777'],
      ['-999999999 1', '-999999998'],
    ],
    hints: [
      'Think about the arithmetic operation needed to combine the two input numbers.',
      'Read both values into variables and add them together.',
    ],
  },
  {
    key: 'even-or-odd',
    title: 'Even or Odd',
    statement: 'Read one integer. Print Even if it is divisible by 2; otherwise print Odd.',
    constraints: '-1000000000 <= n <= 1000000000',
    tags: ['beginner', 'conditionals', 'modulo'],
    visible: [
      ['8', 'Even'],
      ['7', 'Odd'],
      ['0', 'Even'],
    ],
    hidden: [
      ['-2', 'Even'],
      ['-7', 'Odd'],
      ['1', 'Odd'],
      ['100', 'Even'],
      ['999999999', 'Odd'],
      ['-1000000000', 'Even'],
    ],
    hints: [
      'Think about what remains after an integer is divided by 2.',
      'Use the modulo operator and check whether the remainder is zero.',
    ],
  },
  {
    key: 'largest-of-three',
    title: 'Largest of Three Numbers',
    statement:
      'Read three integers and print the largest value. The numbers are separated by whitespace.',
    constraints: '-1000000000 <= a, b, c <= 1000000000',
    tags: ['beginner', 'conditionals', 'comparisons'],
    visible: [
      ['10 25 15', '25'],
      ['30 12 8', '30'],
      ['4 9 20', '20'],
    ],
    hidden: [
      ['5 5 5', '5'],
      ['-1 -8 -3', '-1'],
      ['0 -2 0', '0'],
      ['1000000000 2 3', '1000000000'],
      ['7 7 3', '7'],
      ['-1000000000 -999999999 -1000000000', '-999999999'],
    ],
    hints: [
      'Compare the numbers with each other.',
      'Keep track of the largest value seen so far as you examine each number.',
    ],
  },
];

const languageContent: LanguageContent[] = [
  {
    language: 'PYTHON',
    label: 'Python',
    starter: {
      'sum-two-numbers': '# Read two integers and print their sum\n',
      'even-or-odd': '# Read an integer and print Even or Odd\n',
      'largest-of-three': '# Read three integers and print the largest\n',
    },
    solution: {
      'sum-two-numbers': 'a, b = map(int, input().split())\nprint(a + b)\n',
      'even-or-odd': 'number = int(input())\nprint("Even" if number % 2 == 0 else "Odd")\n',
      'largest-of-three': 'a, b, c = map(int, input().split())\nprint(max(a, b, c))\n',
    },
  },
  {
    language: 'JAVASCRIPT',
    label: 'JavaScript',
    starter: {
      'sum-two-numbers':
        "const fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n// Print the sum of the two values.\n",
      'even-or-odd':
        "const fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\n// Print Even or Odd.\n",
      'largest-of-three':
        "const fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n// Print the largest value.\n",
    },
    solution: {
      'sum-two-numbers':
        "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
      'even-or-odd':
        "const fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\nconsole.log(number % 2 === 0 ? 'Even' : 'Odd');\n",
      'largest-of-three':
        "const fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(...values));\n",
    },
  },
  {
    language: 'TYPESCRIPT',
    label: 'TypeScript',
    starter: {
      'sum-two-numbers':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n// Print the sum of the two values.\n",
      'even-or-odd':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\n// Print Even or Odd.\n",
      'largest-of-three':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\n// Print the largest value.\n",
    },
    solution: {
      'sum-two-numbers':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
      'even-or-odd':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\nconsole.log(number % 2 === 0 ? 'Even' : 'Odd');\n",
      'largest-of-three':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(...values));\n",
    },
  },
  {
    language: 'GO',
    label: 'Go',
    starter: {
      'sum-two-numbers':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\t// Read two integers and print their sum.\n}\n',
      'even-or-odd':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar number int\n\tfmt.Scan(&number)\n\t// Print Even or Odd.\n}\n',
      'largest-of-three':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b, c int\n\tfmt.Scan(&a, &b, &c)\n\t// Print the largest value.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Scan(&a, &b)\n\tfmt.Println(a + b)\n}\n',
      'even-or-odd':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar number int\n\tfmt.Scan(&number)\n\tif number%2 == 0 {\n\t\tfmt.Println("Even")\n\t} else {\n\t\tfmt.Println("Odd")\n\t}\n}\n',
      'largest-of-three':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b, c int\n\tfmt.Scan(&a, &b, &c)\n\tlargest := a\n\tif b > largest { largest = b }\n\tif c > largest { largest = c }\n\tfmt.Println(largest)\n}\n',
    },
  },
  {
    language: 'RUST',
    label: 'Rust',
    starter: {
      'sum-two-numbers':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    // Read two integers and print their sum.\n}\n',
      'even-or-odd':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let number: i64 = input.trim().parse().unwrap();\n    // Print Even or Odd.\n}\n',
      'largest-of-three':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    // Read three integers and print the largest.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let values: Vec<i64> = input.split_whitespace().map(|value| value.parse().unwrap()).collect();\n    println!("{}", values[0] + values[1]);\n}\n',
      'even-or-odd':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let number: i64 = input.trim().parse().unwrap();\n    println!("{}", if number % 2 == 0 { "Even" } else { "Odd" });\n}\n',
      'largest-of-three':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let values: Vec<i64> = input.split_whitespace().map(|value| value.parse().unwrap()).collect();\n    println!("{}", values.iter().max().unwrap());\n}\n',
    },
  },
  {
    language: 'CPP',
    label: 'C++',
    starter: {
      'sum-two-numbers':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read two integers and print their sum.\n}\n',
      'even-or-odd':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long number;\n    cin >> number;\n    // Print Even or Odd.\n}\n',
      'largest-of-three':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b, c;\n    cin >> a >> b >> c;\n    // Print the largest value.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b << "\\n";\n}\n',
      'even-or-odd':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long number;\n    cin >> number;\n    cout << (number % 2 == 0 ? "Even" : "Odd") << "\\n";\n}\n',
      'largest-of-three':
        '#include <iostream>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    long long a, b, c;\n    cin >> a >> b >> c;\n    cout << max(a, max(b, c)) << "\\n";\n}\n',
    },
  },
  {
    language: 'JAVA',
    label: 'Java',
    starter: {
      'sum-two-numbers':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Read two integers and print their sum.\n    }\n}\n',
      'even-or-odd':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int number = scanner.nextInt();\n        // Print Even or Odd.\n    }\n}\n',
      'largest-of-three':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int a = scanner.nextInt();\n        int b = scanner.nextInt();\n        int c = scanner.nextInt();\n        // Print the largest value.\n    }\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long a = scanner.nextLong();\n        long b = scanner.nextLong();\n        System.out.println(a + b);\n    }\n}\n',
      'even-or-odd':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long number = scanner.nextLong();\n        System.out.println(number % 2 == 0 ? "Even" : "Odd");\n    }\n}\n',
      'largest-of-three':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long a = scanner.nextLong();\n        long b = scanner.nextLong();\n        long c = scanner.nextLong();\n        System.out.println(Math.max(a, Math.max(b, c)));\n    }\n}\n',
    },
  },
];

function challengeSlug(language: LanguageContent, problem: Problem): string {
  return `${language.label.toLowerCase().replace('++', 'pp')}-${problem.key}`;
}

async function seedChallenge(language: LanguageContent, problem: Problem): Promise<void> {
  const slug = challengeSlug(language, problem);
  const existing = await prisma.challenge.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    await prisma.challenge.update({
      where: { slug },
      data: {
        timeLimitMs: 10_000,
        starterCode: { [language.language]: language.starter[problem.key] },
        solutions: {
          update: {
            where: {
              challengeId_language: { challengeId: existing.id, language: language.language },
            },
            data: { code: language.solution[problem.key] },
          },
        },
      },
    });
    return;
  }

  await prisma.challenge.create({
    data: {
      slug,
      title: `${language.label}: ${problem.title}`,
      statement: `${problem.statement}\n\nInput: Read the value or values from standard input.\nOutput: Print exactly the requested result.`,
      constraints: problem.constraints,
      starterCode: { [language.language]: language.starter[problem.key] },
      difficulty: ChallengeDifficulty.EASY,
      type: ChallengeType.ALGORITHMS,
      tags: problem.tags,
      supportedLanguages: [language.language],
      xpReward: 50,
      timeLimitMs: 10_000,
      memoryLimitMb: 128,
      isPublished: true,
      testCases: {
        create: [
          ...problem.visible.map(([input, expectedOutput], index) => ({
            input,
            expectedOutput,
            isHidden: false,
            sortOrder: index,
            explanation: `Example ${String(index + 1)} for ${problem.title}.`,
          })),
          ...problem.hidden.map(([input, expectedOutput], index) => ({
            input,
            expectedOutput,
            isHidden: true,
            sortOrder: problem.visible.length + index,
          })),
        ],
      },
      hints: {
        create: problem.hints.map((content, index) => ({
          level: index + 1,
          content,
          xpPenalty: 0,
        })),
      },
      solutions: {
        create: {
          language: language.language,
          code: language.solution[problem.key],
          explanation: 'Reference solution is stored for admin review and judging support.',
        },
      },
    },
  });
  console.log(`Created ${slug}`);
}

async function validateSeed(): Promise<void> {
  const slugs = languageContent.flatMap((language) =>
    problems.map((problem) => challengeSlug(language, problem)),
  );
  const challenges = await prisma.challenge.findMany({
    where: { slug: { in: slugs } },
    include: { testCases: true, hints: true, solutions: true },
  });
  if (challenges.length !== 21)
    throw new Error(`Expected 21 beginner challenges, found ${String(challenges.length)}`);
  for (const challenge of challenges) {
    const visible = challenge.testCases.filter((testCase) => !testCase.isHidden).length;
    const hidden = challenge.testCases.filter((testCase) => testCase.isHidden).length;
    if (
      challenge.difficulty !== 'EASY' ||
      !challenge.isPublished ||
      visible < 3 ||
      hidden < 5 ||
      challenge.hints.length < 1 ||
      challenge.solutions.length !== 1
    ) {
      throw new Error(`Invalid beginner challenge data for ${challenge.slug}`);
    }
  }
  const counts = new Map<ProgrammingLanguage, number>();
  for (const challenge of challenges) {
    const language = challenge.supportedLanguages[0];
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  for (const language of languageContent) {
    if (counts.get(language.language) !== 3)
      throw new Error(`Expected 3 challenges for ${language.language}`);
  }
  console.log('Validated 21 beginner challenges: 3 per language.');
}

try {
  for (const language of languageContent) {
    for (const problem of problems) await seedChallenge(language, problem);
  }
  await validateSeed();
} finally {
  await prisma.$disconnect();
}
