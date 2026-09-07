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
    this.animLock = 0;

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

    this.animator = new MapAnimator(this);
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
    MapBuilder.renderBase(this.svg, this.edgesGroup, this.nodesGroup, this.mapData, this);
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
        const center = this.getNodeCenter(nodeId);
        const nodeX = (node && typeof node.x === 'number') ? node.x : (center.x || 0);
        const nodeY = (node && typeof node.y === 'number') ? node.y : (center.y || 0);

        const offset = this.getDockOffset(nodeId, count, idx) || {};
        const offsetX = offset.offsetX ?? offset.x ?? 0;
        const offsetY = offset.offsetY ?? offset.y ?? 0;

        const shipX = nodeX + offsetX;
        const shipY = nodeY + offsetY;

        // Draw subtle faction-colored anchor line from node to ship dock
        const anchorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        anchorLine.setAttribute('x1', nodeX);
        anchorLine.setAttribute('y1', nodeY);
        anchorLine.setAttribute('x2', shipX);
        anchorLine.setAttribute('y2', shipY);
        anchorLine.setAttribute('stroke', factionColors[ship.faction] || '#f5c518');
        anchorLine.setAttribute('stroke-width', '2');
        anchorLine.setAttribute('stroke-dasharray', '4,4');
        anchorLine.setAttribute('opacity', '0.4');
        this.shipsGroup.appendChild(anchorLine);

        g.setAttribute('transform', `translate(${shipX}, ${shipY})`);

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

  setMiracleTargetMode(enabled, validSeaNodes = [], onTargetChosen = null) {
    this.miracleTargetMode = enabled;
    this.validMiracleNodes = validSeaNodes;
    this.onMiracleTargetChosen = onTargetChosen;
    this.highlightSelection();
  }

  handleNodeClick(nodeId) {
    if (this.isAnimating) return;
    if (this.miracleTargetMode) {
      if (this.validMiracleNodes && this.validMiracleNodes.includes(nodeId)) {
        if (this.onMiracleTargetChosen) {
          const cb = this.onMiracleTargetChosen;
          this.setMiracleTargetMode(false);
          cb(nodeId);
          return;
        }
      }
      this.setMiracleTargetMode(false);
    }

    this.selectedNodeId = nodeId;
    this.selectedShipId = null;
    this.highlightSelection();
    if (this.onSelect) {
      this.onSelect({ type: 'node', nodeId });
    }
  }

  handleShipClick(shipId, nodeId) {
    if (this.isAnimating) return;
    this.selectedShipId = shipId;
    this.selectedNodeId = nodeId;
    this.highlightSelection();
    if (this.onSelect) {
      this.onSelect({ type: 'ship', shipId, nodeId });
    }
  }

  clearSelection() {
    if (this.isAnimating) return;
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

    if (this.miracleTargetMode && this.validMiracleNodes) {
      this.validMiracleNodes.forEach(nId => {
        const el = document.getElementById(`node-g-${nId}`);
        if (el) el.classList.add('reave-highlight');
      });
    }

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

  // ---------------- COORDINATE & ANIMATION HELPERS (Delegated to MapAnimator) ----------------

  getDockOffset(nodeId, count = 1, idx = 0) {
    return this.animator.getDockOffset(nodeId, count, idx);
  }

  getNodeCenter(nodeId) {
    return this.animator.getNodeCenter(nodeId);
  }

  getShipCoordinates(nodeId, shipId = null) {
    return this.animator.getShipCoordinates(nodeId, shipId);
  }

  // Animation lock: board left-clicks are ignored while a map tween
  // runs, otherwise renderShips() rebuilds badge elements mid-flight and
  // the running animation breaks (detached nodes tween unseen).
  get isAnimating() { return this.animLock > 0; }
  lockAnims() { this.animLock++; }
  unlockAnims() { this.animLock = Math.max(0, this.animLock - 1); }
  guarded(fn) {
    this.lockAnims();
    let p;
    try { p = fn(); } catch (e) { this.unlockAnims(); throw e; }
    return Promise.resolve(p).then(
      (v) => { this.unlockAnims(); return v; },
      (e) => { this.unlockAnims(); throw e; }
    );
  }

  animateShipSail(shipId, fromNodeId, toNodeId, faction = 'Asha') {
    return this.guarded(() => this.animator.animateShipSail(shipId, fromNodeId, toNodeId, faction));
  }

  animateReaveTargeting(fromSeaNodeId, targetLandId, outcome, shipId = null) {
    return this.guarded(() => this.animator.animateReaveTargeting(fromSeaNodeId, targetLandId, outcome, shipId));
  }

  animateNavalClash(seaNodeId, attackerShipId = null, defenderShipId = null) {
    return this.guarded(() => this.animator.animateNavalClash(seaNodeId, attackerShipId, defenderShipId));
  }

  animateShipDefeat(shipId, nodeId, outcomeType = 'sunk') {
    return this.guarded(() => this.animator.animateShipDefeat(shipId, nodeId, outcomeType));
  }

  // Battle-time tableau from prevState with both hulls at the clash site,
  // so swords play where the fight happened even though nextState already
  // pushed losers home (WHAT IS DEAD respawns).
  _battleTableau(prevState, battle) {
    const nodeId = battle.node_id;
    let tableau = prevState;
    try {
      tableau = JSON.parse(JSON.stringify(prevState));
      const moveToClash = (sid) => {
        for (const [nid, n] of Object.entries(tableau.nodes)) {
          if (nid !== nodeId && n.occupants) {
            const i = n.occupants.findIndex(s => s.id === sid);
            if (i >= 0 && tableau.nodes[nodeId]) {
              tableau.nodes[nodeId].occupants.push(...tableau.nodes[nid].occupants.splice(i, 1));
              return;
            }
          }
        }
      };
      moveToClash(battle.attacker_ship_id);
      moveToClash(battle.defender_ship_id);
    } catch (e) { tableau = prevState; }
    return tableau;
  }

  // Swords play BEFORE the dice popup: tableau renders, clash resolves,
  // then the post-battle state (respawns) renders underneath the modal.
  async stageNavalClash(battle, prevState, nextState) {
    if (!battle) {
      if (nextState) this.update(nextState, { type: 'none' });
      return;
    }
    this.update((prevState && prevState.nodes) ? this._battleTableau(prevState, battle) : nextState, { type: 'none' });
    try {
      await this.animateNavalClash(battle.node_id, battle.attacker_ship_id, battle.defender_ship_id);
    } catch (e) { console.warn('Naval clash animation failed:', e); }
    if (nextState) this.update(nextState, { type: 'none' });
  }

  // Sinking plays AFTER the dice popup is dismissed: each sunk hull is
  // re-staged at the battle site from live state, sunk, then restored.
  async playShipSinking(battle) {
    let sunk = Array.isArray(battle.sunk_ship_ids) ? battle.sunk_ship_ids.slice() : null;
    if (!sunk && battle.state === 'finished' && battle.winner && !battle.is_stalemate) {
      sunk = [(battle.winner === battle.attacker_faction) ? battle.defender_ship_id : battle.attacker_ship_id];
    }
    if (!battle || !sunk || !sunk.length || !this.gameState) return;
    const nodeId = battle.node_id;
    const live = this.gameState;
    let tableau = null;
    try {
      tableau = JSON.parse(JSON.stringify(live));
      for (const sid of sunk) {
        for (const [nid, n] of Object.entries(tableau.nodes)) {
          if (nid !== nodeId && n.occupants) {
            const i = n.occupants.findIndex(s => s.id === sid);
            if (i >= 0 && tableau.nodes[nodeId]) {
              tableau.nodes[nodeId].occupants.push(...tableau.nodes[nid].occupants.splice(i, 1));
              break;
            }
          }
        }
      }
    } catch (e) { return; }
    this.update(tableau, { type: 'none' });
    for (const sid of sunk) {
      try { await this.animateShipDefeat(sid, nodeId, 'sunk'); }
      catch (e) { console.warn('Ship defeat animation failed:', e); }
    }
    this.update(live, { type: 'none' });
  }

  // Resolves once the reave dice popup is closed (instantly when none
  // is open), so ship-dying visuals never play underneath the modal.
  awaitReavePopupClosed() {
    const modal = document.getElementById('modal-reave');
    if (!modal || modal.style.display === 'none' || modal.style.display === '') return Promise.resolve();
    return new Promise((resolve) => {
      const failsafe = setTimeout(() => { clearInterval(iv); resolve(); }, 15000);
      const iv = setInterval(() => {
        if (!modal.isConnected || modal.style.display === 'none' || modal.style.display === '') {
          clearInterval(iv);
          clearTimeout(failsafe);
          resolve();
        }
      }, 120);
    });
  }

  // Pre-respawn raid view: dead hulls moved back to the raid origin so
  // the ship stays visible behind the dice popup instead of vanishing.
  // Returns postState unchanged when nobody died. Pure (never mutates).
  raidTableau(reaveOutcome, originNode, postState) {
    const dead = (reaveOutcome && Array.isArray(reaveOutcome.dead_ship_ids)) ? reaveOutcome.dead_ship_ids : [];
    if (!dead.length || !originNode || !postState || !postState.nodes) return postState;
    try {
      const tableau = JSON.parse(JSON.stringify(postState));
      if (!tableau.nodes[originNode]) return postState;
      for (const sid of dead) {
        for (const [nid, n] of Object.entries(tableau.nodes)) {
          if (nid !== originNode && n.occupants) {
            const i = n.occupants.findIndex(s => s.id === sid);
            if (i >= 0) {
              tableau.nodes[originNode].occupants.push(...tableau.nodes[nid].occupants.splice(i, 1));
              break;
            }
          }
        }
      }
      return tableau;
    } catch (e) { return postState; }
  }

  // Raid wipe: re-stages each dead hull at the raid origin from live
  // state, plays the whirlpool sinking, then restores. No-op otherwise.
  async playRaidDefeat(reaveOutcome, originNode) {
    const dead = (reaveOutcome && Array.isArray(reaveOutcome.dead_ship_ids)) ? reaveOutcome.dead_ship_ids : [];
    if (!dead.length || !originNode || !this.gameState) return;
    await this.awaitReavePopupClosed();
    const live = this.gameState;
    this.update(this.raidTableau(reaveOutcome, originNode, live), { type: 'none' });
    for (const sid of dead) {
      try { await this.animateShipDefeat(sid, originNode, 'sunk'); }
      catch (e) { console.warn('Raid defeat animation failed:', e); }
    }
    this.update(live, { type: 'none' });
  }
}
