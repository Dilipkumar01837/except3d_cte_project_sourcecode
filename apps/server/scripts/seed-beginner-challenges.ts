import {
  ChallengeDifficulty,
  ChallengeType,
  PrismaClient,
  ProgrammingLanguage,
} from '@prisma/client';
import '../src/config/index.js';

const prisma = new PrismaClient();

type ProblemKey =
  | 'sum-two-numbers'
  | 'even-or-odd'
  | 'largest-of-three'
  | 'count-vowels'
  | 'reverse-string'
  | 'factorial';

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
  {
    key: 'count-vowels',
    title: 'Count Vowels',
    statement:
      'Read a line of text and print how many vowels it contains. Count a, e, i, o and u, treating uppercase and lowercase the same. The text may contain spaces.',
    constraints: '0 <= length of the text <= 1000',
    tags: ['beginner', 'strings', 'iteration'],
    visible: [
      ['hello', '2'],
      ['AEIOU', '5'],
      ['xyz', '0'],
    ],
    hidden: [
      ['code to escape', '6'],
      ['Rhythm', '0'],
      ['aA', '2'],
      ['the quick brown fox', '5'],
      ['Programming', '3'],
      ['why try', '0'],
    ],
    hints: [
      'Look at each character and decide whether it is one of a, e, i, o, u.',
      'Lowercase each character before comparing so uppercase vowels count too.',
    ],
  },
  {
    key: 'reverse-string',
    title: 'Reverse a String',
    statement: 'Read a line of text and print it in reverse order. The text may contain spaces.',
    constraints: '0 <= length of the text <= 1000',
    tags: ['beginner', 'strings'],
    visible: [
      ['hello', 'olleh'],
      ['abc', 'cba'],
      ['a', 'a'],
    ],
    hidden: [
      ['code to escape', 'epacse ot edoc'],
      ['12345', '54321'],
      ['racecar', 'racecar'],
      ['Hello World', 'dlroW olleH'],
      ['ab', 'ba'],
      ['ZzYy', 'yYzZ'],
    ],
    hints: [
      'Think about reading the characters from the end back to the beginning.',
      'Build the result by adding each character to the front as you iterate.',
    ],
  },
  {
    key: 'factorial',
    title: 'Factorial',
    statement:
      'Read an integer n and print its factorial n!, the product of every integer from 1 to n. By definition 0! equals 1.',
    constraints: '0 <= n <= 20',
    tags: ['beginner', 'loops', 'arithmetic'],
    visible: [
      ['0', '1'],
      ['1', '1'],
      ['5', '120'],
    ],
    hidden: [
      ['2', '2'],
      ['3', '6'],
      ['10', '3628800'],
      ['20', '2432902008176640000'],
      ['7', '5040'],
      ['12', '479001600'],
    ],
    hints: [
      'Start from 1 and multiply by every integer up to n.',
      'Keep a running product and multiply it by the loop counter each step.',
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
      'count-vowels':
        '# Read a line and print the number of vowels (a, e, i, o, u).\ntext = input()\ncount = 0\n# Count the vowels in text and print the total.\nprint(count)\n',
      'reverse-string':
        '# Read a line and print it in reverse.\ntext = input()\n# Print the reversed text.\nprint(text)\n',
      factorial:
        '# Read an integer n and print n! (the factorial of n).\nn = int(input())\nresult = 1\n# Multiply the values from 2 up to n and print the result.\nprint(result)\n',
    },
    solution: {
      'sum-two-numbers': 'a, b = map(int, input().split())\nprint(a + b)\n',
      'even-or-odd': 'number = int(input())\nprint("Even" if number % 2 == 0 else "Odd")\n',
      'largest-of-three': 'a, b, c = map(int, input().split())\nprint(max(a, b, c))\n',
      'count-vowels':
        'text = input()\ncount = sum(1 for character in text.lower() if character in "aeiou")\nprint(count)\n',
      'reverse-string': 'text = input()\nprint(text[::-1])\n',
      factorial:
        'n = int(input())\nresult = 1\nfor value in range(2, n + 1):\n    result *= value\nprint(result)\n',
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
      'count-vowels':
        "const fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\n// Count the vowels in text and print the total.\n",
      'reverse-string':
        "const fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\n// Print the text in reverse.\n",
      factorial:
        "const fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\n// Compute n! and print the result.\n",
    },
    solution: {
      'sum-two-numbers':
        "const fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
      'even-or-odd':
        "const fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\nconsole.log(number % 2 === 0 ? 'Even' : 'Odd');\n",
      'largest-of-three':
        "const fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(...values));\n",
      'count-vowels':
        "const fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\nconst count = [...text.toLowerCase()].filter((character) => 'aeiou'.includes(character)).length;\nconsole.log(count);\n",
      'reverse-string':
        "const fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\nconsole.log([...text].reverse().join(''));\n",
      factorial:
        "const fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\nlet result = 1;\nfor (let value = 2; value <= n; value++) {\n  result *= value;\n}\nconsole.log(result);\n",
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
      'count-vowels':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\n// Count the vowels in text and print the total.\n",
      'reverse-string':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\n// Print the text in reverse.\n",
      factorial:
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\n// Compute n! and print the result.\n",
    },
    solution: {
      'sum-two-numbers':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
      'even-or-odd':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst number = Number(fs.readFileSync(0, 'utf8').trim());\nconsole.log(number % 2 === 0 ? 'Even' : 'Odd');\n",
      'largest-of-three':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(Math.max(...values));\n",
      'count-vowels':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\nconst count = [...text.toLowerCase()].filter((character) => 'aeiou'.includes(character)).length;\nconsole.log(count);\n",
      'reverse-string':
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst text = fs.readFileSync(0, 'utf8').replace(/\\r?\\n$/, '');\nconsole.log([...text].reverse().join(''));\n",
      factorial:
        "declare const require: (name: string) => { readFileSync: (fd: number, encoding: string) => string };\nconst fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\nlet result = 1;\nfor (let value = 2; value <= n; value++) {\n  result *= value;\n}\nconsole.log(result);\n",
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
      'count-vowels':
        'package main\n\nimport (\n\t"bufio"\n\t"os"\n\t"strings"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tscanner.Scan()\n\ttext := scanner.Text()\n\t// Count the vowels in text and print the total.\n\t_ = text\n}\n',
      'reverse-string':
        'package main\n\nimport (\n\t"bufio"\n\t"os"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tscanner.Scan()\n\ttext := scanner.Text()\n\t_ = text\n\t// Print the text in reverse.\n}\n',
      factorial:
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar n int\n\tfmt.Scan(&n)\n\t// Compute n! and print the result.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Scan(&a, &b)\n\tfmt.Println(a + b)\n}\n',
      'even-or-odd':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar number int\n\tfmt.Scan(&number)\n\tif number%2 == 0 {\n\t\tfmt.Println("Even")\n\t} else {\n\t\tfmt.Println("Odd")\n\t}\n}\n',
      'largest-of-three':
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b, c int\n\tfmt.Scan(&a, &b, &c)\n\tlargest := a\n\tif b > largest { largest = b }\n\tif c > largest { largest = c }\n\tfmt.Println(largest)\n}\n',
      'count-vowels':
        'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n\t"strings"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tscanner.Scan()\n\ttext := scanner.Text()\n\tcount := 0\n\tfor _, character := range strings.ToLower(text) {\n\t\tif strings.ContainsRune("aeiou", character) {\n\t\t\tcount++\n\t\t}\n\t}\n\tfmt.Println(count)\n}\n',
      'reverse-string':
        'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tscanner := bufio.NewScanner(os.Stdin)\n\tscanner.Scan()\n\ttext := []rune(scanner.Text())\n\tfor left, right := 0, len(text)-1; left < right; left, right = left+1, right-1 {\n\t\ttext[left], text[right] = text[right], text[left]\n\t}\n\tfmt.Println(string(text))\n}\n',
      factorial:
        'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar n int\n\tfmt.Scan(&n)\n\tresult := int64(1)\n\tfor value := 2; value <= n; value++ {\n\t\tresult *= int64(value)\n\t}\n\tfmt.Println(result)\n}\n',
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
      'count-vowels':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let text = input.lines().next().unwrap_or("");\n    // Count the vowels in text and print the total.\n}\n',
      'reverse-string':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let text = input.lines().next().unwrap_or("");\n    let _ = text;\n    // Print the text in reverse.\n}\n',
      factorial:
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let n: i64 = input.trim().parse().unwrap();\n    // Compute n! and print the result.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let values: Vec<i64> = input.split_whitespace().map(|value| value.parse().unwrap()).collect();\n    println!("{}", values[0] + values[1]);\n}\n',
      'even-or-odd':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let number: i64 = input.trim().parse().unwrap();\n    println!("{}", if number % 2 == 0 { "Even" } else { "Odd" });\n}\n',
      'largest-of-three':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let values: Vec<i64> = input.split_whitespace().map(|value| value.parse().unwrap()).collect();\n    println!("{}", values.iter().max().unwrap());\n}\n',
      'count-vowels':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let text = input.lines().next().unwrap_or("");\n    let count = text.chars().filter(|c| "aeiou".contains(c.to_ascii_lowercase())).count();\n    println!("{}", count);\n}\n',
      'reverse-string':
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let text = input.lines().next().unwrap_or("");\n    let reversed: String = text.chars().rev().collect();\n    println!("{}", reversed);\n}\n',
      factorial:
        'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let n: i64 = input.trim().parse().unwrap();\n    let mut result: i64 = 1;\n    for value in 2..=n {\n        result *= value;\n    }\n    println!("{}", result);\n}\n',
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
      'count-vowels':
        '#include <iostream>\n#include <cctype>\n#include <string>\nusing namespace std;\n\nint main() {\n    string text;\n    getline(cin, text);\n    // Count the vowels in text and print the total.\n}\n',
      'reverse-string':
        '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string text;\n    getline(cin, text);\n    // Print the text in reverse.\n}\n',
      factorial:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // Compute n! and print the result.\n}\n',
    },
    solution: {
      'sum-two-numbers':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b << "\\n";\n}\n',
      'even-or-odd':
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    long long number;\n    cin >> number;\n    cout << (number % 2 == 0 ? "Even" : "Odd") << "\\n";\n}\n',
      'largest-of-three':
        '#include <iostream>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    long long a, b, c;\n    cin >> a >> b >> c;\n    cout << max(a, max(b, c)) << "\\n";\n}\n',
      'count-vowels':
        '#include <iostream>\n#include <cctype>\n#include <string>\nusing namespace std;\n\nint main() {\n    string text;\n    getline(cin, text);\n    int count = 0;\n    for (char character : text) {\n        char lower = static_cast<char>(tolower(static_cast<unsigned char>(character)));\n        if (string("aeiou").find(lower) != string::npos) {\n            count++;\n        }\n    }\n    cout << count << "\\n";\n    return 0;\n}\n',
      'reverse-string':
        '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string text;\n    getline(cin, text);\n    reverse(text.begin(), text.end());\n    cout << text << "\\n";\n    return 0;\n}\n',
      factorial:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    long long result = 1;\n    for (int value = 2; value <= n; value++) {\n        result *= value;\n    }\n    cout << result << "\\n";\n    return 0;\n}\n',
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
      'count-vowels':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String text = scanner.hasNextLine() ? scanner.nextLine() : "";\n        // Count the vowels in text and print the total.\n    }\n}\n',
      'reverse-string':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String text = scanner.hasNextLine() ? scanner.nextLine() : "";\n        // Print the text in reverse.\n    }\n}\n',
      factorial:
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int n = scanner.nextInt();\n        // Compute n! and print the result.\n    }\n}\n',
    },
    solution: {
      'sum-two-numbers':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long a = scanner.nextLong();\n        long b = scanner.nextLong();\n        System.out.println(a + b);\n    }\n}\n',
      'even-or-odd':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long number = scanner.nextLong();\n        System.out.println(number % 2 == 0 ? "Even" : "Odd");\n    }\n}\n',
      'largest-of-three':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long a = scanner.nextLong();\n        long b = scanner.nextLong();\n        long c = scanner.nextLong();\n        System.out.println(Math.max(a, Math.max(b, c)));\n    }\n}\n',
      'count-vowels':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String text = scanner.hasNextLine() ? scanner.nextLine() : "";\n        int count = 0;\n        for (char character : text.toLowerCase().toCharArray()) {\n            if ("aeiou".indexOf(character) >= 0) {\n                count++;\n            }\n        }\n        System.out.println(count);\n    }\n}\n',
      'reverse-string':
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String text = scanner.hasNextLine() ? scanner.nextLine() : "";\n        System.out.println(new StringBuilder(text).reverse().toString());\n    }\n}\n',
      factorial:
        'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int n = scanner.nextInt();\n        long result = 1;\n        for (int value = 2; value <= n; value++) {\n            result *= value;\n        }\n        System.out.println(result);\n    }\n}\n',
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
  if (challenges.length !== 42)
    throw new Error(`Expected 42 beginner challenges, found ${String(challenges.length)}`);
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
    if (counts.get(language.language) !== 6)
      throw new Error(`Expected 6 challenges for ${language.language}`);
  }
  console.log('Validated 42 beginner challenges: 6 per language.');
}

try {
  for (const language of languageContent) {
    for (const problem of problems) await seedChallenge(language, problem);
  }
  await validateSeed();
} finally {
  await prisma.$disconnect();
}
