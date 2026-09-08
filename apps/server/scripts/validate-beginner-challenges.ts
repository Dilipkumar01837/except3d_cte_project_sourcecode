import { ProgrammingLanguage, PrismaClient } from '@prisma/client';
import '../src/config/index.js';
import { executeWithRunner } from '../src/modules/challenges/judge-execution.js';

const prisma = new PrismaClient();

const wrongCode: Record<ProgrammingLanguage, Record<string, string>> = {
  PYTHON: {
    'sum-two-numbers': 'print(0)\n',
    'even-or-odd': 'print("Even")\n',
    'largest-of-three': 'print(0)\n',
  },
  JAVASCRIPT: {
    'sum-two-numbers': 'console.log(0);\n',
    'even-or-odd': "console.log('Even');\n",
    'largest-of-three': 'console.log(0);\n',
  },
  TYPESCRIPT: {
    'sum-two-numbers': 'console.log(0);\n',
    'even-or-odd': "console.log('Even');\n",
    'largest-of-three': 'console.log(0);\n',
  },
  GO: {
    'sum-two-numbers': 'package main\nimport "fmt"\nfunc main() { fmt.Println(0) }\n',
    'even-or-odd': 'package main\nimport "fmt"\nfunc main() { fmt.Println("Even") }\n',
    'largest-of-three': 'package main\nimport "fmt"\nfunc main() { fmt.Println(0) }\n',
  },
  RUST: {
    'sum-two-numbers': 'fn main() { println!("0"); }\n',
    'even-or-odd': 'fn main() { println!("Even"); }\n',
    'largest-of-three': 'fn main() { println!("0"); }\n',
  },
  CPP: {
    'sum-two-numbers': '#include <iostream>\nint main() { std::cout << 0 << "\\n"; }\n',
    'even-or-odd': '#include <iostream>\nint main() { std::cout << "Even" << "\\n"; }\n',
    'largest-of-three': '#include <iostream>\nint main() { std::cout << 0 << "\\n"; }\n',
  },
  JAVA: {
    'sum-two-numbers':
      'public class Main { public static void main(String[] args) { System.out.println(0); } }\n',
    'even-or-odd':
      'public class Main { public static void main(String[] args) { System.out.println("Even"); } }\n',
    'largest-of-three':
      'public class Main { public static void main(String[] args) { System.out.println(0); } }\n',
  },
};

const syntaxCode: Record<ProgrammingLanguage, string> = {
  PYTHON: 'if True print("broken")\n',
  JAVASCRIPT: 'console.log(\n',
  TYPESCRIPT: 'const value: = 1;\n',
  GO: 'package main\nfunc main() {\n',
  RUST: 'fn main( {\n',
  CPP: '#include <iostream>\nint main() { int value = 1 }\n',
  JAVA: 'public class Main { public static void main(String[] args) { int value = 1 } }\n',
};

function keyFromSlug(slug: string): string {
  return slug.replace(/^[^-]+-/, '');
}

async function main(): Promise<void> {
  const seeded = await prisma.challenge.findMany({
    include: { testCases: { orderBy: { sortOrder: 'asc' } }, solutions: true },
  });
  const beginner = seeded.filter((challenge) =>
    /^(python|javascript|typescript|go|rust|cpp|java)-(sum-two-numbers|even-or-odd|largest-of-three)$/.test(
      challenge.slug,
    ),
  );
  if (beginner.length !== 21) {
    throw new Error(`Expected 21 seeded challenges, found ${String(beginner.length)}`);
  }
  for (const challenge of beginner) {
    const language = challenge.supportedLanguages[0];
    const solution = challenge.solutions.find((item) => item.language === language);
    if (!language || !solution) throw new Error(`Missing solution for ${challenge.slug}`);
    const input = challenge.testCases.map(({ id, input, expectedOutput }) => ({
      id,
      input,
      expectedOutput,
    }));
    const request = {
      language,
      sourceCode: solution.code,
      timeLimitMs: 10_000,
      memoryLimitMb: 128,
      testCases: input,
    };
    const accepted = await executeWithRunner(request);
    if (accepted.status !== 'ACCEPTED')
      throw new Error(
        `${challenge.slug}: expected ACCEPTED, got ${accepted.status}: ${accepted.compilerOutput ?? accepted.runtimeOutput ?? ''}`,
      );
    const problemKey = keyFromSlug(challenge.slug);
    const wrong = await executeWithRunner({
      ...request,
      sourceCode: wrongCode[language][problemKey],
    });
    if (wrong.status !== 'WRONG_ANSWER')
      throw new Error(`${challenge.slug}: expected WRONG_ANSWER, got ${wrong.status}`);
    const broken = await executeWithRunner({ ...request, sourceCode: syntaxCode[language] });
    if (
      !['COMPILATION_ERROR', 'RUNTIME_ERROR'].includes(broken.status) ||
      broken.diagnostics.length === 0
    ) {
      throw new Error(
        `${challenge.slug}: expected syntax/compile diagnostic, got ${broken.status}`,
      );
    }
    console.log(`Validated ${challenge.slug}: ACCEPTED, WRONG_ANSWER, ${broken.status}`);
  }
  console.log('Validated all 21 beginner challenges through the code runner.');
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
