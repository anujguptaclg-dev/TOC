/**
 * Grammar Parser Module for Regular Grammars
 * Supports Right-Linear Regular Grammars:
 *   A -> aB
 *   A -> a
 *   A -> ε (or eps, epsilon, ^, or empty)
 * Also supports generalized right-linear rules where terminal prefix has length >= 0.
 */

export class GrammarParser {
  /**
   * Parse raw grammar string into structured grammar definition
   * @param {string} rawText 
   * @param {string} userStartSymbol 
   * @returns {Object} Parsed grammar object
   */
  static parse(rawText, userStartSymbol = 'S') {
    const lines = rawText.split('\n');
    const rawProductions = [];
    const nonTerminalsSet = new Set();
    const terminalsSet = new Set();
    const errors = [];
    const warnings = [];

    // Pre-pass: Identify explicitly defined LHS symbols as non-terminals
    const detectedLhs = new Set();
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      // Remove comments (// or #)
      const commentIdx = line.search(/(\/\/|#)/);
      if (commentIdx !== -1) {
        line = line.substring(0, commentIdx).trim();
      }
      if (!line) continue;

      // Match LHS -> RHS or LHS → RHS or LHS := RHS
      const arrowMatch = line.match(/^([^→\->:=]+)\s*(?:→|->|:=|:)\s*(.*)$/);
      if (arrowMatch) {
        const lhs = arrowMatch[1].trim();
        if (lhs) {
          detectedLhs.add(lhs);
          nonTerminalsSet.add(lhs);
        }
      }
    }

    if (userStartSymbol && userStartSymbol.trim()) {
      nonTerminalsSet.add(userStartSymbol.trim());
    }

    let prodIdCounter = 1;

    // Second pass: parse rules and alternatives
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      let line = lines[i].trim();
      const commentIdx = line.search(/(\/\/|#)/);
      if (commentIdx !== -1) {
        line = line.substring(0, commentIdx).trim();
      }
      if (!line) continue;

      const arrowMatch = line.match(/^([^→\->:=]+)\s*(?:→|->|:=|:)\s*(.*)$/);
      if (!arrowMatch) {
        errors.push({
          line: lineNum,
          message: `Line ${lineNum}: Invalid rule format. Expected "LHS -> RHS", found "${line}".`
        });
        continue;
      }

      const lhs = arrowMatch[1].trim();
      const rhsPart = arrowMatch[2].trim();

      if (!lhs) {
        errors.push({
          line: lineNum,
          message: `Line ${lineNum}: Missing Left-Hand Side (LHS) non-terminal.`
        });
        continue;
      }

      // Check LHS validity (in regular grammars, LHS must be a single non-terminal)
      if (/\s/.test(lhs) || lhs.length > 3) {
        warnings.push({
          line: lineNum,
          message: `Line ${lineNum}: LHS "${lhs}" is unusually long or contains whitespace.`
        });
      }

      // Split RHS by '|' to support alternatives
      const alternatives = rhsPart.split('|').map(alt => alt.trim());

      for (let alt of alternatives) {
        const isEpsilon = isEpsilonSymbol(alt);
        const effectiveRhs = isEpsilon ? '' : alt;

        // Parse symbols in RHS
        // Find if there is a non-terminal at the end
        const parsedRhs = parseRightLinearRhs(effectiveRhs, detectedLhs);

        // Collect terminals
        for (const ch of parsedRhs.terminals) {
          if (!isEpsilonSymbol(ch) && ch !== '') {
            terminalsSet.add(ch);
          }
        }
        if (parsedRhs.nextNonTerminal) {
          nonTerminalsSet.add(parsedRhs.nextNonTerminal);
        }

        const prod = {
          id: `p${prodIdCounter++}`,
          line: lineNum,
          lhs: lhs,
          rhs: effectiveRhs,
          rawRhs: alt || 'ε',
          display: `${lhs} → ${alt || 'ε'}`,
          isEpsilon: isEpsilon,
          terminals: parsedRhs.terminals,
          nextNonTerminal: parsedRhs.nextNonTerminal,
          isRightLinear: parsedRhs.isRightLinear,
          structureType: parsedRhs.structureType, // 'terminal_with_nt', 'pure_terminal', 'epsilon', 'general_cfg'
          nonTerminalsInRhs: parsedRhs.allNonTerminals
        };

        rawProductions.push(prod);
      }
    }

    const startSymbol = (userStartSymbol && userStartSymbol.trim()) ? userStartSymbol.trim() : (rawProductions[0]?.lhs || 'S');

    // Group productions by LHS for quick lookup during BFS derivation
    const rulesByLhs = new Map();
    for (const prod of rawProductions) {
      if (!rulesByLhs.has(prod.lhs)) {
        rulesByLhs.set(prod.lhs, []);
      }
      rulesByLhs.get(prod.lhs).push(prod);
    }

    return {
      startSymbol,
      nonTerminals: Array.from(nonTerminalsSet),
      terminals: Array.from(terminalsSet).sort(),
      productions: rawProductions,
      rulesByLhs,
      errors,
      warnings,
      isValidFormat: errors.length === 0 && rawProductions.length > 0
    };
  }
}

/**
 * Check if a symbol represents epsilon / empty string
 */
export function isEpsilonSymbol(sym) {
  if (!sym || sym === '' || sym === '""' || sym === "''") return true;
  const s = sym.trim().toLowerCase();
  return s === 'ε' || s === 'ϵ' || s === 'eps' || s === 'epsilon' || s === '^' || s === 'λ' || s === 'lambda';
}

/**
 * Analyzes RHS of a production rule to check if it conforms to right-linear grammar
 * Format of right-linear: w B or w (where w is a string of terminals, B is a non-terminal)
 */
function parseRightLinearRhs(rhs, detectedLhs) {
  if (!rhs || isEpsilonSymbol(rhs)) {
    return {
      terminals: '',
      nextNonTerminal: null,
      isRightLinear: true,
      structureType: 'epsilon',
      allNonTerminals: []
    };
  }

  // Scan characters or tokens
  // If the last character (or token) matches a known non-terminal or uppercase letter
  const allNt = [];
  const chars = Array.from(rhs);

  // Check uppercase symbols or detected LHS symbols
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (detectedLhs.has(c) || /^[A-Z]$/.test(c)) {
      allNt.push({ symbol: c, index: i });
    }
  }

  if (allNt.length === 0) {
    // Pure terminals: A -> a or A -> ab
    return {
      terminals: rhs,
      nextNonTerminal: null,
      isRightLinear: true,
      structureType: 'pure_terminal',
      allNonTerminals: []
    };
  }

  if (allNt.length === 1 && allNt[0].index === chars.length - 1) {
    // Exactly one non-terminal and it is at the very end: A -> aB or A -> abB or A -> B
    const terminals = rhs.slice(0, rhs.length - 1);
    return {
      terminals: terminals,
      nextNonTerminal: allNt[0].symbol,
      isRightLinear: true,
      structureType: 'terminal_with_nt',
      allNonTerminals: [allNt[0].symbol]
    };
  }

  // If there are multiple non-terminals or non-terminal not at the end
  return {
    terminals: rhs.replace(/[A-Z]/g, ''),
    nextNonTerminal: allNt[allNt.length - 1].symbol,
    isRightLinear: false,
    structureType: 'general_cfg',
    allNonTerminals: allNt.map(n => n.symbol)
  };
}
