# Grammar String Deriver

An interactive, educational web application for Theory of Computation (TOC) that verifies whether a target string can be generated from a right-linear regular grammar within a maximum number of derivation steps $N$.

## Features

- **Right-Linear Regular Grammar Support**: Supports rules of the form $A \to aB$, $A \to a$, $A \to \varepsilon$ using `→` or `->`, with pipe `|` alternatives.
- **Bounded BFS Derivation Algorithm**: Guarantees finding the shortest derivation sequence, strictly bounded by depth $N$, with cycle prevention and terminal prefix pruning.
- **Distinguished Case Validation**:
  - `✓ String Generated` with derivation sequence, steps used, and visual path.
  - `✗ String Cannot Be Generated Within N Steps` with clear indication if the target may require more than $N$ steps, or if the grammar search space is exhausted.
- **Interactive Derivation Tree**: Pan, zoom, fit to screen, expand/collapse nodes, glowing winning path in emerald green, rule edge labels, and SVG export.
- **Syntax Parse Tree**: Classic formal parse tree showing symbol replacements from the start symbol down to terminal leaves.
- **Step-by-Step Derivation Panel**: Visual transition cards ($S \downarrow aA \downarrow ab$) with play/pause animations and step scrubber.
- **Grammar Analysis**: Real-time extraction of variables $V$, alphabet $\Sigma$, production count, formal 4-tuple specification, and friendly validation error alerts.
- **Educational Guide**: "How It Works" modal explaining regular grammars, derivations, bounded BFS, and prefix pruning.

## How to Run

1. Start the local server:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
