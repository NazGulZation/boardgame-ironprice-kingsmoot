/**
 * IRON PRICE: Kingsmoot — Map Animator
 * Coordinates tactical SVG animations: sailing tweens, keep raids, naval clashes, and ship sinking.
 */

class MapAnimator {
  constructor(mapRenderer) {
    this.renderer = mapRenderer;
  }

  get overlaysGroup() {
    return this.renderer.overlaysGroup;
  }

  getDockOffset(nodeId, count = 1, idx = 0) {
    const node = (this.renderer.gameState && this.renderer.gameState.nodes[nodeId]) ||
                 (this.renderer.lastGameState && this.renderer.lastGameState.nodes[nodeId]) ||
                 (this.renderer.mapData ? this.renderer.mapData.nodes.find(n => n.id === nodeId) : null);
    if (!node) return { offsetX: 0, offsetY: 0, x: 0, y: 0 };

    let offsetX = 0;
    let offsetY = 0;

    if (node.dock_offset) {
      offsetX = node.dock_offset.x;
      offsetY = node.dock_offset.y;
    } else if (node.kind === 'isle') {
      offsetX = -108;
      if (count === 1) offsetY = 0;
      else if (count === 2) offsetY = (idx === 0) ? -24 : 24;
      else offsetY = (idx - 1) * 44;
    } else if (node.kind === 'sea') {
      if (node.id === 'bay') {
        offsetY = -95;
        offsetX = (count === 1) ? 0 : (idx - (count - 1) / 2) * 72;
      } else if (node.id === 'storm') {
        offsetX = -108;
        if (count === 1) offsetY = 0;
        else if (count === 2) offsetY = (idx === 0) ? -24 : 24;
        else offsetY = (idx - 1) * 44;
      } else if (node.id === 'seaS') {
        offsetX = +108;
        if (count === 1) offsetY = 0;
        else if (count === 2) offsetY = (idx === 0) ? -24 : 24;
        else offsetY = (idx - 1) * 44;
      } else {
        offsetX = -108;
        if (count === 1) offsetY = 0;
        else if (count === 2) offsetY = (idx === 0) ? -24 : 24;
        else offsetY = (idx - 1) * 44;
      }
    } else {
      offsetX = (idx - (count - 1) / 2) * 72;
      offsetY = -78;
    }

    return { offsetX, offsetY, x: offsetX, y: offsetY };
  }

  getNodeCenter(nodeId) {
    const node = (this.renderer.mapData ? this.renderer.mapData.nodes.find(n => n.id === nodeId) : null) ||
                 (this.renderer.gameState ? this.renderer.gameState.nodes[nodeId] : null);
    return node ? { x: node.x, y: node.y } : { x: 960, y: 540 };
  }

  getShipCoordinates(nodeId, shipId = null) {
    const nodePos = this.getNodeCenter(nodeId);
    const gs = this.renderer.gameState || this.renderer.lastGameState;
    let dock = { offsetX: 0, offsetY: -52, x: 0, y: -52 };
    if (gs && gs.nodes[nodeId]) {
      // Use the FULL occupant list so indices match renderShips() exactly.
      // (Filtering out 0-crew hulls here shifted every dock slot and moved
      // clash/raid markers away from the rendered badges.)
      const occupants = gs.nodes[nodeId].occupants;
      let idx = 0;
      if (shipId) {
        const found = occupants.findIndex(s => s.id === shipId);
        idx = found >= 0 ? found : 0;
      }
      dock = this.getDockOffset(nodeId, Math.max(1, occupants.length), Math.max(0, idx));
    } else {
      dock = this.getDockOffset(nodeId, 1, 0);
    }
    const offX = dock.offsetX ?? dock.x ?? 0;
    const offY = dock.offsetY ?? dock.y ?? 0;
    return { x: nodePos.x + offX, y: nodePos.y + offY };
  }

  getRenderedShipPosition(shipId) {
    const el = document.getElementById(`ship-g-${shipId}`);
    if (!el) return null;
    const t = el.getAttribute('transform') || '';
    const m = t.match(/translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)/);
    if (!m) return null;
    return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
  }

  getDockSlotPosition(nodeId, idx, count) {
    const nodePos = this.getNodeCenter(nodeId);
    const dock = this.getDockOffset(nodeId, count, idx);
    const offX = dock.offsetX ?? dock.x ?? 0;
    const offY = dock.offsetY ?? dock.y ?? 0;
    return { x: nodePos.x + offX, y: nodePos.y + offY };
  }

  findShipNode(shipId) {
    const gs = this.renderer.gameState || this.renderer.lastGameState;
    if (!gs || !gs.nodes) return null;
    for (const [nid, node] of Object.entries(gs.nodes)) {
      if (node.occupants && node.occupants.some(s => s.id === shipId)) return nid;
    }
    return null;
  }

  isShipAtNode(nodeId, shipId) {
    const gs = this.renderer.gameState || this.renderer.lastGameState;
    const node = gs && gs.nodes ? gs.nodes[nodeId] : null;
    return Boolean(node && node.occupants && node.occupants.some(s => s.id === shipId));
  }

  animateShipSail(shipId, fromNodeId, toNodeId, faction = 'Asha') {
    return new Promise((resolve) => {
      const fromPos = this.getShipCoordinates(fromNodeId, shipId);
      const toPos = this.getShipCoordinates(toNodeId, shipId);

      const wakeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      wakeLine.setAttribute('class', 'sailing-wake-line');
      wakeLine.setAttribute('x1', fromPos.x);
      wakeLine.setAttribute('y1', fromPos.y);
      wakeLine.setAttribute('x2', fromPos.x);
      wakeLine.setAttribute('y2', fromPos.y);
      this.overlaysGroup.appendChild(wakeLine);

      let shipEl = document.getElementById(`ship-g-${shipId}`);
      let ephemeralShip = false;

      if (!shipEl) {
        ephemeralShip = true;
        shipEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        shipEl.setAttribute('transform', `translate(${fromPos.x}, ${fromPos.y})`);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '-24');
        rect.setAttribute('y', '-14');
        rect.setAttribute('width', '48');
        rect.setAttribute('height', '28');
        rect.setAttribute('rx', '14');
        rect.setAttribute('fill', faction === 'Euron' ? '#8e44ad' : (faction === 'Victarion' ? '#c0392b' : '#27ae60'));
        rect.setAttribute('stroke', '#f5c518');
        rect.setAttribute('stroke-width', '3');
        shipEl.appendChild(rect);

        const sym = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sym.setAttribute('y', '6');
        sym.setAttribute('text-anchor', 'middle');
        sym.setAttribute('fill', '#000');
        sym.setAttribute('font-size', '16');
        sym.textContent = '⛵';
        shipEl.appendChild(sym);

        this.overlaysGroup.appendChild(shipEl);
      }

      const sailDuration = 560;
      const startTime = performance.now();

      const animateSail = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / sailDuration);
        const t = Math.sin((progress * Math.PI) / 2);

        const curX = fromPos.x + (toPos.x - fromPos.x) * t;
        const curY = fromPos.y + (toPos.y - fromPos.y) * t;

        shipEl.setAttribute('transform', `translate(${curX.toFixed(1)}, ${curY.toFixed(1)})`);
        wakeLine.setAttribute('x2', curX.toFixed(1));
        wakeLine.setAttribute('y2', curY.toFixed(1));

        if (progress < 1) {
          requestAnimationFrame(animateSail);
        } else {
          if (wakeLine.parentNode) wakeLine.parentNode.removeChild(wakeLine);
          if (ephemeralShip && shipEl.parentNode) shipEl.parentNode.removeChild(shipEl);
          resolve();
        }
      };

      requestAnimationFrame(animateSail);
    });
  }

  animateReaveTargeting(fromSeaNodeId, targetLandId, outcome, shipId = null) {
    return new Promise((resolve) => {
      const shipPos = this.getShipCoordinates(fromSeaNodeId, shipId);
      const keepPos = this.getNodeCenter(targetLandId);

      // 1. Sleek targeting trajectory line from ship to keep
      const targetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      targetLine.setAttribute('class', 'raid-targeting-line');
      targetLine.setAttribute('x1', shipPos.x);
      targetLine.setAttribute('y1', shipPos.y);
      targetLine.setAttribute('x2', shipPos.x);
      targetLine.setAttribute('y2', shipPos.y);
      this.overlaysGroup.appendChild(targetLine);

      // 2. Thrown Iron War Axe group centered at local (0, 0)
      const projGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      projGroup.setAttribute('transform', `translate(${shipPos.x}, ${shipPos.y})`);

      const axeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      axeText.setAttribute('class', 'raid-axe-icon');
      axeText.setAttribute('text-anchor', 'middle');
      axeText.setAttribute('dominant-baseline', 'central');
      axeText.setAttribute('font-size', '28');
      axeText.setAttribute('fill', '#dce6f2');
      axeText.textContent = '⚔';
      projGroup.appendChild(axeText);
      this.overlaysGroup.appendChild(projGroup);

      const flightDuration = 450;
      const startTime = performance.now();

      const animateFlight = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / flightDuration);
        const t = Math.sin((progress * Math.PI) / 2);

        const curX = shipPos.x + (keepPos.x - shipPos.x) * t;
        const arcY = -40 * Math.sin(progress * Math.PI);
        const curY = shipPos.y + (keepPos.y - shipPos.y) * t + arcY;
        const rotation = progress * 720;

        projGroup.setAttribute('transform', `translate(${curX.toFixed(1)}, ${curY.toFixed(1)}) rotate(${rotation.toFixed(1)})`);
        targetLine.setAttribute('x2', curX.toFixed(1));
        targetLine.setAttribute('y2', curY.toFixed(1));

        if (progress < 1) {
          requestAnimationFrame(animateFlight);
        } else {
          if (projGroup.parentNode) projGroup.parentNode.removeChild(projGroup);
          if (targetLine.parentNode) targetLine.parentNode.removeChild(targetLine);
          this._handleRaidImpact(keepPos, shipPos, targetLandId, outcome, shipId, resolve);
        }
      };

      requestAnimationFrame(animateFlight);
    });
  }

  _handleRaidImpact(keepPos, shipPos, targetLandId, outcome, shipId, onComplete) {
    const keepEl = document.getElementById(`node-g-${targetLandId}`);
    const isSuccess = Boolean(outcome && outcome.success);
    if (outcome && outcome.crew_lost > 0) {
      this.animateCrewLoss(shipId || outcome.ship_id, outcome.crew_lost, null, shipPos);
    }

    // Impact shockwave circle expanding from keep center
    const shockwave = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shockwave.setAttribute('cx', keepPos.x);
    shockwave.setAttribute('cy', keepPos.y);
    shockwave.setAttribute('r', '16');
    shockwave.setAttribute('fill', 'none');
    shockwave.setAttribute('stroke', isSuccess ? '#f39c12' : '#3498db');
    shockwave.setAttribute('stroke-width', '4');
    shockwave.style.transition = 'r 0.35s ease-out, opacity 0.35s ease-out, stroke-width 0.35s ease-out';
    this.overlaysGroup.appendChild(shockwave);

    requestAnimationFrame(() => {
      shockwave.setAttribute('r', '65');
      shockwave.setAttribute('stroke-width', '1');
      shockwave.style.opacity = '0';
    });

    if (keepEl) {
      keepEl.classList.add(isSuccess ? 'keep-sacked-flash' : 'keep-defended-flash');
    }

    if (isSuccess) {
      // 1. Impact burst icon
      const burstText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      burstText.setAttribute('x', keepPos.x);
      burstText.setAttribute('y', keepPos.y);
      burstText.setAttribute('text-anchor', 'middle');
      burstText.setAttribute('dominant-baseline', 'central');
      burstText.setAttribute('font-size', '28');
      burstText.setAttribute('fill', '#f5cf68');
      burstText.textContent = '⚔';
      burstText.style.transition = 'opacity 0.25s ease-out';
      this.overlaysGroup.appendChild(burstText);

      // 2. Plundered loot coins flying back to ship
      const lootContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.overlaysGroup.appendChild(lootContainer);

      const lootIcons = ['⛃', '✦', '⛃', '✦'];
      const coinElements = lootIcons.map((icon, i) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const spreadX = (Math.random() - 0.5) * 40;
        const spreadY = (Math.random() - 0.5) * 40;
        const startX = keepPos.x + spreadX;
        const startY = keepPos.y + spreadY;
        g.setAttribute('transform', `translate(${startX}, ${startY})`);
        
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('class', 'raid-loot-icon');
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('dominant-baseline', 'central');
        txt.setAttribute('font-size', '26');
        txt.setAttribute('fill', icon === '✦' ? '#fff4b8' : '#f5cf68');
        txt.style.filter = 'drop-shadow(0 0 6px rgba(245, 207, 104, 0.85)) drop-shadow(0 2px 4px #000)';
        txt.textContent = icon;
        g.appendChild(txt);
        lootContainer.appendChild(g);

        return { g, startX, startY, delay: i * 85 };
      });

      const lootStart = performance.now() + 150;
      const lootDuration = 520;

      const animateLoot = (now) => {
        let allDone = true;
        coinElements.forEach(item => {
          const coinElapsed = now - (lootStart + item.delay);
          if (coinElapsed < 0) {
            allDone = false;
            return;
          }
          const p = Math.min(1, coinElapsed / lootDuration);
          if (p < 1) allDone = false;

          const easeP = Math.sin((p * Math.PI) / 2);
          const curX = item.startX + (shipPos.x - item.startX) * easeP;
          const arcY = -35 * Math.sin(p * Math.PI);
          const curY = item.startY + (shipPos.y - item.startY) * easeP + arcY;
          const scale = Math.max(0.3, 1.2 - p * 0.4);
          const opacity = p > 0.85 ? (1 - p) / 0.15 : 1;

          item.g.setAttribute('transform', `translate(${curX.toFixed(1)}, ${curY.toFixed(1)}) scale(${scale.toFixed(2)})`);
          item.g.style.opacity = opacity.toFixed(2);
        });

        if (!allDone) {
          requestAnimationFrame(animateLoot);
        } else {
          if (shockwave.parentNode) shockwave.parentNode.removeChild(shockwave);
          if (burstText.parentNode) burstText.parentNode.removeChild(burstText);
          if (lootContainer.parentNode) lootContainer.parentNode.removeChild(lootContainer);
          if (keepEl) keepEl.classList.remove('keep-sacked-flash');
          
          const shipEl = shipId ? document.getElementById(`ship-g-${shipId}`) : null;
          if (shipEl) {
            shipEl.classList.add('ship-loot-flash');
            setTimeout(() => shipEl.classList.remove('ship-loot-flash'), 400);
          }
          onComplete();
        }
      };

      setTimeout(() => {
        if (burstText.parentNode) burstText.style.opacity = '0';
        requestAnimationFrame(animateLoot);
      }, 180);

    } else {
      // Repelled / Defended
      const defGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      defGroup.setAttribute('transform', `translate(${keepPos.x}, ${keepPos.y})`);

      const shieldCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      shieldCircle.setAttribute('r', '32');
      shieldCircle.setAttribute('fill', 'rgba(52, 152, 219, 0.25)');
      shieldCircle.setAttribute('stroke', '#3498db');
      shieldCircle.setAttribute('stroke-width', '3');
      shieldCircle.style.filter = 'drop-shadow(0 0 10px #2980b9)';
      defGroup.appendChild(shieldCircle);

      const shieldText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      shieldText.setAttribute('text-anchor', 'middle');
      shieldText.setAttribute('dominant-baseline', 'central');
      shieldText.setAttribute('font-size', '30');
      shieldText.setAttribute('fill', '#9ab0c4');
      shieldText.textContent = '⛨';
      defGroup.appendChild(shieldText);

      // Deflected axe bouncing backward
      const bounceAxe = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      bounceAxe.setAttribute('class', 'raid-axe-icon');
      bounceAxe.setAttribute('text-anchor', 'middle');
      bounceAxe.setAttribute('dominant-baseline', 'central');
      bounceAxe.setAttribute('font-size', '24');
      bounceAxe.setAttribute('fill', '#dce6f2');
      bounceAxe.textContent = '⚔';
      bounceAxe.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
      defGroup.appendChild(bounceAxe);

      this.overlaysGroup.appendChild(defGroup);

      requestAnimationFrame(() => {
        const bounceDx = (shipPos.x - keepPos.x) * 0.18;
        const bounceDy = (shipPos.y - keepPos.y) * 0.18 - 25;
        bounceAxe.style.transform = `translate(${bounceDx.toFixed(1)}px, ${bounceDy.toFixed(1)}px) rotate(-180deg)`;
        bounceAxe.style.opacity = '0';
      });

      setTimeout(() => {
        if (shockwave.parentNode) shockwave.parentNode.removeChild(shockwave);
        if (defGroup.parentNode) defGroup.parentNode.removeChild(defGroup);
        if (keepEl) keepEl.classList.remove('keep-defended-flash');
        onComplete();
      }, 750);
    }
  }

  animateNavalClash(seaNodeId, attackerShipId = null, defenderShipId = null) {
    return new Promise((resolve) => {
      let clashX, clashY;
      if (attackerShipId && defenderShipId) {
        // Ground truth first: live badge positions already on screen.
        const renderedA = this.getRenderedShipPosition(attackerShipId);
        const renderedD = this.getRenderedShipPosition(defenderShipId);
        const attAtNode = this.isShipAtNode(seaNodeId, attackerShipId);
        const defAtNode = this.isShipAtNode(seaNodeId, defenderShipId);

        if (renderedA && renderedD && attAtNode && defAtNode) {
          // Both combatants co-located: midpoint between visible badges.
          clashX = (renderedA.x + renderedD.x) / 2;
          clashY = (renderedA.y + renderedD.y) / 2;
        } else if (attAtNode && defAtNode) {
          // Co-located in state but DOM not ready: dock-slot midpoint.
          const posA = this.getShipCoordinates(seaNodeId, attackerShipId);
          const posD = this.getShipCoordinates(seaNodeId, defenderShipId);
          clashX = (posA.x + posD.x) / 2;
          clashY = (posA.y + posD.y) / 2;
        } else {
          // Post-battle state (AI auto-resolve pushed the loser home):
          // reconstruct battle-time slots so the swords sit over the
          // sea zone's dock area, not on the winner's badge or at
          // a collapsed single-slot fallback.
          const slotA = this.getDockSlotPosition(seaNodeId, 0, 2);
          const slotD = this.getDockSlotPosition(seaNodeId, 1, 2);
          clashX = (slotA.x + slotD.x) / 2;
          clashY = (slotA.y + slotD.y) / 2;
        }
      } else {
        const onlyId = attackerShipId || defenderShipId;
        const rendered = onlyId ? this.getRenderedShipPosition(onlyId) : null;
        if (rendered) {
          clashX = rendered.x;
          clashY = rendered.y;
        } else {
          const shipPos = this.getShipCoordinates(seaNodeId, onlyId);
          clashX = shipPos.x;
          clashY = shipPos.y;
        }
      }

      const clashRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      clashRing.setAttribute('class', 'naval-clash-ring');
      clashRing.setAttribute('cx', clashX);
      clashRing.setAttribute('cy', clashY);
      this.overlaysGroup.appendChild(clashRing);

      // Outer g holds the clash position; inner g runs the CSS pop.
      // (CSS transforms override the SVG transform attribute, so the
      // animated class must NOT sit on the positioned element.)
      const badgePos = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgePos.setAttribute('transform', `translate(${clashX}, ${clashY})`);
      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('class', 'naval-clash-badge');

      const swordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      swordText.setAttribute('text-anchor', 'middle');
      swordText.setAttribute('y', '8');
      swordText.setAttribute('font-size', '44');
      swordText.setAttribute('fill', '#f5cf68');
      swordText.textContent = '⚔';
      badgeG.appendChild(swordText);

      badgePos.appendChild(badgeG);
      this.overlaysGroup.appendChild(badgePos);

      setTimeout(() => {
        if (clashRing.parentNode) clashRing.parentNode.removeChild(clashRing);
        if (badgePos.parentNode) badgePos.parentNode.removeChild(badgePos);
        resolve();
      }, 850);
    });
  }

  animateShipDefeat(shipId, nodeId, outcomeType = 'sunk') {
    return new Promise((resolve) => {
      // Prefer the ship's live badge position (post-battle respawn may have
      // moved it home); fall back to its actual node, then the battle node.
      const rendered = this.getRenderedShipPosition(shipId);
      const actualNode = this.findShipNode(shipId);
      const shipPos = rendered
        || (actualNode ? this.getShipCoordinates(actualNode, shipId) : null)
        || this.getShipCoordinates(nodeId, shipId);
      const shipEl = document.getElementById(`ship-g-${shipId}`);

      if (outcomeType === 'sunk') {
        const splash = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        splash.setAttribute('class', 'whirlpool-splash');
        splash.setAttribute('x', shipPos.x);
        splash.setAttribute('y', shipPos.y + 6);
        splash.setAttribute('text-anchor', 'middle');
        splash.setAttribute('dominant-baseline', 'central');
        splash.setAttribute('font-size', '44');
        splash.setAttribute('fill', '#5a97b8');
        splash.textContent = '≋';
        this.overlaysGroup.appendChild(splash);

        const duration = 700;
        const startTime = performance.now();

        const animateSinking = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const scale = Math.max(0.05, 1 - progress * 0.95);
          const rot = progress * 180;
          const opacity = Math.max(0, 1 - progress);

          if (shipEl) {
            shipEl.setAttribute('transform', `translate(${shipPos.x}, ${shipPos.y}) scale(${scale.toFixed(2)}) rotate(${rot.toFixed(0)})`);
            shipEl.style.opacity = opacity.toFixed(2);
          }

          if (progress < 1) {
            requestAnimationFrame(animateSinking);
          } else {
            if (splash.parentNode) splash.parentNode.removeChild(splash);
            if (shipEl) {
              shipEl.style.opacity = '1';
            }
            resolve();
          }
        };

        requestAnimationFrame(animateSinking);
      } else {
        resolve();
      }
    });
  }

  animateCrewLoss(shipId, crewLost, nodeId = null, customPos = null) {
    if (!shipId || !crewLost || crewLost <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      let shipPos = customPos;
      if (!shipPos) {
        const rendered = this.getRenderedShipPosition(shipId);
        const actualNode = this.findShipNode(shipId);
        if (nodeId && this.isShipAtNode(nodeId, shipId)) {
          shipPos = rendered || this.getShipCoordinates(nodeId, shipId);
        } else if (nodeId) {
          shipPos = this.getShipCoordinates(nodeId, shipId);
        } else {
          shipPos = rendered || (actualNode ? this.getShipCoordinates(actualNode, shipId) : null);
        }
      }
      if (!shipPos) {
        resolve();
        return;
      }

      const outerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      outerG.setAttribute('transform', `translate(${shipPos.x.toFixed(1)}, ${(shipPos.y - 28).toFixed(1)})`);

      const innerG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      innerG.setAttribute('class', 'floating-crew-loss');

      const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      pill.setAttribute('class', 'floating-crew-loss-pill');
      pill.setAttribute('x', '-28');
      pill.setAttribute('y', '-14');
      pill.setAttribute('width', '56');
      pill.setAttribute('height', '28');
      pill.setAttribute('rx', '14');
      innerG.appendChild(pill);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('class', 'floating-crew-loss-text');
      txt.setAttribute('x', '0');
      txt.setAttribute('y', '0');
      txt.textContent = `-${crewLost} ⚔`;
      innerG.appendChild(txt);

      outerG.appendChild(innerG);
      this.overlaysGroup.appendChild(outerG);

      setTimeout(() => {
        if (outerG.parentNode) outerG.parentNode.removeChild(outerG);
        resolve();
      }, 1300);
    });
  }
}
