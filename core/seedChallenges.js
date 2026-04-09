const Challenge = require("./models/Challenge");

const defaultStarterCode = {
  python: `numbers = list(map(int, input().split()))\nprint(sum(numbers))\n`,
  javascript: `const fs = require("fs");\nconst data = fs.readFileSync(0, "utf8").trim();\nconst numbers = data ? data.split(/\\s+/).map(Number) : [];\nconst sum = numbers.reduce((acc, value) => acc + value, 0);\nconsole.log(sum);\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        long sum = 0;\n        while (scanner.hasNextLong()) {\n            sum += scanner.nextLong();\n        }\n        System.out.println(sum);\n    }\n}\n`,
  csharp: `using System;\nusing System.Linq;\n\npublic class Main\n{\n    public static void Main(string[] args)\n    {\n        var input = Console.In.ReadToEnd().Trim();\n        if (string.IsNullOrWhiteSpace(input))\n        {\n            Console.WriteLine(0);\n            return;\n        }\n\n        var sum = input.Split((char[])null, StringSplitOptions.RemoveEmptyEntries)\n            .Select(long.Parse)\n            .Sum();\n        Console.WriteLine(sum);\n    }\n}\n`,
  golang: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    in := bufio.NewReader(os.Stdin)\n    var value int64\n    var sum int64\n    for {\n        _, err := fmt.Fscan(in, &value)\n        if err != nil {\n            break\n        }\n        sum += value\n    }\n    fmt.Println(sum)\n}\n`,
  rust: `use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    let sum: i64 = input\n        .split_whitespace()\n        .filter_map(|part| part.parse::<i64>().ok())\n        .sum();\n    println!("{}", sum);\n}\n`,
};

const seedChallenges = async () => {
  const challengeCount = await Challenge.countDocuments();
  if (challengeCount > 0) {
    return;
  }

  await Challenge.create({
    title: "Sum of Integers",
    slug: "sum-of-integers",
    difficulty: "easy",
    problemStatement:
      "Given a line of space-separated integers, print the sum of all integers.",
    inputSpecification:
      "One line containing zero or more space-separated integers.",
    outputSpecification:
      "Print exactly one integer representing the sum of the input values.",
    constraintsText:
      "The number of integers can be up to 10^5. Each integer fits in signed 64-bit range.",
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    publicTestCases: [
      {
        input: "1 2 3 4\n",
        expectedOutput: "10\n",
        explanation: "1 + 2 + 3 + 4 = 10",
      },
      {
        input: "-5 2 8\n",
        expectedOutput: "5\n",
        explanation: "-5 + 2 + 8 = 5",
      },
    ],
    hiddenTestCases: [
      {
        input: "1000000 2500000 3500000\n",
        expectedOutput: "7000000\n",
      },
      {
        input: "\n",
        expectedOutput: "0\n",
      },
      {
        input: "7\n",
        expectedOutput: "7\n",
      },
    ],
    starterCode: defaultStarterCode,
  });

  console.log("Seeded default challenge set.");
};

module.exports = { seedChallenges };
