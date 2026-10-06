/**
 * Main Application Controller for Grammar String Deriver
 */

import { GrammarParser, isEpsilonSymbol } from './grammarParser.js';
import { GrammarValidator } from './grammarValidator.js';
import { DerivationEngine } from './derivationEngine.js';
import { TreeVisualizer } from './treeVisualizer.js';
import { ParseTreeVisualizer } from './parseTreeVisualizer.js';
import { GRAMMAR_EXAMPLES } from './examples.js';

class App {
  constructor() {
    this.treeVisualizer = null;
    this.parseTreeVisualizer = null;
    this.currentResult = null;
    this.currentDerivationStepIndex = 0;
    this.animationTimer = null;

    this.initElements();
    this.initVisualizers();
    this.bindEvents();
    this.populateExamples();

    // Load default example on startup
    this.loadExample(GRAMMAR_EXAMPLES[0]);
    // Auto-run derivation on startup so user sees instant working results!
    this.runDerivation();
  }

  initElements() {
    // Inputs
    this.grammarInput = document.getElementById('grammar-rules');
    this.startSymbolInput = document.getElementById('start-symbol');
    this.targetStringInput = document.getElementById('target-string');
    this.maxStepsInput = document.getElementById('max-steps');
    this.examplesSelect = document.getElementById('preset-select');

    // Grammar stats badges
    this.badgeNonTerminals = document.getElementById('badge-non-terminals');
    this.badgeTerminals = document.getElementById('badge-terminals');
    this.badgeProductions = document.getElementById('badge-productions');

    // Buttons
    this.btnDerive = document.getElementById('btn-derive');
    this.btnClear = document.getElementById('btn-clear');
    this.btnLoadExample = document.getElementById('btn-load-example');
    this.btnCopyDerivation = document.getElementById('btn-copy-derivation');
    this.btnHowItWorks = document.getElementById('btn-how-it-works');
    this.modalHowItWorks = document.getElementById('modal-how-it-works');
    this.modalClose = document.getElementById('modal-close');

    // Alert Banner
    this.alertContainer = document.getElementById('alert-container');

    // Result Elements
    this.resultCard = document.getElementById('result-card');
    this.resultStatusBadge = document.getElementById('result-status-badge');
    this.resultTargetVal = document.getElementById('result-target-val');
    this.resultStepsVal = document.getElementById('result-steps-val');
    this.resultMaxStepsVal = document.getElementById('result-max-steps-val');
    this.resultDepthVal = document.getElementById('result-depth-val');
    this.resultNodesVal = document.getElementById('result-nodes-val');
    this.resultExplanation = document.getElementById('result-explanation');
    this.derivationStringDisplay = document.getElementById('derivation-string-display');

    // Step by step elements
    this.stepSequenceList = document.getElementById('step-sequence-list');
    this.btnStepPrev = document.getElementById('btn-step-prev');
    this.btnStepNext = document.getElementById('btn-step-next');
    this.btnStepPlay = document.getElementById('btn-step-play');
    this.stepSlider = document.getElementById('step-slider');
    this.stepCounterLabel = document.getElementById('step-counter-label');

    // Formal spec tab
    this.grammarSpecContent = document.getElementById('grammar-spec-content');

    // Tabs
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
  }

  initVisualizers() {
    const treeContainer = document.getElementById('derivation-tree-container');
    this.treeVisualizer = new TreeVisualizer(treeContainer);

    const parseTreeContainer = document.getElementById('parse-tree-container');
    this.parseTreeVisualizer = new ParseTreeVisualizer(parseTreeContainer);
  }

  bindEvents() {
    // Primary actions
    this.btnDerive.addEventListener('click', () => this.runDerivation());
    this.btnClear.addEventListener('click', () => this.clearInputs());
    this.btnLoadExample.addEventListener('click', () => this.loadExample(GRAMMAR_EXAMPLES[0]));

    // Example dropdown change
    this.examplesSelect.addEventListener('change', (e) => {
      const selected = GRAMMAR_EXAMPLES.find(ex => ex.id === e.target.value);
      if (selected) {
        this.loadExample(selected);
        this.runDerivation();
      }
    });

    // Quick symbol insertion buttons for grammar textarea
    document.querySelectorAll('.insert-symbol-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const sym = btn.getAttribute('data-symbol');
        this.insertTextAtCursor(this.grammarInput, sym);
        this.updateGrammarStats();
      });
    });

    // Quick target empty button
    document.getElementById('btn-target-epsilon')?.addEventListener('click', () => {
      this.targetStringInput.value = 'ε';
    });

    // Quick step presets
    document.querySelectorAll('.step-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-steps');
        this.maxStepsInput.value = val;
      });
    });

    // Step +/- buttons
    document.getElementById('btn-step-dec')?.addEventListener('click', () => {
      const v = Math.max(1, parseInt(this.maxStepsInput.value, 10) - 1 || 1);
      this.maxStepsInput.value = v;
    });
    document.getElementById('btn-step-inc')?.addEventListener('click', () => {
      const v = Math.min(25, (parseInt(this.maxStepsInput.value, 10) || 1) + 1);
      this.maxStepsInput.value = v;
    });

    // Real-time grammar stats update
    this.grammarInput.addEventListener('input', () => this.updateGrammarStats());
    this.startSymbolInput.addEventListener('input', () => this.updateGrammarStats());

    // Keyboard shortcuts: Ctrl+Enter to derive
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runDerivation();
      }
    });

    // Copy derivation string
    this.btnCopyDerivation.addEventListener('click', () => {
      if (!this.currentResult || !this.currentResult.derivationString) return;
      navigator.clipboard.writeText(this.currentResult.derivationString).then(() => {
        const originalText = this.btnCopyDerivation.innerHTML;
        this.btnCopyDerivation.innerHTML = '<span>✓ Copied!</span>';
        setTimeout(() => {
          this.btnCopyDerivation.innerHTML = originalText;
        }, 1800);
      });
    });

    // Tabs switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Step-by-step interactive player
    this.btnStepPrev.addEventListener('click', () => this.prevDerivationStep());
    this.btnStepNext.addEventListener('click', () => this.nextDerivationStep());
    this.btnStepPlay.addEventListener('click', () => this.toggleDerivationPlay());
    this.stepSlider.addEventListener('input', (e) => {
      this.goToDerivationStep(parseInt(e.target.value, 10));
    });

    // How It Works Modal
    this.btnHowItWorks.addEventListener('click', () => {
      this.modalHowItWorks.classList.remove('hidden');
    });
    this.modalClose.addEventListener('click', () => {
      this.modalHowItWorks.classList.add('hidden');
    });
    this.modalHowItWorks.addEventListener('click', (e) => {
      if (e.target === this.modalHowItWorks) {
        this.modalHowItWorks.classList.add('hidden');
      }
    });
  }

  insertTextAtCursor(input, text) {
    input.focus();
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = input.value;
    input.value = val.substring(0, start) + text + val.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
  }

  switchTab(tabId) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    // Re-fit tree if switching to tree tab
    if (tabId === 'tab-derivation-tree' && this.treeVisualizer) {
      setTimeout(() => this.treeVisualizer.fitToScreen(), 50);
    } else if (tabId === 'tab-parse-tree' && this.parseTreeVisualizer) {
      setTimeout(() => this.parseTreeVisualizer.fitToScreen(), 50);
    }
  }

  populateExamples() {
    this.examplesSelect.innerHTML = '';
    for (const ex of GRAMMAR_EXAMPLES) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.name;
      this.examplesSelect.appendChild(opt);
    }
  }

  loadExample(example) {
    this.grammarInput.value = example.grammarText;
    this.startSymbolInput.value = example.startSymbol;
    this.targetStringInput.value = example.targetString;
    this.maxStepsInput.value = example.maxSteps;
    this.examplesSelect.value = example.id;
    this.clearAlerts();
    this.updateGrammarStats();
  }

  clearInputs() {
    this.grammarInput.value = '';
    this.startSymbolInput.value = 'S';
    this.targetStringInput.value = '';
    this.maxStepsInput.value = '3';
    this.clearAlerts();
    this.updateGrammarStats();
    this.resultCard.classList.add('hidden');
  }

  updateGrammarStats() {
    const raw = this.grammarInput.value;
    const startSym = this.startSymbolInput.value.trim() || 'S';
    const parsed = GrammarParser.parse(raw, startSym);

    this.badgeNonTerminals.textContent = parsed.nonTerminals.length > 0 ? parsed.nonTerminals.join(', ') : '—';
    this.badgeTerminals.textContent = parsed.terminals.length > 0 ? parsed.terminals.join(', ') : '—';
    this.badgeProductions.textContent = parsed.productions.length;
  }

  clearAlerts() {
    this.alertContainer.innerHTML = '';
  }

  showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert-banner alert-${type}`;

    const icon = type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️';
    alert.innerHTML = `
      <span class="alert-icon">${icon}</span>
      <div class="alert-message">${message}</div>
      <button class="alert-close">&times;</button>
    `;

    alert.querySelector('.alert-close').addEventListener('click', () => {
      alert.remove();
    });

    this.alertContainer.appendChild(alert);
  }

  runDerivation() {
    this.clearAlerts();
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
      this.btnStepPlay.textContent = '▶ Play';
    }

    const rawGrammar = this.grammarInput.value;
    const startSymbol = this.startSymbolInput.value.trim() || 'S';
    const targetString = this.targetStringInput.value;
    const maxSteps = parseInt(this.maxStepsInput.value, 10);

    // 1. Parse Grammar
    const parsedGrammar = GrammarParser.parse(rawGrammar, startSymbol);

    // 2. Validate Grammar & Inputs
    const validation = GrammarValidator.validate(parsedGrammar, targetString, maxSteps);

    // Display warnings
    for (const warn of validation.warnings) {
      this.showAlert('warning', warn);
    }

    // Display errors
    if (!validation.isValid) {
      for (const err of validation.errors) {
        this.showAlert('error', err);
      }
      return;
    }

    // 3. Run BFS Derivation Algorithm
    const result = DerivationEngine.derive(parsedGrammar, targetString, maxSteps);
    this.currentResult = result;

    // 4. Update UI with Results
    this.renderResultSummary(result);
    this.renderDerivationSteps(result);
    this.renderFormalSpec(parsedGrammar, result);

    // 5. Update Trees
    this.treeVisualizer.setData(result.rootTree);

    if (result.success) {
      this.parseTreeVisualizer.buildFromDerivation(result.derivationSteps, new Set(parsedGrammar.nonTerminals));
    } else {
      this.parseTreeVisualizer.renderEmpty("No successful derivation. Parse tree is only generated when target string is derived.");
    }

    // Show result card
    this.resultCard.classList.remove('hidden');
  }

  renderResultSummary(result) {
    const isSuccess = result.success;

    // Status Badge & Styling
    if (isSuccess) {
      this.resultStatusBadge.className = 'status-tag tag-success';
      this.resultStatusBadge.innerHTML = '✓ String Generated';
      this.resultCard.className = 'result-card card-state-success';
    } else if (result.hasViableFrontierAtMaxDepth) {
      this.resultStatusBadge.className = 'status-tag tag-warning';
      this.resultStatusBadge.innerHTML = '✗ String Cannot Be Generated Within N Steps';
      this.resultCard.className = 'result-card card-state-warning';
    } else {
      this.resultStatusBadge.className = 'status-tag tag-failure';
      this.resultStatusBadge.innerHTML = '✗ String Impossible in Grammar';
      this.resultCard.className = 'result-card card-state-failure';
    }

    // Metrics
    this.resultTargetVal.textContent = result.displayTarget;
    this.resultStepsVal.textContent = isSuccess ? result.stepsUsed : '—';
    this.resultMaxStepsVal.textContent = result.maxSteps;
    this.resultDepthVal.textContent = `${result.highestDepthSearched} / ${result.maxSteps}`;
    this.resultNodesVal.textContent = `${result.totalNodesExplored} states (${result.executionTimeMs} ms)`;

    // Detailed conclusion message
    this.resultExplanation.textContent = result.conclusionMessage;

    // Derivation Sequence display
    if (isSuccess && result.derivationString) {
      this.derivationStringDisplay.parentElement.classList.remove('hidden');
      this.derivationStringDisplay.textContent = result.derivationString;
    } else {
      this.derivationStringDisplay.parentElement.classList.add('hidden');
    }
  }

  renderDerivationSteps(result) {
    this.stepSequenceList.innerHTML = '';
    const steps = result.derivationSteps || [];

    if (!result.success || steps.length === 0) {
      this.stepSequenceList.innerHTML = `
        <div class="empty-steps-state">
          <p>No valid derivation sequence found for target string within ${result.maxSteps} steps.</p>
          <p class="sub">Check the "Derivation Tree" tab to see all explored branches and pruning reasons.</p>
        </div>
      `;
      this.stepSlider.max = 0;
      this.stepSlider.value = 0;
      this.stepSlider.disabled = true;
      this.btnStepPrev.disabled = true;
      this.btnStepNext.disabled = true;
      this.btnStepPlay.disabled = true;
      this.stepCounterLabel.textContent = 'Step 0 / 0';
      return;
    }

    this.stepSlider.disabled = false;
    this.stepSlider.max = steps.length - 1;
    this.stepSlider.value = 0;
    this.btnStepPrev.disabled = true;
    this.btnStepNext.disabled = steps.length <= 1;
    this.btnStepPlay.disabled = false;
    this.currentDerivationStepIndex = 0;
    this.updateStepCounterLabel();

    // Render step items
    for (let i = 0; i < steps.length; i++) {
      const item = steps[i];
      const stepRow = document.createElement('div');
      stepRow.className = `derivation-step-item ${i === 0 ? 'active' : ''}`;
      stepRow.id = `step-item-${i}`;

      const isLast = i === steps.length - 1;

      stepRow.innerHTML = `
        <div class="step-num-col">
          <div class="step-badge ${isLast ? 'badge-final' : ''}">${i}</div>
          ${!isLast ? '<div class="step-connector-line"></div>' : ''}
        </div>
        <div class="step-content-col">
          <div class="step-header">
            <span class="step-action-desc">${item.actionDescription}</span>
            ${item.rule ? `<span class="step-rule-pill">${item.rule}</span>` : '<span class="step-rule-pill start">Start Symbol</span>'}
          </div>
          <div class="step-form-display">
            <span class="label">Sentential Form:</span>
            <span class="val mono">${item.sententialForm}</span>
          </div>
        </div>
      `;

      stepRow.addEventListener('click', () => {
        this.goToDerivationStep(i);
      });

      this.stepSequenceList.appendChild(stepRow);
    }
  }

  goToDerivationStep(index) {
    if (!this.currentResult || !this.currentResult.derivationSteps) return;
    const maxIdx = this.currentResult.derivationSteps.length - 1;
    this.currentDerivationStepIndex = Math.max(0, Math.min(index, maxIdx));

    this.stepSlider.value = this.currentDerivationStepIndex;
    this.btnStepPrev.disabled = this.currentDerivationStepIndex === 0;
    this.btnStepNext.disabled = this.currentDerivationStepIndex === maxIdx;
    this.updateStepCounterLabel();

    // Update active highlight in list
    document.querySelectorAll('.derivation-step-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === this.currentDerivationStepIndex);
    });

    const activeEl = document.getElementById(`step-item-${this.currentDerivationStepIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  prevDerivationStep() {
    this.goToDerivationStep(this.currentDerivationStepIndex - 1);
  }

  nextDerivationStep() {
    this.goToDerivationStep(this.currentDerivationStepIndex + 1);
  }

  updateStepCounterLabel() {
    const total = this.currentResult?.derivationSteps?.length ? this.currentResult.derivationSteps.length - 1 : 0;
    this.stepCounterLabel.textContent = `Step ${this.currentDerivationStepIndex} of ${total}`;
  }

  toggleDerivationPlay() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
      this.btnStepPlay.textContent = '▶ Play';
      return;
    }

    if (!this.currentResult || !this.currentResult.derivationSteps) return;
    const total = this.currentResult.derivationSteps.length - 1;
    if (this.currentDerivationStepIndex >= total) {
      this.goToDerivationStep(0);
    }

    this.btnStepPlay.textContent = '⏸ Pause';
    this.animationTimer = setInterval(() => {
      if (this.currentDerivationStepIndex < total) {
        this.nextDerivationStep();
      } else {
        clearInterval(this.animationTimer);
        this.animationTimer = null;
        this.btnStepPlay.textContent = '▶ Play';
      }
    }, 1000);
  }

  renderFormalSpec(parsedGrammar, result) {
    const nonTerminals = parsedGrammar.nonTerminals.map(nt => `<span class="formal-pill nt">${nt}</span>`).join(' ');
    const terminals = parsedGrammar.terminals.map(t => `<span class="formal-pill t">${t}</span>`).join(' ');
    const startSym = `<span class="formal-pill start">${parsedGrammar.startSymbol}</span>`;

    const rulesTableRows = parsedGrammar.productions.map((p, idx) => `
      <tr>
        <td class="mono">#${idx + 1}</td>
        <td class="mono font-bold">${p.lhs}</td>
        <td>→</td>
        <td class="mono font-bold">${p.rawRhs}</td>
        <td><span class="type-pill ${p.structureType}">${p.structureType.replace('_', ' ')}</span></td>
      </tr>
    `).join('');

    this.grammarSpecContent.innerHTML = `
      <div class="formal-def-card">
        <h3>Formal 4-Tuple Specification: G = (V, Σ, R, S)</h3>
        <div class="tuple-item">
          <div class="tuple-label">Variables (Non-Terminals V):</div>
          <div class="tuple-val">{ ${nonTerminals || '∅'} }</div>
        </div>
        <div class="tuple-item">
          <div class="tuple-label">Alphabet (Terminals Σ):</div>
          <div class="tuple-val">{ ${terminals || '∅'} }</div>
        </div>
        <div class="tuple-item">
          <div class="tuple-label">Start Variable (S ∈ V):</div>
          <div class="tuple-val">${startSym}</div>
        </div>
        <div class="tuple-item">
          <div class="tuple-label">Grammar Classification:</div>
          <div class="tuple-val">
            <span class="badge-regular">Chomsky Type-3 (Right-Linear Regular Grammar)</span>
          </div>
        </div>
      </div>

      <div class="rules-table-wrapper">
        <h4>Production Rules Set (R)</h4>
        <table class="rules-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>LHS</th>
              <th></th>
              <th>RHS</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            ${rulesTableRows}
          </tbody>
        </table>
      </div>
    `;
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.grammarApp = new App();
});
