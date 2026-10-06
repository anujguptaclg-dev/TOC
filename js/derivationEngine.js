/**
 * BFS Derivation Engine for Regular Grammars
 * Performs bounded leftmost derivation search to find the shortest derivation sequence.
 * Enforces strict N-step limit, tracks visited states, applies prefix pruning,
 * and generates the complete exploration tree for visualization.
 */

import { isEpsilonSymbol } from './grammarParser.js';

export class DerivationEngine {
  /**
   * Run BFS Derivation Search
   * @param {Object} grammar Parsed grammar object from GrammarParser
   * @param {string} rawTargetString The target string to derive (can be 'ε' or empty)
   * @param {number} maxSteps Maximum derivation steps N (>= 1)
   * @param {Object} options Configuration options
   * @returns {Object} Complete derivation result
   */
  static derive(grammar, rawTargetString, maxSteps, options = {}) {
    const startTime = performance.now();
    const maxNodesCap = options.maxNodesCap || 15000; // Browser safety guard

    // Normalize target string (convert 'ε', 'eps', etc. to empty string "")
    const targetString = isEpsilonSymbol(rawTargetString) ? '' : (rawTargetString ?? '').trim();
    const startSymbol = grammar.startSymbol || 'S';
    const N = Math.max(1, parseInt(maxSteps, 10) || 1);

    // BFS Data Structures
    let nodeIdCounter = 0;
    const rootNode = {
      id: `node_${nodeIdCounter++}`,
      sententialForm: startSymbol,
      displayForm: startSymbol,
      depth: 0,
      ruleApplied: null,
      parentId: null,
      children: [],
      status: 'root', // 'root' | 'in_progress' | 'success' | 'pruned' | 'max_depth' | 'dead_end'
      pruneReason: null,
      isSuccessPath: false
    };

    const allNodesMap = new Map();
    allNodesMap.set(rootNode.id, rootNode);

    // Check if start symbol is already the target string without any derivation (0 steps, if start symbol matches target)
    // In grammar derivation, at least 1 production rule is applied from start symbol S.
    // However, if target is S and 0 steps allowed:
    let successNode = null;
    let totalNodesExplored = 0;
    let highestDepthReached = 0;
    let hasViableFrontierAtMaxDepth = false;
    let searchSpaceExhausted = false;
    let cappedDueToSafety = false;

    // Queue entries: { node, sententialForm, depth }
    const queue = [{ node: rootNode, sententialForm: startSymbol, depth: 0 }];
    
    // Visited states: Map from sententialForm string to minimum depth seen
    const visitedMinDepth = new Map();
    visitedMinDepth.set(startSymbol, 0);

    const nonTerminalsSet = new Set(grammar.nonTerminals);

    while (queue.length > 0) {
      if (totalNodesExplored >= maxNodesCap) {
        cappedDueToSafety = true;
        break;
      }

      const current = queue.shift();
      totalNodesExplored++;
      highestDepthReached = Math.max(highestDepthReached, current.depth);

      const currForm = current.sententialForm;
      const currDepth = current.depth;
      const currNode = current.node;

      // Check if current form is purely terminals and matches target string
      const leftmostNt = findLeftmostNonTerminal(currForm, nonTerminalsSet);

      if (!leftmostNt) {
        // Pure terminals
        if (currForm === targetString) {
          currNode.status = 'success';
          successNode = currNode;
          break; // Shortest derivation found via BFS!
        } else {
          // Pure terminals but does not match target
          currNode.status = 'dead_end';
          currNode.pruneReason = `Terminated with pure terminals "${currForm || 'ε'}" ≠ "${targetString || 'ε'}"`;
          continue;
        }
      }

      // If we've reached the maximum steps N, we cannot expand further
      if (currDepth >= N) {
        currNode.status = 'max_depth';
        currNode.pruneReason = `Reached maximum depth N = ${N}`;
        // Check if this frontier node was still potentially viable
        const terminalPrefix = getTerminalPrefix(currForm, nonTerminalsSet);
        if (targetString.startsWith(terminalPrefix)) {
          hasViableFrontierAtMaxDepth = true;
        }
        continue;
      }

      // Expand current node using all production rules for the leftmost non-terminal
      const rules = grammar.rulesByLhs.get(leftmostNt.symbol) || [];

      if (rules.length === 0) {
        // Dead end: non-terminal has no production rules
        currNode.status = 'dead_end';
        currNode.pruneReason = `No production rules for non-terminal "${leftmostNt.symbol}"`;
        continue;
      }

      // Generate next sentential forms
      for (const rule of rules) {
        const nextDepth = currDepth + 1;
        highestDepthReached = Math.max(highestDepthReached, nextDepth);

        // Replace leftmost non-terminal with rule.rhs
        const nextForm = applyRuleLeftmost(currForm, leftmostNt.index, leftmostNt.symbol.length, rule.rhs);

        // Child node representation
        const childNode = {
          id: `node_${nodeIdCounter++}`,
          sententialForm: nextForm,
          displayForm: nextForm === '' ? 'ε' : nextForm,
          depth: nextDepth,
          ruleApplied: rule,
          parentId: currNode.id,
          children: [],
          status: 'in_progress',
          pruneReason: null,
          isSuccessPath: false
        };

        currNode.children.push(childNode);
        allNodesMap.set(childNode.id, childNode);

        // Check immediate match: is it pure terminals matching target?
        const childLeftmostNt = findLeftmostNonTerminal(nextForm, nonTerminalsSet);
        if (!childLeftmostNt && nextForm === targetString) {
          childNode.status = 'success';
          successNode = childNode;
          totalNodesExplored++;
          break; // Shortest derivation found!
        }

        // Pruning checks for Regular Grammar:
        // 1. Terminal prefix check: in right-linear grammars, terminals generated so far cannot be altered.
        const childTermPrefix = getTerminalPrefix(nextForm, nonTerminalsSet);
        
        let shouldPrune = false;
        let pruneMsg = '';

        if (!targetString.startsWith(childTermPrefix)) {
          shouldPrune = true;
          pruneMsg = `Prefix mismatch: "${childTermPrefix}" is not a prefix of target "${targetString || 'ε'}"`;
        } else if (childTermPrefix.length > targetString.length) {
          shouldPrune = true;
          pruneMsg = `Length exceeded: terminal prefix "${childTermPrefix}" (${childTermPrefix.length}) > target (${targetString.length})`;
        } else if (!childLeftmostNt && nextForm !== targetString) {
          shouldPrune = true;
          pruneMsg = `Pure terminal mismatch: "${nextForm || 'ε'}" ≠ "${targetString || 'ε'}"`;
        }

        if (shouldPrune) {
          childNode.status = 'pruned';
          childNode.pruneReason = pruneMsg;
          continue;
        }

        // Visited state check (cycle prevention):
        // If we have already visited this exact sentential form at an equal or lower depth, avoid duplicate work
        if (visitedMinDepth.has(nextForm) && visitedMinDepth.get(nextForm) <= nextDepth) {
          childNode.status = 'pruned';
          childNode.pruneReason = `Duplicate state already explored at depth ${visitedMinDepth.get(nextForm)}`;
          continue;
        }
        visitedMinDepth.set(nextForm, nextDepth);

        // Enqueue if within bounds
        if (nextDepth < N) {
          queue.push({
            node: childNode,
            sententialForm: nextForm,
            depth: nextDepth
          });
        } else {
          // Reached depth N
          childNode.status = 'max_depth';
          childNode.pruneReason = `Reached maximum depth limit N = ${N}`;
          if (targetString.startsWith(childTermPrefix)) {
            hasViableFrontierAtMaxDepth = true;
          }
        }
      }

      if (successNode) {
        break;
      }
    }

    // If search stopped without success:
    if (!successNode && queue.length === 0 && !cappedDueToSafety) {
      searchSpaceExhausted = true;
    }

    // Reconstruct derivation path if success
    const derivationSequence = [];
    const derivationSteps = [];

    if (successNode) {
      let curr = successNode;
      const pathNodes = [];

      while (curr) {
        curr.isSuccessPath = true;
        pathNodes.unshift(curr);
        curr = curr.parentId ? allNodesMap.get(curr.parentId) : null;
      }

      for (let i = 0; i < pathNodes.length; i++) {
        const node = pathNodes[i];
        derivationSequence.push(node.displayForm);

        derivationSteps.push({
          step: i,
          sententialForm: node.displayForm,
          rawForm: node.sententialForm,
          depth: node.depth,
          rule: node.ruleApplied ? node.ruleApplied.display : null,
          ruleObject: node.ruleApplied,
          actionDescription: i === 0 ? `Start symbol "${startSymbol}"` : `Apply rule ${node.ruleApplied.display}`
        });
      }
    }

    const executionTimeMs = (performance.now() - startTime).toFixed(2);

    return {
      success: !!successNode,
      targetString,
      displayTarget: targetString === '' ? 'ε' : targetString,
      startSymbol,
      maxSteps: N,
      stepsUsed: successNode ? successNode.depth : null,
      highestDepthSearched: highestDepthReached,
      totalNodesExplored,
      derivationSequence,
      derivationSteps,
      derivationString: derivationSequence.join(' ⇒ '),
      rootTree: rootNode,
      allNodesCount: allNodesMap.size,
      hasViableFrontierAtMaxDepth,
      searchSpaceExhausted,
      cappedDueToSafety,
      executionTimeMs,
      // Pedagogical explanation message
      conclusionMessage: getConclusionMessage({
        success: !!successNode,
        targetString,
        stepsUsed: successNode ? successNode.depth : null,
        maxSteps: N,
        highestDepthReached,
        hasViableFrontierAtMaxDepth,
        searchSpaceExhausted,
        cappedDueToSafety
      })
    };
  }
}

/**
 * Finds the leftmost non-terminal symbol in a sentential form
 */
function findLeftmostNonTerminal(form, nonTerminalsSet) {
  if (!form) return null;

  for (let i = 0; i < form.length; i++) {
    // Check multi-character non-terminals or single character
    for (const nt of nonTerminalsSet) {
      if (form.startsWith(nt, i)) {
        return { symbol: nt, index: i };
      }
    }
    // Also fallback to uppercase ASCII
    if (/^[A-Z]$/.test(form[i])) {
      return { symbol: form[i], index: i };
    }
  }

  return null;
}

/**
 * Extracts the leading terminal prefix before the first non-terminal
 */
function getTerminalPrefix(form, nonTerminalsSet) {
  if (!form) return '';
  const leftmostNt = findLeftmostNonTerminal(form, nonTerminalsSet);
  if (!leftmostNt) {
    return form; // entirely terminals
  }
  return form.slice(0, leftmostNt.index);
}

/**
 * Replaces the leftmost non-terminal in sentential form with the production rule's RHS
 */
function applyRuleLeftmost(form, index, length, rhs) {
  const before = form.slice(0, index);
  const after = form.slice(index + length);
  return before + (rhs || '') + after;
}

/**
 * Generates clear, educationally precise conclusion message for students
 */
function getConclusionMessage(info) {
  const targetLabel = info.targetString === '' ? 'ε (empty string)' : `"${info.targetString}"`;

  if (info.success) {
    return `✓ String Generated: The target string ${targetLabel} was successfully derived in ${info.stepsUsed} step${info.stepsUsed === 1 ? '' : 's'} (within the limit of N = ${info.maxSteps}).`;
  }

  if (info.cappedDueToSafety) {
    return `✗ Search Space Budget Reached: Exploration reached safety limit of nodes to preserve browser responsiveness. Try increasing maximum steps moderately or simplifying grammar rules.`;
  }

  if (info.hasViableFrontierAtMaxDepth) {
    return `✗ String Not Generated Within N Steps: Derivation search reached maximum allowed depth (N = ${info.maxSteps}) without finding ${targetLabel}. The target may require more than ${info.maxSteps} steps.`;
  }

  if (info.searchSpaceExhausted) {
    return `✗ Impossible String: All possible derivation paths from start symbol were fully explored (exhausted at depth ${info.highestDepthReached}) without reaching target ${targetLabel}. The string cannot be generated by this regular grammar.`;
  }

  return `✗ String Not Generated Within ${info.maxSteps} Steps: The target ${targetLabel} could not be derived within ${info.maxSteps} steps.`;
}
