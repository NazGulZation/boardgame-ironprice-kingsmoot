/**
 * IRON PRICE: Kingsmoot — Interactive Map SVG Renderer (Phase 1)
 * Enhanced with High-Legibility Typography, Zoom & Pan.
 */

class MapRenderer {
  constructor(svgElementId, onSelectCallback, onRightClickCallback = null) {
    this.svg = document.getElementById(svgElementId);
    this.onSelect = onSelectCallback;
    this.onRightClick = onRightClickCallback;
    this.mapData = null;
    this.gameState = null;
    this.selectedNodeId = null;
    this.selectedShipId = null;

    this.edgesGroup = document.getElementById('edges-layer');
    this.nodesGroup = document.getElementById('nodes-layer');
    this.shipsGroup = document.getElementById('ships-layer');
    this.overlaysGroup = document.getElementById('overlays-layer');

    // Prevent browser context menu on map
    this.svg.addEventListener('contextmenu', (e) => e.preventDefault());

    // Zoom & Pan state
    this.baseViewBox = { x: 100, y: 60, w: 1690, h: 890 };
    this.viewBox = { ...this.baseViewBox };
    this.isPanning = false;
    this.startPoint = { x: 0, y: 0 };

    this.setupZoomPan();
  }

  setupZoomPan() {
    // Mouse wheel zoom
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
      this.zoom(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });

    // Drag to pan
    this.svg.addEventListener('mousedown', (e) => {
      // Left-click only for dragging/panning
      if (e.button !== 0) return;

      // Only drag if not clicking on an interactive node or ship directly
      const isInteractive = e.target.closest && (e.target.closest('.map-node-group') || e.target.closest('.map-ship-group'));
      if (!isInteractive) {
        e.preventDefault();
        this.isPanning = true;
        this.startPoint = { x: e.clientX, y: e.clientY };
        this.svg.classList.add('panning');
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = (e.clientX - this.startPoint.x) * (this.viewBox.w / this.svg.clientWidth);
      const dy = (e.clientY - this.startPoint.y) * (this.viewBox.h / this.svg.clientHeight);
      
      this.viewBox.x -= dx;
      this.viewBox.y -= dy;
      this.startPoint = { x: e.clientX, y: e.clientY };
      this.applyViewBox();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.svg.classList.remove('panning');
      }
    });

    // Toolbar buttons
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');
    const btnReset = document.getElementById('btn-zoom-reset');

    if (btnIn) btnIn.addEventListener('click', () => this.zoom(0.8));
    if (btnOut) btnOut.addEventListener('click', () => this.zoom(1.25));
    if (btnReset) btnReset.addEventListener('click', () => this.resetZoom());
  }

  zoom(factor, clientX = null, clientY = null) {
    let focalX = this.viewBox.x + this.viewBox.w / 2;
    let focalY = this.viewBox.y + this.viewBox.h / 2;

    if (clientX !== null && clientY !== null) {
      const rect = this.svg.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      focalX = this.viewBox.x + relX * this.viewBox.w;
      focalY = this.viewBox.y + relY * this.viewBox.h;
    }

    const newW = Math.max(600, Math.min(2200, this.viewBox.w * factor));
    const newH = Math.max(340, Math.min(1300, this.viewBox.h * factor));

    this.viewBox.x = focalX - (focalX - this.viewBox.x) * (newW / this.viewBox.w);
    this.viewBox.y = focalY - (focalY - this.viewBox.y) * (newH / this.viewBox.h);
    this.viewBox.w = newW;
    this.viewBox.h = newH;

    this.applyViewBox();
  }

  resetZoom() {
    this.viewBox = { ...this.baseViewBox };
    this.applyViewBox();
  }

  applyViewBox() {
    this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
  }

  init(mapData) {
    this.mapData = mapData;
    this.applyViewBox();
    this.renderBase();
  }

  renderBase() {
    if (!this.mapData) return;

    // 1. Draw Edges
    this.edgesGroup.innerHTML = '';
    const nodeMap = {};
    this.mapData.nodes.forEach(n => nodeMap[n.id] = n);

    this.mapData.edges.forEach(edge => {
      const u = nodeMap[edge[0]];
      const v = nodeMap[edge[1]];
      if (!u || !v) return;

      // Dark shadow underlay for high contrast over board map art
      const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      shadowLine.setAttribute('x1', u.x);
      shadowLine.setAttribute('y1', u.y);
      shadowLine.setAttribute('x2', v.x);
      shadowLine.setAttribute('y2', v.y);
      shadowLine.setAttribute('stroke', '#050a12');
      shadowLine.setAttribute('stroke-width', '7');
      shadowLine.setAttribute('stroke-linecap', 'round');
      shadowLine.setAttribute('opacity', '0.75');
      this.edgesGroup.appendChild(shadowLine);

      // Main dashed route line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', u.x);
      line.setAttribute('y1', u.y);
      line.setAttribute('x2', v.x);
      line.setAttribute('y2', v.y);
      line.setAttribute('stroke', '#41739c');
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-dasharray', '8,6');
      line.setAttribute('stroke-linecap', 'round');
      this.edgesGroup.appendChild(line);
    });

    // 2. Draw Nodes
    this.nodesGroup.innerHTML = '';
    this.mapData.nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-node-group');
      g.setAttribute('id', `node-g-${node.id}`);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleNodeClick(node.id);
      });

      g.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onRightClick) {
          this.onRightClick({ type: 'node', nodeId: node.id });
        }
      });

      // ---------------- ISLE NODES ----------------
      if (node.kind === 'isle') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '58');
        circle.setAttribute('fill', 'url(#isleGrad)');
        circle.setAttribute('stroke', '#bdc3c7');
        circle.setAttribute('stroke-width', '4');
        circle.setAttribute('filter', 'url(#drop-shadow)');
        g.appendChild(circle);

        if (node.image) {
          const clipId = `clip-node-${node.id}`;
          let clipEl = document.getElementById(clipId);
          if (!clipEl) {
            clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipEl.setAttribute('id', clipId);
            const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            clipCircle.setAttribute('r', '56');
            clipCircle.setAttribute('cx', '0');
            clipCircle.setAttribute('cy', '0');
            clipEl.appendChild(clipCircle);
            const defs = this.svg.querySelector('defs') || this.svg;
            defs.appendChild(clipEl);
          }

          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('href', node.image);
          img.setAttribute('x', '-56');
          img.setAttribute('y', '-56');
          img.setAttribute('width', '112');
          img.setAttribute('height', '112');
          img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          img.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(img);

          const vig = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          vig.setAttribute('r', '56');
          vig.setAttribute('fill', 'url(#nodeImageVignette)');
          vig.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(vig);

          const innerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          innerShadow.setAttribute('r', '56');
          innerShadow.setAttribute('fill', 'url(#nodeImageInnerShadow)');
          innerShadow.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(innerShadow);

          const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ring.setAttribute('r', '58');
          ring.setAttribute('fill', 'none');
          ring.setAttribute('stroke', '#bdc3c7');
          ring.setAttribute('stroke-width', '4');
          g.appendChild(ring);
        } else {
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          icon.setAttribute('y', '-16');
          icon.setAttribute('text-anchor', 'middle');
          icon.setAttribute('font-size', '28');
          icon.textContent = '🏰';
          g.appendChild(icon);
        }

        // Clear high-contrast title text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('y', '15');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
        text.setAttribute('font-size', '18');
        text.setAttribute('font-weight', '900');
        text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
        text.textContent = node.name.toUpperCase();
        g.appendChild(text);

        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub.setAttribute('y', '36');
        sub.setAttribute('text-anchor', 'middle');
        sub.setAttribute('fill', '#f1c40f');
        sub.setAttribute('font-family', 'Inter, sans-serif');
        sub.setAttribute('font-size', '14');
        sub.setAttribute('font-weight', '800');
        sub.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
        sub.textContent = node.id === 'pyke' ? 'Euron Port' : node.id === 'harlaw' ? 'Asha Port' : node.id === 'greatwyk' ? 'Victarion Port' : node.id === 'oldwyk' ? 'Kingsmoot' : '+2 Hoard';
        g.appendChild(sub);

      // ---------------- SEA NODES ----------------
      } else if (node.kind === 'sea') {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '64');
        circle.setAttribute('fill', 'url(#seaGrad)');
        circle.setAttribute('stroke', node.id === 'storm' ? '#9b59b6' : '#2980b9');
        circle.setAttribute('stroke-width', '4');
        circle.setAttribute('filter', 'url(#drop-shadow)');
        g.appendChild(circle);

        if (node.image) {
          const clipId = `clip-node-${node.id}`;
          let clipEl = document.getElementById(clipId);
          if (!clipEl) {
            clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipEl.setAttribute('id', clipId);
            const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            clipCircle.setAttribute('r', '62');
            clipCircle.setAttribute('cx', '0');
            clipCircle.setAttribute('cy', '0');
            clipEl.appendChild(clipCircle);
            const defs = this.svg.querySelector('defs') || this.svg;
            defs.appendChild(clipEl);
          }

          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('href', node.image);
          img.setAttribute('x', '-62');
          img.setAttribute('y', '-62');
          img.setAttribute('width', '124');
          img.setAttribute('height', '124');
          img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          img.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(img);

          const vig = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          vig.setAttribute('r', '62');
          vig.setAttribute('fill', 'url(#nodeImageVignette)');
          vig.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(vig);

          const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ring.setAttribute('r', '64');
          ring.setAttribute('fill', 'none');
          ring.setAttribute('stroke', node.id === 'storm' ? '#9b59b6' : '#2980b9');
          ring.setAttribute('stroke-width', '4');
          g.appendChild(ring);
        } else {
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          icon.setAttribute('y', '-16');
          icon.setAttribute('text-anchor', 'middle');
          icon.setAttribute('font-size', '30');
          icon.textContent = node.id === 'storm' ? '⚡' : '🌊';
          g.appendChild(icon);
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('y', '16');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
        text.setAttribute('font-size', '18');
        text.setAttribute('font-weight', '900');
        text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
        text.textContent = node.name.toUpperCase();
        g.appendChild(text);

        if (node.id === 'storm') {
          const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          sub.setAttribute('y', '38');
          sub.setAttribute('text-anchor', 'middle');
          sub.setAttribute('fill', '#e056fd');
          sub.setAttribute('font-family', 'Inter, sans-serif');
          sub.setAttribute('font-size', '13');
          sub.setAttribute('font-weight', '800');
          sub.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
          sub.textContent = 'HAZARD BELT';
          g.appendChild(sub);
        }

      // ---------------- GREEN LAND NODES ----------------
      } else if (node.kind === 'land') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-85');
        rect.setAttribute('y', '-52');
        rect.setAttribute('width', '170');
        rect.setAttribute('height', '104');
        rect.setAttribute('rx', '12');
        rect.setAttribute('fill', 'url(#landGrad)');
        rect.setAttribute('stroke', '#2ecc71');
        rect.setAttribute('stroke-width', '3.5');
        rect.setAttribute('filter', 'url(#drop-shadow)');
        rect.setAttribute('class', 'land-rect');
        g.appendChild(rect);

        if (node.image) {
          const clipId = `clip-node-${node.id}`;
          let clipEl = document.getElementById(clipId);
          if (!clipEl) {
            clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipEl.setAttribute('id', clipId);
            const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clipRect.setAttribute('x', '-83');
            clipRect.setAttribute('y', '-50');
            clipRect.setAttribute('width', '166');
            clipRect.setAttribute('height', '100');
            clipRect.setAttribute('rx', '10');
            clipEl.appendChild(clipRect);
            const defs = this.svg.querySelector('defs') || this.svg;
            defs.appendChild(clipEl);
          }

          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          img.setAttribute('href', node.image);
          img.setAttribute('x', '-83');
          img.setAttribute('y', '-50');
          img.setAttribute('width', '166');
          img.setAttribute('height', '100');
          img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          img.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(img);

          const vig = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          vig.setAttribute('x', '-83');
          vig.setAttribute('y', '-50');
          vig.setAttribute('width', '166');
          vig.setAttribute('height', '100');
          vig.setAttribute('rx', '10');
          vig.setAttribute('fill', 'url(#nodeImageVignette)');
          vig.setAttribute('clip-path', `url(#${clipId})`);
          g.appendChild(vig);
        } else {
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          icon.setAttribute('y', '-18');
          icon.setAttribute('text-anchor', 'middle');
          icon.setAttribute('font-size', '24');
          icon.textContent = '🛡️';
          g.appendChild(icon);
        }

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('y', '12');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
        text.setAttribute('font-size', '17');
        text.setAttribute('font-weight', '900');
        text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
        text.textContent = node.name.toUpperCase();
        g.appendChild(text);

        const stats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stats.setAttribute('y', '36');
        stats.setAttribute('text-anchor', 'middle');
        stats.setAttribute('fill', '#f5c518');
        stats.setAttribute('font-family', 'Inter, sans-serif');
        stats.setAttribute('font-size', '16');
        stats.setAttribute('font-weight', '900');
        stats.setAttribute('class', 'node-stat-text');
        stats.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
        stats.textContent = `🛡️${node.defense}  💰${node.hoard}  👑${node.legend}`;
        g.appendChild(stats);
      }

      this.nodesGroup.appendChild(g);
    });

    this.svg.addEventListener('click', () => {
      this.clearSelection();
    });
  }

  update(gameState, selection = null) {
    this.gameState = gameState;
    if (!this.gameState || !this.mapData) return;

    if (selection) {
      if (selection.type === 'ship') {
        this.selectedShipId = selection.shipId;
        this.selectedNodeId = selection.nodeId;
      } else if (selection.type === 'node') {
        this.selectedNodeId = selection.nodeId;
        this.selectedShipId = null;
      } else if (selection.type === 'none') {
        this.selectedShipId = null;
        this.selectedNodeId = null;
      }
    }

    // Update Land Burned status
    Object.values(this.gameState.nodes).forEach(node => {
      const g = document.getElementById(`node-g-${node.id}`);
      if (!g) return;

      if (node.kind === 'land') {
        const rect = g.querySelector('.land-rect');
        const statText = g.querySelector('.node-stat-text');
        if (rect) {
          if (node.is_burned) {
            rect.setAttribute('fill', '#451616');
            rect.setAttribute('stroke', '#e74c3c');
            if (statText) {
              statText.setAttribute('fill', '#ff7675');
              statText.textContent = `🔥 BURNED (-1💰)`;
            }
          } else {
            rect.setAttribute('fill', 'url(#landGrad)');
            rect.setAttribute('stroke', '#2ecc71');
            if (statText) {
              statText.setAttribute('fill', '#f5c518');
              statText.textContent = `🛡️${node.defense}  💰${node.hoard}  👑${node.legend}`;
            }
          }
        }
      }
    });

    // Render Ships Layer
    this.renderShips();

    // Re-apply selection highlights
    this.highlightSelection();
  }

  renderShips() {
    this.shipsGroup.innerHTML = '';

    const factionColors = {
      'Asha': '#2ecc71',
      'Euron': '#9b59b6',
      'Victarion': '#e74c3c'
    };

    Object.entries(this.gameState.nodes).forEach(([nodeId, node]) => {
      if (!node.occupants || node.occupants.length === 0) return;

      const occupantShips = node.occupants;
      const count = occupantShips.length;

      occupantShips.forEach((ship, idx) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'map-ship-group');
        g.setAttribute('id', `ship-g-${ship.id}`);

        // Offset ships cleanly outside node text and other ships
        let offsetX = 0;
        let offsetY = 0;

        if (node.kind === 'isle') {
          // Place ships in a neat vertical harbor dock to the left of the isle
          offsetX = -108;
          if (count === 1) {
            offsetY = 0;
          } else if (count === 2) {
            offsetY = (idx === 0) ? -24 : 24;
          } else {
            offsetY = (idx - 1) * 44; // -44, 0, +44 with 36px height -> 8px gap
          }
        } else if (node.kind === 'sea') {
          if (node.id === 'bay') {
            // Ironman's Bay: dock to North (wide open ocean)
            offsetY = -95;
            offsetX = (count === 1) ? 0 : (idx - (count - 1) / 2) * 72;
          } else if (node.id === 'storm') {
            // Storm Belt: dock to South (wide open ocean)
            offsetY = +95;
            offsetX = (count === 1) ? 0 : (idx - (count - 1) / 2) * 72;
          } else if (node.id === 'seaS') {
            // Sunset Sea South: dock to East (towards Shield Isles)
            offsetX = +108;
            if (count === 1) {
              offsetY = 0;
            } else if (count === 2) {
              offsetY = (idx === 0) ? -24 : 24;
            } else {
              offsetY = (idx - 1) * 44;
            }
          } else {
            // Sunset Sea North & Central: dock to West (left)
            offsetX = -108;
            if (count === 1) {
              offsetY = 0;
            } else if (count === 2) {
              offsetY = (idx === 0) ? -24 : 24;
            } else {
              offsetY = (idx - 1) * 44;
            }
          }
        } else {
          // Green Land nodes: dock above keep
          offsetX = (idx - (count - 1) / 2) * 72;
          offsetY = -78;
        }

        // Draw subtle faction-colored anchor line from node to ship dock
        const anchorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        anchorLine.setAttribute('x1', node.x);
        anchorLine.setAttribute('y1', node.y);
        anchorLine.setAttribute('x2', node.x + offsetX);
        anchorLine.setAttribute('y2', node.y + offsetY);
        anchorLine.setAttribute('stroke', factionColors[ship.faction] || '#f5c518');
        anchorLine.setAttribute('stroke-width', '2');
        anchorLine.setAttribute('stroke-dasharray', '4,4');
        anchorLine.setAttribute('opacity', '0.4');
        this.shipsGroup.appendChild(anchorLine);

        g.setAttribute('transform', `translate(${node.x + offsetX}, ${node.y + offsetY})`);

        // Integrated Capsule Badge (width 66, height 36, rx 18)
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'ship-capsule-badge');
        rect.setAttribute('x', '-33');
        rect.setAttribute('y', '-18');
        rect.setAttribute('width', '66');
        rect.setAttribute('height', '36');
        rect.setAttribute('rx', '18');
        rect.setAttribute('fill', factionColors[ship.faction] || '#f39c12');
        rect.setAttribute('stroke', ship.is_flagship ? '#f5c518' : '#ffffff');
        rect.setAttribute('stroke-width', ship.is_flagship ? '3.5' : '2');
        rect.setAttribute('filter', 'url(#drop-shadow)');
        if (ship.crew === 0 && !ship.is_flagship) {
          rect.setAttribute('opacity', '0.75');
        }
        g.appendChild(rect);

        // Ship symbol (Left side)
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '-14');
        symbol.setAttribute('y', '6');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('fill', '#000');
        symbol.setAttribute('font-size', ship.is_flagship ? '16' : '15');
        symbol.setAttribute('font-weight', '900');
        symbol.textContent = ship.is_flagship ? '★' : '⛵';
        g.appendChild(symbol);

        // Inner Crew Pill Container (Right side)
        const innerPill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        innerPill.setAttribute('x', '0');
        innerPill.setAttribute('y', '-13');
        innerPill.setAttribute('width', '28');
        innerPill.setAttribute('height', '26');
        innerPill.setAttribute('rx', '13');
        innerPill.setAttribute('fill', '#08101d');
        innerPill.setAttribute('stroke', ship.is_flagship ? '#f5c518' : '#ffffff');
        innerPill.setAttribute('stroke-width', '1.5');
        g.appendChild(innerPill);

        // Crew Number (Centered in inner pill)
        const crewText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        crewText.setAttribute('x', '14');
        crewText.setAttribute('y', '6');
        crewText.setAttribute('text-anchor', 'middle');
        crewText.setAttribute('fill', '#ffffff');
        crewText.setAttribute('font-family', 'Inter, sans-serif');
        crewText.setAttribute('font-size', '15');
        crewText.setAttribute('font-weight', '900');
        crewText.textContent = ship.crew;
        g.appendChild(crewText);

        g.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleShipClick(ship.id, nodeId);
        });

        g.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.onRightClick) {
            this.onRightClick({ type: 'ship', shipId: ship.id, nodeId: nodeId });
          }
        });

        this.shipsGroup.appendChild(g);
      });
    });
  }

  handleNodeClick(nodeId) {
    this.selectedNodeId = nodeId;
    this.selectedShipId = null;
    this.highlightSelection();
    if (this.onSelect) {
      this.onSelect({ type: 'node', nodeId });
    }
  }

  handleShipClick(shipId, nodeId) {
    this.selectedShipId = shipId;
    this.selectedNodeId = nodeId;
    this.highlightSelection();
    if (this.onSelect) {
      this.onSelect({ type: 'ship', shipId, nodeId });
    }
  }

  clearSelection() {
    this.selectedNodeId = null;
    this.selectedShipId = null;
    this.highlightSelection();
    if (this.onSelect) {
      this.onSelect({ type: 'none' });
    }
  }

  highlightSelection() {
    document.querySelectorAll('.node-selected').forEach(el => el.classList.remove('node-selected'));
    document.querySelectorAll('.ship-selected').forEach(el => el.classList.remove('ship-selected'));
    document.querySelectorAll('.target-highlight').forEach(el => el.classList.remove('target-highlight'));
    document.querySelectorAll('.reave-highlight').forEach(el => el.classList.remove('reave-highlight'));
    document.querySelectorAll('.ship-halo, .ship-pointer').forEach(el => el.remove());

    if (this.selectedNodeId) {
      const g = document.getElementById(`node-g-${this.selectedNodeId}`);
      if (g) g.classList.add('node-selected');
    }

    if (this.selectedShipId) {
      const shipG = document.getElementById(`ship-g-${this.selectedShipId}`);
      if (shipG) {
        shipG.classList.add('ship-selected');

        // Remove existing halo/pointer if any
        shipG.querySelectorAll('.ship-halo, .ship-pointer').forEach(el => el.remove());

        // Append animated Halo
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        halo.setAttribute('class', 'ship-halo');
        halo.setAttribute('x', '-40');
        halo.setAttribute('y', '-25');
        halo.setAttribute('width', '80');
        halo.setAttribute('height', '50');
        halo.setAttribute('rx', '25');
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', '#f5c518');
        halo.setAttribute('stroke-width', '4');
        halo.setAttribute('stroke-dasharray', '6,4');
        shipG.appendChild(halo);

        // Append bouncing Pointer
        const pointer = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        pointer.setAttribute('class', 'ship-pointer');
        pointer.setAttribute('x', '0');
        pointer.setAttribute('y', '-26');
        pointer.setAttribute('text-anchor', 'middle');
        pointer.setAttribute('font-size', '22');
        pointer.setAttribute('font-weight', '900');
        pointer.setAttribute('fill', '#f5c518');
        pointer.textContent = '▼';
        shipG.appendChild(pointer);

        // Bring selected ship to front so aura is prominent
        if (shipG.parentNode) {
          shipG.parentNode.appendChild(shipG);
        }
      }
    }

    if (this.selectedShipId && this.gameState) {
      const activeFaction = this.gameState.active_faction;
      let shipLocation = null;
      let selectedShip = null;

      for (const [nId, n] of Object.entries(this.gameState.nodes)) {
        for (const s of n.occupants) {
          if (s.id === this.selectedShipId) {
            shipLocation = nId;
            selectedShip = s;
            break;
          }
        }
      }

      if (shipLocation && selectedShip && selectedShip.faction === activeFaction) {
        const nodeMap = {};
        this.mapData.nodes.forEach(n => nodeMap[n.id] = n);

        this.mapData.edges.forEach(edge => {
          let neighbor = null;
          if (edge[0] === shipLocation) neighbor = edge[1];
          if (edge[1] === shipLocation) neighbor = edge[0];

          if (neighbor && nodeMap[neighbor]) {
            const nObj = nodeMap[neighbor];
            const targetEl = document.getElementById(`node-g-${neighbor}`);
            if (targetEl) {
              if (nObj.kind === 'land') {
                targetEl.classList.add('reave-highlight');
              } else {
                targetEl.classList.add('target-highlight');
              }
            }
          }
        });
      }
    }
  }
}
