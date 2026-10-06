/**
 * Grammar Validator Module
 * Performs structural and semantic checks on the parsed grammar before derivation.
 */

export class GrammarValidator {
  /**
   * Validate grammar, inputs, and constraints
   * @param {Object} parsedGrammar 
   * @param {string} targetString 
   * @param {number} maxSteps 
   * @returns {Object} Validation report { isValid: boolean, errors: string[], warnings: string[] }
   */
  static validate(parsedGrammar, targetString, maxSteps) {
    const errors = [];
    const warnings = [];

    // 1. Check if grammar text was provided
    if (!parsedGrammar || parsedGrammar.productions.length === 0) {
      if (parsedGrammar && parsedGrammar.errors.length > 0) {
        for (const err of parsedGrammar.errors) {
          errors.push(err.message);
        }
      } else {
        errors.push('The grammar is empty. Please enter at least one production rule (e.g., S → aA | b).');
      }
      return { isValid: false, errors, warnings };
    }

    // Include parser errors
    for (const err of parsedGrammar.errors) {
      errors.push(err.message);
    }

    // Include parser warnings
    for (const w of parsedGrammar.warnings) {
      warnings.push(w.message);
    }

    // 2. Start symbol check
    const startSym = parsedGrammar.startSymbol;
    if (!startSym) {
      errors.push('Start symbol is required. Please specify a start symbol (e.g., "S").');
    } else if (!parsedGrammar.rulesByLhs.has(startSym)) {
      errors.push(`Start symbol "${startSym}" has no production rules defined in the grammar.`);
    }

    // 3. Undefined non-terminals check
    const definedLhs = new Set(parsedGrammar.rulesByLhs.keys());
    const referencedNt = new Set();

    for (const prod of parsedGrammar.productions) {
      if (prod.nextNonTerminal && !definedLhs.has(prod.nextNonTerminal)) {
        referencedNt.add(prod.nextNonTerminal);
      }
      for (const nt of prod.nonTerminalsInRhs) {
        if (!definedLhs.has(nt)) {
          referencedNt.add(nt);
        }
      }
    }

    if (referencedNt.size > 0) {
      const undefinedList = Array.from(referencedNt).join(', ');
      warnings.push(`Undefined non-terminal(s) referenced on Right-Hand Side without rules: [ ${undefinedList} ]. Any derivation path entering these symbols will terminate as a dead end.`);
    }

    // 4. Reachability analysis from start symbol
    if (startSym && definedLhs.has(startSym)) {
      const reachable = new Set([startSym]);
      const queue = [startSym];

      while (queue.length > 0) {
        const curr = queue.shift();
        const prods = parsedGrammar.rulesByLhs.get(curr) || [];
        for (const prod of prods) {
          if (prod.nextNonTerminal && !reachable.has(prod.nextNonTerminal)) {
            reachable.add(prod.nextNonTerminal);
            queue.push(prod.nextNonTerminal);
          }
          for (const nt of prod.nonTerminalsInRhs) {
            if (!reachable.has(nt)) {
              reachable.add(nt);
              queue.push(nt);
            }
          }
        }
      }

      const unreachable = Array.from(definedLhs).filter(nt => !reachable.has(nt));
      if (unreachable.length > 0) {
        warnings.push(`Unreachable non-terminal(s) from start symbol "${startSym}": [ ${unreachable.join(', ')} ]. They will not be used in derivations.`);
      }
    }

    // 5. Right-linear regular grammar compliance check
    const nonLinearRules = parsedGrammar.productions.filter(p => !p.isRightLinear);
    if (nonLinearRules.length > 0) {
      const examples = nonLinearRules.slice(0, 3).map(p => `"${p.display}"`).join(', ');
      warnings.push(`Grammar contains rule(s) not in standard right-linear form (A → aB, A → a, or A → ε), such as: ${examples}. Leftmost derivation will still be used.`);
    }

    // 6. Max Steps (N) check
    if (maxSteps === undefined || maxSteps === null || isNaN(maxSteps)) {
      errors.push('Maximum steps (N) must be a valid number.');
    } else {
      const n = Number(maxSteps);
      if (!Number.isInteger(n)) {
        errors.push('Maximum steps (N) must be an integer.');
      } else if (n <= 0) {
        errors.push('Maximum steps (N) must be greater than 0 (minimum 1 step).');
      } else if (n > 30) {
        warnings.push(`Maximum steps (N = ${n}) is high. To avoid performance slowdowns with large branching factors, consider testing with N ≤ 15 first.`);
      }
    }

    // 7. Target string alphabet check
    if (targetString !== undefined && targetString !== null && targetString !== '') {
      const targetChars = Array.from(targetString);
      const grammarTerminals = new Set(parsedGrammar.terminals);
      const missingChars = targetChars.filter(c => !grammarTerminals.has(c));

      if (missingChars.length > 0) {
        const uniqueMissing = Array.from(new Set(missingChars)).join(', ');
        warnings.push(`Target string contains character(s) [ ${uniqueMissing} ] not present in the grammar terminals { ${parsedGrammar.terminals.join(', ')} }. This string cannot be derived.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
