/**
 * Curated Grammar Presets & Examples
 */

export const GRAMMAR_EXAMPLES = [
  {
    id: 'default_prompt_example',
    name: 'Prompt Example: S → aA | bB (Target "ab")',
    description: 'The standard regular grammar from the specification. Verifies target "ab" in 2 steps (S ⇒ aA ⇒ ab).',
    grammarText: `S → aA | bB\nA → aS | b\nB → bS | a`,
    startSymbol: 'S',
    targetString: 'ab',
    maxSteps: 3
  },
  {
    id: 'single_terminal_rule',
    name: 'Direct Terminal Rule: S → aA | bB | a',
    description: 'Includes direct terminal production S → a. Target "a" derives in 1 step.',
    grammarText: `S → aA | bB | a\nA → aS | b\nB → bS | a`,
    startSymbol: 'S',
    targetString: 'a',
    maxSteps: 3
  },
  {
    id: 'even_as',
    name: 'Even Number of \'a\'s with Epsilon',
    description: 'Recognizes strings with an even number of \'a\'s using epsilon transition S → ε.',
    grammarText: `S → aA | bS | ε\nA → aS | bA`,
    startSymbol: 'S',
    targetString: 'baaba',
    maxSteps: 6
  },
  {
    id: 'binary_01',
    name: 'Binary Strings Ending in "01"',
    description: 'Models regular expression (0+1)*01 over alphabet {0, 1}.',
    grammarText: `S → 0S | 1S | 0A\nA → 1`,
    startSymbol: 'S',
    targetString: '1001',
    maxSteps: 5
  },
  {
    id: 'epsilon_target',
    name: 'Empty String (ε) Derivation',
    description: 'Demonstrates empty string derivation when grammar accepts the null string.',
    grammarText: `S → aA | ε\nA → bS`,
    startSymbol: 'S',
    targetString: 'ε',
    maxSteps: 2
  },
  {
    id: 'depth_exceeded_example',
    name: 'Exceeds N Steps Test: Target "aabab"',
    description: 'Target requires 5 steps, but N is set to 3. Demonstrates the "May require more than N steps" case.',
    grammarText: `S → aA | bB\nA → aS | b\nB → bS | a`,
    startSymbol: 'S',
    targetString: 'aabab',
    maxSteps: 3
  },
  {
    id: 'impossible_example',
    name: 'Impossible Target Test: Target "c"',
    description: 'Target contains character "c" not in alphabet {a, b}. Explores and detects exhaustion.',
    grammarText: `S → aA | bB\nA → aS | b\nB → bS | a`,
    startSymbol: 'S',
    targetString: 'c',
    maxSteps: 3
  }
];
