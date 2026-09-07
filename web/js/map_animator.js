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
    const node = this.renderer.mapData ? this.renderer.mapData.nodes.find(n => n.id === nodeId) : null;
    let baseOffsetX = 0;
    let baseOffsetY = -52;

    if (node && node.dock_offset) {
      baseOffsetX = node.dock_offset.x;
      baseOffsetY = node.dock_offset.y;
    } else if (node && node.kind === 'isle') {
      baseOffsetY = -62;
    } else if (node && node.kind === 'storm') {
      baseOffsetX = -108;
      baseOffsetY = 0;
    }

    const shipSpacing = 36;
    const startX = baseOffsetX - ((count - 1) * shipSpacing) / 2;
    const x = startX + idx * shipSpacing;
    const y = baseOffsetY;

    return { x, y };
  }

  getNodeCenter(nodeId) {
    const node = this.renderer.mapData ? this.renderer.mapData.nodes.find(n => n.id === nodeId) : null;
    return node ? { x: node.x, y: node.y } : { x: 960, y: 540 };
  }

  getShipCoordinates(nodeId, shipId = null) {
    const nodePos = this.getNodeCenter(nodeId);
    let dock = { x: 0, y: -52 };
    if (this.renderer.lastGameState && this.renderer.lastGameState.nodes[nodeId]) {
      const occupants = this.renderer.lastGameState.nodes[nodeId].occupants.filter(s => s.is_flagship || s.crew > 0);
      const idx = shipId ? occupants.findIndex(s => s.id === shipId) : 0;
      dock = this.getDockOffset(nodeId, Math.max(1, occupants.length), Math.max(0, idx));
    } else {
      dock = this.getDockOffset(nodeId, 1, 0);
    }
    return { x: nodePos.x + dock.x, y: nodePos.y + dock.y };
  }

  animateShipSail(shipId, fromNodeId, toNodeId, faction = 'Asha') {
    return new Promise((resolve) => {
      const fromPos = this.getShipCoordinates(fromNodeId, shipId);
      const toPos = this.getShipCoordinates(toNodeId, shipId);

      const wakeLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      wakeLine.setAttribute('class', 'sailing-wake-line');
      wakeLine.setAttribute('x1', fromPos.x);
      wakeLine.setAttribute('y1', fromPos.y);
      wakeLine.setAttribute('x2', toPos.x);
      wakeLine.setAttribute('y2', toPos.y);
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
      } else {
        shipEl.setAttribute('transform', `translate(${fromPos.x}, ${fromPos.y})`);
      }

      shipEl.classList.add('ship-gliding');

      requestAnimationFrame(() => {
        shipEl.setAttribute('transform', `translate(${toPos.x}, ${toPos.y})`);
      });

      setTimeout(() => {
        shipEl.classList.remove('ship-gliding');
        if (wakeLine.parentNode) wakeLine.parentNode.removeChild(wakeLine);
        if (ephemeralShip && shipEl.parentNode) shipEl.parentNode.removeChild(shipEl);
        resolve();
      }, 680);
    });
  }

  animateReaveTargeting(fromSeaNodeId, targetLandId, outcome, shipId = null) {
    return new Promise((resolve) => {
      const shipPos = this.getShipCoordinates(fromSeaNodeId, shipId);
      const keepPos = this.getNodeCenter(targetLandId);

      const targetLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      targetLine.setAttribute('class', 'raid-targeting-line');
      targetLine.setAttribute('x1', shipPos.x);
      targetLine.setAttribute('y1', shipPos.y);
      targetLine.setAttribute('x2', keepPos.x);
      targetLine.setAttribute('y2', keepPos.y);
      this.overlaysGroup.appendChild(targetLine);

      const projectile = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      projectile.setAttribute('class', 'raid-projectile');
      projectile.setAttribute('x', shipPos.x);
      projectile.setAttribute('y', shipPos.y);
      projectile.textContent = '🪓';
      projectile.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1)';
      this.overlaysGroup.appendChild(projectile);

      requestAnimationFrame(() => {
        const dx = keepPos.x - shipPos.x;
        const dy = keepPos.y - shipPos.y;
        projectile.style.transform = `translate(${dx}px, ${dy}px) rotate(360deg)`;
      });

      setTimeout(() => {
        if (projectile.parentNode) projectile.parentNode.removeChild(projectile);
        if (targetLine.parentNode) targetLine.parentNode.removeChild(targetLine);

        const keepEl = document.getElementById(`node-g-${targetLandId}`);

        if (outcome && outcome.success) {
          if (keepEl) keepEl.classList.add('keep-sacked-flash');

          const coinsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const icons = ['💰', '🪙', '✨', '🔥'];
          icons.forEach((c, i) => {
            const pText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            pText.setAttribute('class', 'floating-loot-particle');
            pText.setAttribute('x', keepPos.x);
            pText.setAttribute('y', keepPos.y);
            pText.textContent = c;
            const spreadX = (Math.random() - 0.5) * 60;
            const spreadY = -30 - Math.random() * 30;
            const toShipX = shipPos.x - keepPos.x + (Math.random() - 0.5) * 20;
            const toShipY = shipPos.y - keepPos.y + (Math.random() - 0.5) * 20;
            pText.style.setProperty('--dx20', `${spreadX}px`);
            pText.style.setProperty('--dy20', `${spreadY}px`);
            pText.style.setProperty('--dx100', `${toShipX}px`);
            pText.style.setProperty('--dy100', `${toShipY}px`);
            pText.style.animationDelay = `${i * 80}ms`;
            coinsGroup.appendChild(pText);
          });
          this.overlaysGroup.appendChild(coinsGroup);

          setTimeout(() => {
            if (keepEl) keepEl.classList.remove('keep-sacked-flash');
            if (coinsGroup.parentNode) coinsGroup.parentNode.removeChild(coinsGroup);
            resolve();
          }, 950);
        } else {
          const shieldRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          shieldRing.setAttribute('class', 'shield-repel-ring');
          shieldRing.setAttribute('cx', keepPos.x);
          shieldRing.setAttribute('cy', keepPos.y);
          this.overlaysGroup.appendChild(shieldRing);

          const shieldIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          shieldIcon.setAttribute('class', 'shield-deflect-icon');
          shieldIcon.setAttribute('x', keepPos.x);
          shieldIcon.setAttribute('y', keepPos.y);
          shieldIcon.textContent = '🛡️';
          this.overlaysGroup.appendChild(shieldIcon);

          setTimeout(() => {
            if (shieldRing.parentNode) shieldRing.parentNode.removeChild(shieldRing);
            if (shieldIcon.parentNode) shieldIcon.parentNode.removeChild(shieldIcon);
            resolve();
          }, 850);
        }
      }, 420);
    });
  }

  animateNavalClash(seaNodeId) {
    return new Promise((resolve) => {
      const center = this.getNodeCenter(seaNodeId);

      const clashRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      clashRing.setAttribute('class', 'naval-clash-ring');
      clashRing.setAttribute('cx', center.x);
      clashRing.setAttribute('cy', center.y);
      this.overlaysGroup.appendChild(clashRing);

      const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('class', 'naval-clash-badge');
      badgeG.setAttribute('transform', `translate(${center.x}, ${center.y})`);

      const swordText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      swordText.setAttribute('text-anchor', 'middle');
      swordText.setAttribute('y', '8');
      swordText.setAttribute('font-size', '44');
      swordText.textContent = '⚔️';
      badgeG.appendChild(swordText);

      this.overlaysGroup.appendChild(badgeG);

      setTimeout(() => {
        if (clashRing.parentNode) clashRing.parentNode.removeChild(clashRing);
        if (badgeG.parentNode) badgeG.parentNode.removeChild(badgeG);
        resolve();
      }, 750);
    });
  }

  animateShipDefeat(shipId, nodeId, outcomeType = 'sunk') {
    return new Promise((resolve) => {
      const shipPos = this.getShipCoordinates(nodeId, shipId);
      const shipEl = document.getElementById(`ship-g-${shipId}`);

      if (outcomeType === 'sunk') {
        const splash = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        splash.setAttribute('class', 'whirlpool-splash');
        splash.setAttribute('x', shipPos.x);
        splash.setAttribute('y', shipPos.y + 6);
        splash.setAttribute('text-anchor', 'middle');
        splash.setAttribute('font-size', '48');
        splash.textContent = '🌀';
        this.overlaysGroup.appendChild(splash);

        if (shipEl) {
          shipEl.classList.add('ship-sinking');
          shipEl.style.transform = `translate(${shipPos.x}px, ${shipPos.y}px) scale(0.2) rotate(35deg)`;
          shipEl.style.opacity = '0';
        }

        setTimeout(() => {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
          resolve();
        }, 900);
      } else {
        resolve();
      }
    });
  }
}
