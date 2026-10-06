/**
 * Interactive SVG Derivation Tree Visualizer
 * Implements hierarchical tree layout, pan/zoom, node expansion/collapse,
 * edge labels, successful path glow, and SVG export.
 */

export class TreeVisualizer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      nodeWidth: 110,
      nodeHeight: 46,
      levelHeight: 90,
      siblingGap: 24,
      ...options
    };

    this.root = null;
    this.selectedNode = null;
    this.collapsedNodeIds = new Set();
    this.filterOnlySuccessPath = false;

    // Pan / Zoom state
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.onNodeClickCallback = null;

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="tree-canvas-wrapper" style="position: relative; width: 100%; height: 100%; overflow: hidden; background: radial-gradient(circle at 50% 50%, #111827 0%, #090d16 100%);">
        <!-- Floating Toolbar -->
        <div class="tree-toolbar">
          <div class="btn-group">
            <button class="tool-btn" id="tree-zoom-in" title="Zoom In">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="tool-btn" id="tree-zoom-out" title="Zoom Out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="tool-btn" id="tree-zoom-reset" title="Reset View">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            </button>
            <button class="tool-btn" id="tree-fit-screen" title="Fit to Screen">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </button>
          </div>

          <div class="btn-group">
            <button class="tool-btn text-btn" id="tree-toggle-filter" title="Toggle full search tree vs winning path">
              <span id="filter-btn-label">Show Full Tree</span>
            </button>
            <button class="tool-btn text-btn" id="tree-export-svg" title="Export as SVG">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>SVG</span>
            </button>
          </div>
        </div>

        <!-- Legend Overlay -->
        <div class="tree-legend">
          <div class="legend-item"><span class="legend-dot dot-success"></span> Success Path</div>
          <div class="legend-item"><span class="legend-dot dot-match"></span> Target Match</div>
          <div class="legend-item"><span class="legend-dot dot-explored"></span> Explored</div>
          <div class="legend-item"><span class="legend-dot dot-pruned"></span> Pruned</div>
          <div class="legend-item"><span class="legend-dot dot-limit"></span> Max Depth</div>
        </div>

        <!-- SVG Container -->
        <svg id="tree-svg" width="100%" height="100%" style="cursor: grab;">
          <defs>
            <linearGradient id="grad-success" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#059669" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
            <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#d97706" />
              <stop offset="100%" stop-color="#f59e0b" />
            </linearGradient>
            <linearGradient id="grad-card" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
            <!-- Drop Shadow Filter -->
            <filter id="glow-emerald" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <g id="viewport-group">
            <g id="links-group"></g>
            <g id="nodes-group"></g>
          </g>
        </svg>

        <!-- Node Details Popover -->
        <div id="tree-node-card" class="tree-node-card hidden">
          <div class="node-card-header">
            <span id="node-card-title">Node Details</span>
            <button id="node-card-close" class="close-btn">&times;</button>
          </div>
          <div id="node-card-body" class="node-card-body"></div>
        </div>
      </div>
    `;

    this.svg = this.container.querySelector('#tree-svg');
    this.viewport = this.container.querySelector('#viewport-group');
    this.linksGroup = this.container.querySelector('#links-group');
    this.nodesGroup = this.container.querySelector('#nodes-group');
    this.nodeCard = this.container.querySelector('#tree-node-card');

    this.setupEvents();
  }

  setupEvents() {
    // Toolbar buttons
    this.container.querySelector('#tree-zoom-in').addEventListener('click', () => this.zoom(1.2));
    this.container.querySelector('#tree-zoom-out').addEventListener('click', () => this.zoom(0.8));
    this.container.querySelector('#tree-zoom-reset').addEventListener('click', () => this.resetView());
    this.container.querySelector('#tree-fit-screen').addEventListener('click', () => this.fitToScreen());

    const filterBtn = this.container.querySelector('#tree-toggle-filter');
    const filterLabel = this.container.querySelector('#filter-btn-label');
    filterBtn.addEventListener('click', () => {
      this.filterOnlySuccessPath = !this.filterOnlySuccessPath;
      filterLabel.textContent = this.filterOnlySuccessPath ? 'Show Full Tree' : 'Winning Path Only';
      filterBtn.classList.toggle('active', this.filterOnlySuccessPath);
      this.render();
      this.fitToScreen();
    });

    this.container.querySelector('#tree-export-svg').addEventListener('click', () => this.exportSVG());

    this.container.querySelector('#node-card-close').addEventListener('click', () => {
      this.nodeCard.classList.add('hidden');
    });

    // Pan & Zoom with mouse
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target.closest('.tree-node')) return; // let node clicks bubble separately
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
      const newScale = Math.min(Math.max(this.scale * factor, 0.2), 4);

      // Zoom toward cursor
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

    const newScale = Math.min(Math.max(this.scale * factor, 0.2), 4);
    this.translateX = centerX - (centerX - this.translateX) * (newScale / this.scale);
    this.translateY = centerY - (centerY - this.translateY) * (newScale / this.scale);
    this.scale = newScale;
    this.updateTransform();
  }

  resetView() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  fitToScreen() {
    if (!this.rootLayout) return;
    const rect = this.svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const bounds = this.getTreeBounds(this.rootLayout);
    const treeWidth = bounds.maxX - bounds.minX + this.options.nodeWidth + 100;
    const treeHeight = bounds.maxY - bounds.minY + this.options.nodeHeight + 100;

    const scaleX = (rect.width - 60) / treeWidth;
    const scaleY = (rect.height - 60) / treeHeight;
    this.scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.6);

    const treeCenterX = (bounds.minX + bounds.maxX) / 2;
    this.translateX = rect.width / 2 - treeCenterX * this.scale;
    this.translateY = 40 - bounds.minY * this.scale;

    this.updateTransform();
  }

  getTreeBounds(node) {
    let minX = node.x;
    let maxX = node.x;
    let minY = node.y;
    let maxY = node.y;

    const traverse = (n) => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
      if (n.children && !this.collapsedNodeIds.has(n.data.id)) {
        for (const child of n.children) {
          traverse(child);
        }
      }
    };

    traverse(node);
    return { minX, maxX, minY, maxY };
  }

  /**
   * Set tree data and render
   * @param {Object} rootTree 
   */
  setData(rootTree) {
    this.root = rootTree;
    this.collapsedNodeIds.clear();
    this.render();
    setTimeout(() => this.fitToScreen(), 50);
  }

  /**
   * Filter and layout computation
   */
  computeLayout() {
    if (!this.root) return null;

    // Filter node if filterOnlySuccessPath is active
    const cloneAndFilter = (node) => {
      if (this.filterOnlySuccessPath && !node.isSuccessPath) {
        return null;
      }

      const copy = {
        data: node,
        children: []
      };

      if (!this.collapsedNodeIds.has(node.id) && node.children) {
        for (const child of node.children) {
          const filteredChild = cloneAndFilter(child);
          if (filteredChild) {
            copy.children.push(filteredChild);
          }
        }
      }
      return copy;
    };

    const treeData = cloneAndFilter(this.root);
    if (!treeData) return null;

    // Compute x, y coordinates
    let currentX = 0;
    const assignCoordinates = (node, depth = 0) => {
      node.y = depth * this.options.levelHeight + 30;

      if (!node.children || node.children.length === 0) {
        node.x = currentX;
        currentX += this.options.nodeWidth + this.options.siblingGap;
      } else {
        for (const child of node.children) {
          assignCoordinates(child, depth + 1);
        }
        const first = node.children[0].x;
        const last = node.children[node.children.length - 1].x;
        node.x = (first + last) / 2;
      }
    };

    assignCoordinates(treeData, 0);
    return treeData;
  }

  render() {
    this.linksGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';

    if (!this.root) return;

    this.rootLayout = this.computeLayout();
    if (!this.rootLayout) return;

    // Collect all nodes and links
    const nodesList = [];
    const linksList = [];

    const traverse = (node, parent) => {
      nodesList.push(node);
      if (parent) {
        linksList.push({
          source: parent,
          target: node,
          rule: node.data.ruleApplied,
          isSuccessPath: node.data.isSuccessPath && parent.data.isSuccessPath
        });
      }

      if (node.children && !this.collapsedNodeIds.has(node.data.id)) {
        for (const child of node.children) {
          traverse(child, node);
        }
      }
    };

    traverse(this.rootLayout, null);

    // 1. Draw Links
    for (const link of linksList) {
      this.renderLink(link);
    }

    // 2. Draw Nodes
    for (const node of nodesList) {
      this.renderNode(node);
    }
  }

  renderLink(link) {
    const x1 = link.source.x;
    const y1 = link.source.y + this.options.nodeHeight / 2;
    const x2 = link.target.x;
    const y2 = link.target.y - this.options.nodeHeight / 2;

    const midY = (y1 + y2) / 2;
    const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('class', `tree-link ${link.isSuccessPath ? 'link-success' : 'link-regular'}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', link.isSuccessPath ? '#10b981' : '#334155');
    path.setAttribute('stroke-width', link.isSuccessPath ? '3' : '1.5');
    if (link.isSuccessPath) {
      path.setAttribute('stroke-dasharray', 'none');
    }
    this.linksGroup.appendChild(path);

    // Rule Label Badge on link
    if (link.rule) {
      const midX = (x1 + x2) / 2;
      const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelG.setAttribute('class', `link-label-group ${link.isSuccessPath ? 'label-success' : ''}`);

      const ruleText = link.rule.display;
      const labelWidth = Math.max(ruleText.length * 6.8 + 12, 54);
      const labelHeight = 18;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', midX - labelWidth / 2);
      rect.setAttribute('y', midY - labelHeight / 2);
      rect.setAttribute('width', labelWidth);
      rect.setAttribute('height', labelHeight);
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', link.isSuccessPath ? '#064e3b' : '#0f172a');
      rect.setAttribute('stroke', link.isSuccessPath ? '#059669' : '#334155');
      rect.setAttribute('stroke-width', '1');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX);
      text.setAttribute('y', midY + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', link.isSuccessPath ? '#a7f3d0' : '#94a3b8');
      text.setAttribute('font-family', 'JetBrains Mono, monospace, sans-serif');
      text.setAttribute('font-size', '10px');
      text.setAttribute('font-weight', '500');
      text.textContent = ruleText;

      labelG.appendChild(rect);
      labelG.appendChild(text);
      this.linksGroup.appendChild(labelG);
    }
  }

  renderNode(layoutNode) {
    const d = layoutNode.data;
    const w = this.options.nodeWidth;
    const h = this.options.nodeHeight;
    const x = layoutNode.x - w / 2;
    const y = layoutNode.y - h / 2;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `tree-node node-status-${d.status} ${d.isSuccessPath ? 'node-success-path' : ''}`);
    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.setAttribute('style', 'cursor: pointer;');

    // Node Background Box
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', '10');

    // Node style according to status
    let strokeColor = '#334155';
    let fillColor = '#131b2e';
    let filterAttr = '';

    if (d.status === 'success') {
      strokeColor = '#10b981';
      fillColor = 'url(#grad-success)';
      filterAttr = 'url(#glow-emerald)';
    } else if (d.isSuccessPath) {
      strokeColor = '#10b981';
      fillColor = '#064e3b';
      filterAttr = 'url(#glow-emerald)';
    } else if (d.status === 'root') {
      strokeColor = '#38bdf8';
      fillColor = '#0f172a';
    } else if (d.status === 'pruned') {
      strokeColor = '#475569';
      fillColor = '#1e1e24';
    } else if (d.status === 'max_depth') {
      strokeColor = '#f59e0b';
      fillColor = '#2d2212';
    } else if (d.status === 'dead_end') {
      strokeColor = '#e11d48';
      fillColor = '#2b1218';
    }

    rect.setAttribute('stroke', strokeColor);
    rect.setAttribute('stroke-width', d.isSuccessPath || d.status === 'success' ? '2.5' : '1.5');
    rect.setAttribute('fill', fillColor);
    if (filterAttr) rect.setAttribute('filter', filterAttr);

    g.appendChild(rect);

    // Depth pill in top left
    const depthPill = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    depthPill.setAttribute('x', '10');
    depthPill.setAttribute('y', '14');
    depthPill.setAttribute('fill', d.isSuccessPath ? '#d1fae5' : '#64748b');
    depthPill.setAttribute('font-size', '9px');
    depthPill.setAttribute('font-family', 'sans-serif');
    depthPill.setAttribute('font-weight', '600');
    depthPill.textContent = `d:${d.depth}`;
    g.appendChild(depthPill);

    // Status icon in top right
    const statusIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    statusIcon.setAttribute('x', w - 10);
    statusIcon.setAttribute('y', '14');
    statusIcon.setAttribute('text-anchor', 'end');
    statusIcon.setAttribute('font-size', '10px');
    if (d.status === 'success') {
      statusIcon.setAttribute('fill', '#ffffff');
      statusIcon.textContent = '★ MATCH';
    } else if (d.status === 'pruned') {
      statusIcon.setAttribute('fill', '#94a3b8');
      statusIcon.textContent = '✕ PRUNED';
    } else if (d.status === 'max_depth') {
      statusIcon.setAttribute('fill', '#fbbf24');
      statusIcon.textContent = '⏱ LIMIT';
    } else if (d.status === 'root') {
      statusIcon.setAttribute('fill', '#38bdf8');
      statusIcon.textContent = 'START';
    }
    g.appendChild(statusIcon);

    // Main Sentential Form Text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', w / 2);
    text.setAttribute('y', h / 2 + 10);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', d.status === 'success' || d.isSuccessPath ? '#ffffff' : '#f1f5f9');
    text.setAttribute('font-family', 'JetBrains Mono, monospace, sans-serif');
    text.setAttribute('font-size', '14px');
    text.setAttribute('font-weight', '700');
    text.setAttribute('letter-spacing', '0.5px');
    text.textContent = d.displayForm;
    g.appendChild(text);

    // Collapse / Expand indicator button if node has original children
    if (d.children && d.children.length > 0) {
      const isCollapsed = this.collapsedNodeIds.has(d.id);
      const toggleG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      toggleG.setAttribute('transform', `translate(${w / 2}, ${h})`);
      toggleG.setAttribute('class', 'collapse-toggle');

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '7');
      circle.setAttribute('fill', isCollapsed ? '#38bdf8' : '#1e293b');
      circle.setAttribute('stroke', '#475569');
      circle.setAttribute('stroke-width', '1');

      const sign = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sign.setAttribute('y', '3.5');
      sign.setAttribute('text-anchor', 'middle');
      sign.setAttribute('fill', isCollapsed ? '#0f172a' : '#94a3b8');
      sign.setAttribute('font-size', '10px');
      sign.setAttribute('font-weight', 'bold');
      sign.textContent = isCollapsed ? `+${d.children.length}` : '−';

      toggleG.appendChild(circle);
      toggleG.appendChild(sign);

      toggleG.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.collapsedNodeIds.has(d.id)) {
          this.collapsedNodeIds.delete(d.id);
        } else {
          this.collapsedNodeIds.add(d.id);
        }
        this.render();
      });

      g.appendChild(toggleG);
    }

    // Node click to inspect details
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showNodeDetails(d, e.clientX, e.clientY);
      if (this.onNodeClickCallback) {
        this.onNodeClickCallback(d);
      }
    });

    this.nodesGroup.appendChild(g);
  }

  showNodeDetails(nodeData, clientX, clientY) {
    const body = this.container.querySelector('#node-card-body');
    const title = this.container.querySelector('#node-card-title');

    title.textContent = `Sentential Form: ${nodeData.displayForm}`;

    let statusBadge = '';
    if (nodeData.status === 'success') {
      statusBadge = '<span class="status-badge success">Target Matched</span>';
    } else if (nodeData.isSuccessPath) {
      statusBadge = '<span class="status-badge on-path">On Winning Derivation Path</span>';
    } else if (nodeData.status === 'pruned') {
      statusBadge = '<span class="status-badge pruned">Pruned Branch</span>';
    } else if (nodeData.status === 'max_depth') {
      statusBadge = '<span class="status-badge max-depth">Max Depth Reached</span>';
    } else if (nodeData.status === 'root') {
      statusBadge = '<span class="status-badge root">Start Symbol</span>';
    } else {
      statusBadge = '<span class="status-badge explored">Explored Frontier</span>';
    }

    body.innerHTML = `
      <div class="node-info-row">
        <span class="label">Status:</span>
        <span class="val">${statusBadge}</span>
      </div>
      <div class="node-info-row">
        <span class="label">Depth (Steps):</span>
        <span class="val mono">${nodeData.depth}</span>
      </div>
      <div class="node-info-row">
        <span class="label">Rule Applied:</span>
        <span class="val mono highlight">${nodeData.ruleApplied ? nodeData.ruleApplied.display : '(Start symbol)'}</span>
      </div>
      ${nodeData.pruneReason ? `
        <div class="node-info-row">
          <span class="label">Prune Reason:</span>
          <span class="val prune-reason">${nodeData.pruneReason}</span>
        </div>
      ` : ''}
      <div class="node-info-row">
        <span class="label">Subtree Children:</span>
        <span class="val">${nodeData.children ? nodeData.children.length : 0} branches</span>
      </div>
    `;

    this.nodeCard.classList.remove('hidden');

    // Position popover safely inside container
    const rect = this.container.getBoundingClientRect();
    const posX = Math.min(clientX - rect.left + 10, rect.width - 290);
    const posY = Math.min(clientY - rect.top + 10, rect.height - 220);

    this.nodeCard.style.left = `${Math.max(10, posX)}px`;
    this.nodeCard.style.top = `${Math.max(10, posY)}px`;
  }

  exportSVG() {
    if (!this.svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(this.svg);

    // Add XML declaration and SVG namespace if missing
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grammar-derivation-tree-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
