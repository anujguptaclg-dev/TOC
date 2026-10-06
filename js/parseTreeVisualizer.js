/**
 * Parse Tree (Syntax Tree) Visualizer
 * For successful derivations, reconstructs and renders the formal Parse Tree
 * showing symbol replacements (Root Non-Terminal -> Terminal leaves and child Non-Terminals).
 */

export class ParseTreeVisualizer {
  constructor(containerElement) {
    this.container = containerElement;
    this.root = null;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="tree-canvas-wrapper" style="position: relative; width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at 50% 50%, #111827 0%, #090d16 100%);">
        <div class="tree-toolbar">
          <div class="btn-group">
            <button class="tool-btn" id="parse-zoom-in" title="Zoom In">+</button>
            <button class="tool-btn" id="parse-zoom-out" title="Zoom Out">−</button>
            <button class="tool-btn" id="parse-fit" title="Fit to Screen">Fit</button>
          </div>
          <div class="parse-tree-badge">
            Formal Syntax Parse Tree
          </div>
        </div>

        <div class="tree-legend">
          <div class="legend-item"><span class="legend-dot" style="background:#38bdf8;"></span> Non-Terminal Node</div>
          <div class="legend-item"><span class="legend-dot" style="background:#10b981;"></span> Terminal Leaf (Yield)</div>
          <div class="legend-item"><span class="legend-dot" style="background:#fbbf24;"></span> Epsilon (ε)</div>
        </div>

        <svg id="parse-tree-svg" width="100%" height="100%" style="cursor: grab;">
          <defs>
            <filter id="parse-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g id="parse-viewport">
            <g id="parse-links"></g>
            <g id="parse-nodes"></g>
          </g>
        </svg>
      </div>
    `;

    this.svg = this.container.querySelector('#parse-tree-svg');
    this.viewport = this.container.querySelector('#parse-viewport');
    this.linksGroup = this.container.querySelector('#parse-links');
    this.nodesGroup = this.container.querySelector('#parse-nodes');

    this.setupEvents();
  }

  setupEvents() {
    this.container.querySelector('#parse-zoom-in').addEventListener('click', () => this.zoom(1.2));
    this.container.querySelector('#parse-zoom-out').addEventListener('click', () => this.zoom(0.8));
    this.container.querySelector('#parse-fit').addEventListener('click', () => this.fitToScreen());

    this.svg.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.translateX;
      this.dragStartY = e.clientY - this.translateY;
      this.svg.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.dragStartX;
      this.translateY = e.clientY - this.dragStartY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.svg.style.cursor = 'grab';
      }
    });

    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.min(Math.max(this.scale * factor, 0.2), 3);

      this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
      this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
      this.scale = newScale;
      this.updateTransform();
    }, { passive: false });
  }

  updateTransform() {
    this.viewport.setAttribute('transform', `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
  }

  zoom(factor) {
    const rect = this.svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newScale = Math.min(Math.max(this.scale * factor, 0.2), 3);
    this.translateX = centerX - (centerX - this.translateX) * (newScale / this.scale);
    this.translateY = centerY - (centerY - this.translateY) * (newScale / this.scale);
    this.scale = newScale;
    this.updateTransform();
  }

  /**
   * Builds parse tree from derivation steps
   * @param {Array} derivationSteps 
   * @param {Set} nonTerminalsSet 
   */
  buildFromDerivation(derivationSteps, nonTerminalsSet) {
    if (!derivationSteps || derivationSteps.length <= 1) {
      this.root = null;
      this.renderEmpty("No multi-step derivation available to build parse tree.");
      return;
    }

    // Step 0 is start symbol: e.g. S
    let parseIdCounter = 0;
    const root = {
      id: `pt_${parseIdCounter++}`,
      symbol: derivationSteps[0].rawForm,
      isTerminal: false,
      isEpsilon: false,
      children: []
    };

    // In a right-linear grammar, at any step, the active non-terminal is always the rightmost leaf!
    // We locate the rightmost non-terminal leaf in the current tree and expand it
    for (let i = 1; i < derivationSteps.length; i++) {
      const step = derivationSteps[i];
      const rule = step.ruleObject;
      if (!rule) continue;

      // Find the active non-terminal node that matches rule.lhs
      const targetNode = findRightmostNonTerminal(root, rule.lhs);
      if (!targetNode) continue;

      // Expand targetNode with children corresponding to rule.rawRhs
      if (rule.isEpsilon) {
        targetNode.children.push({
          id: `pt_${parseIdCounter++}`,
          symbol: 'ε',
          isTerminal: true,
          isEpsilon: true,
          children: []
        });
      } else {
        // Split rule.rhs into terminal characters and nextNonTerminal
        for (const char of rule.terminals) {
          targetNode.children.push({
            id: `pt_${parseIdCounter++}`,
            symbol: char,
            isTerminal: true,
            isEpsilon: false,
            children: []
          });
        }
        if (rule.nextNonTerminal) {
          targetNode.children.push({
            id: `pt_${parseIdCounter++}`,
            symbol: rule.nextNonTerminal,
            isTerminal: false,
            isEpsilon: false,
            children: []
          });
        }
      }
    }

    this.root = root;
    this.render();
    setTimeout(() => this.fitToScreen(), 50);
  }

  fitToScreen() {
    if (!this.rootLayout) return;
    const rect = this.svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const traverse = (n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
      for (const c of n.children) traverse(c);
    };
    traverse(this.rootLayout);

    const treeW = maxX - minX + 100;
    const treeH = maxY - minY + 100;
    const scaleX = (rect.width - 60) / treeW;
    const scaleY = (rect.height - 60) / treeH;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.5);

    const centerX = (minX + maxX) / 2;
    this.translateX = rect.width / 2 - centerX * this.scale;
    this.translateY = 40 - minY * this.scale;
    this.updateTransform();
  }

  renderEmpty(msg) {
    this.linksGroup.innerHTML = '';
    this.nodesGroup.innerHTML = `
      <text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14">
        ${msg}
      </text>
    `;
  }

  render() {
    this.linksGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';
    if (!this.root) return;

    // Layout
    let curX = 0;
    const layoutNode = (node, depth = 0) => {
      const copy = {
        data: node,
        depth: depth,
        y: depth * 80 + 35,
        children: []
      };

      if (!node.children || node.children.length === 0) {
        copy.x = curX;
        curX += 60;
      } else {
        for (const child of node.children) {
          copy.children.push(layoutNode(child, depth + 1));
        }
        const first = copy.children[0].x;
        const last = copy.children[copy.children.length - 1].x;
        copy.x = (first + last) / 2;
      }
      return copy;
    };

    this.rootLayout = layoutNode(this.root);

    // Draw
    const drawLinks = (node) => {
      for (const child of node.children) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', node.x);
        line.setAttribute('y1', node.y);
        line.setAttribute('x2', child.x);
        line.setAttribute('y2', child.y);
        line.setAttribute('stroke', child.data.isTerminal ? '#059669' : '#334155');
        line.setAttribute('stroke-width', '2');
        this.linksGroup.appendChild(line);
        drawLinks(child);
      }
    };
    drawLinks(this.rootLayout);

    const drawNodes = (node) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '18');

      let fill = '#0f172a';
      let stroke = '#38bdf8';
      let textColor = '#38bdf8';

      if (node.data.isEpsilon) {
        stroke = '#fbbf24';
        textColor = '#fbbf24';
      } else if (node.data.isTerminal) {
        fill = '#064e3b';
        stroke = '#10b981';
        textColor = '#ecfdf5';
      }

      circle.setAttribute('fill', fill);
      circle.setAttribute('stroke', stroke);
      circle.setAttribute('stroke-width', '2');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('y', '5');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', textColor);
      text.setAttribute('font-family', 'JetBrains Mono, monospace');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.textContent = node.data.symbol;

      g.appendChild(circle);
      g.appendChild(text);
      this.nodesGroup.appendChild(g);

      for (const c of node.children) {
        drawNodes(c);
      }
    };
    drawNodes(this.rootLayout);
  }
}

function findRightmostNonTerminal(node, expectedSymbol) {
  if (!node.children || node.children.length === 0) {
    if (!node.isTerminal && (!expectedSymbol || node.symbol === expectedSymbol)) {
      return node;
    }
    return null;
  }
  for (let i = node.children.length - 1; i >= 0; i--) {
    const res = findRightmostNonTerminal(node.children[i], expectedSymbol);
    if (res) return res;
  }
  return null;
}
