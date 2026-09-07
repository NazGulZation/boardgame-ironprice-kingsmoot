/**
 * IRON PRICE: Kingsmoot — UI Component Controller (Phase 1)
 */

class UIController {
  constructor() {
    this.elements = {
      seasonDisplay: document.getElementById('season-display'),
      turnDisplay: document.getElementById('turn-display'),
      activeNameDisplay: document.getElementById('active-name-display'),
      activeBadgeBox: document.getElementById('active-player-badge'),
      actionsPips: document.getElementById('actions-pips-display'),
      claimantsList: document.getElementById('claimants-list'),
      selectedEntityName: document.getElementById('selected-entity-name'),
      panelActiveIndicator: document.getElementById('panel-active-indicator'),
      toastContainer: document.getElementById('toast-container'),
      
      // Action Buttons
      btnSail: document.getElementById('btn-action-sail'),
      btnReave: document.getElementById('btn-action-reave'),
      btnMuster: document.getElementById('btn-action-muster'),
      btnPray: document.getElementById('btn-action-pray'),
      btnEndTurn: document.getElementById('btn-action-endturn'),
      btnAiStep: document.getElementById('btn-ai-step'),

      // Dice Tray
      diceTraySubtitle: document.getElementById('dice-tray-subtitle'),
      attackerDiceContainer: document.getElementById('attacker-dice-container'),
      defenderDiceContainer: document.getElementById('defender-dice-container'),
      diceSummaryBanner: document.getElementById('dice-summary-banner'),

      // Logs
      logContainer: document.getElementById('log-container'),

      // Modals
      modalNewGame: document.getElementById('modal-new-game'),
      modalRules: document.getElementById('modal-rules'),
      modalVictory: document.getElementById('modal-victory'),
      winnerNameText: document.getElementById('winner-name-text'),
      winnerTitleText: document.getElementById('winner-title-text'),
      finalScoresContainer: document.getElementById('final-scores-container')
    };
  }

  update(gameState, selection = null) {
    if (!gameState) return;

    // 1. Header Trackers
    this.elements.seasonDisplay.textContent = `${gameState.season} / ${gameState.max_seasons}`;
    this.elements.turnDisplay.textContent = `${gameState.turn_in_season} / 3`;
    
    const activePlayer = gameState.players[gameState.active_player_idx];
    this.elements.activeNameDisplay.textContent = `${activePlayer.name} (${activePlayer.title})`;
    this.elements.activeBadgeBox.style.borderColor = activePlayer.color;

    // Actions Pips
    this.elements.actionsPips.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const pip = document.createElement('span');
      pip.className = `pip ${i < gameState.actions_remaining ? 'active' : ''}`;
      this.elements.actionsPips.appendChild(pip);
    }

    // 2. Claimant Cards
    this.elements.claimantsList.innerHTML = '';
    gameState.players.forEach((p, idx) => {
      const isActive = (idx === gameState.active_player_idx);
      
      // Total crew deployed
      let deployedCrew = 0;
      let totalShips = 0;
      Object.values(gameState.nodes).forEach(n => {
        n.occupants.forEach(s => {
          if (s.faction === p.faction) {
            deployedCrew += s.crew;
            totalShips += 1;
          }
        });
      });

      const card = document.createElement('div');
      card.className = `claimant-card ${isActive ? 'active-card' : ''}`;
      card.style.borderLeft = `4px solid ${p.color}`;

      card.innerHTML = `
        <div class="claimant-header">
          <span class="claimant-name" style="color: ${p.color}">
            ${p.name}
            ${p.is_ai ? '<span class="claimant-role-badge">BOT</span>' : '<span class="claimant-role-badge" style="background:#27ae60;color:#fff">YOU</span>'}
          </span>
          <span class="claimant-role-badge">${p.title}</span>
        </div>
        <div class="claimant-stats-row">
          <div class="c-stat">
            <span class="c-stat-label">HOARD</span>
            <span class="c-stat-val gold">${p.hoard} 💰</span>
          </div>
          <div class="c-stat">
            <span class="c-stat-label">LEGEND</span>
            <span class="c-stat-val legend">${p.legend} 👑</span>
          </div>
          <div class="c-stat">
            <span class="c-stat-label">FAVOR</span>
            <span class="c-stat-val favor">${p.favor}/7 🌊</span>
          </div>
          <div class="c-stat">
            <span class="c-stat-label">CREW</span>
            <span class="c-stat-val crew">${deployedCrew} ⚔️</span>
          </div>
        </div>
      `;
      this.elements.claimantsList.appendChild(card);
    });

    // 3. Selection & Action Buttons
    this.updateActionButtons(gameState, selection);

    // 4. Logs
    this.updateLogs(gameState.logs);

    // 5. Victory Screen if Game Over
    if (gameState.game_over && !this.victoryModalShown) {
      this.showVictoryModal(gameState);
      this.victoryModalShown = true;
    }
  }

  updateActionButtons(gameState, selection) {
    const activePlayer = gameState.players[gameState.active_player_idx];
    const isHumanTurn = !activePlayer.is_ai;

    this.elements.panelActiveIndicator.textContent = isHumanTurn ? 'Your Turn' : 'Bot Turn';
    this.elements.panelActiveIndicator.style.background = isHumanTurn ? '#2ecc71' : '#8e44ad';
    this.elements.btnAiStep.style.display = activePlayer.is_ai && !gameState.game_over ? 'block' : 'none';

    // Selection details
    if (!selection || selection.type === 'none') {
      this.elements.selectedEntityName.textContent = 'None (Click a ship or node on map)';
      this.elements.btnSail.disabled = true;
      this.elements.btnReave.disabled = true;
      this.elements.btnMuster.disabled = true;
    } else if (selection.type === 'ship') {
      let shipObj = null;
      let nodeObj = gameState.nodes[selection.nodeId];
      if (nodeObj) {
        shipObj = nodeObj.occupants.find(s => s.id === selection.shipId);
      }
      
      const shipDesc = shipObj ? `${shipObj.faction} ${shipObj.is_flagship ? 'Flagship' : 'Reaver'} (${shipObj.crew} crew)` : selection.shipId;
      this.elements.selectedEntityName.textContent = `${shipDesc} @ ${nodeObj ? nodeObj.name : selection.nodeId}`;

      const isOwned = shipObj && (shipObj.faction === activePlayer.faction);
      this.elements.btnSail.disabled = !isHumanTurn || !isOwned || gameState.actions_remaining <= 0;
      this.elements.btnReave.disabled = true; // Reave enabled when clicking target land
      this.elements.btnMuster.disabled = !isHumanTurn || (nodeObj.control !== activePlayer.faction && nodeObj.id !== activePlayer.home_node) || activePlayer.hoard < (nodeObj.id === 'greatwyk' ? 2 : 3) || gameState.actions_remaining <= 0;
    } else if (selection.type === 'node') {
      const nodeObj = gameState.nodes[selection.nodeId];
      this.elements.selectedEntityName.textContent = `${nodeObj.name} (${nodeObj.kind.toUpperCase()})`;

      // Muster enabled if controlled isle
      const canMuster = isHumanTurn && (nodeObj.control === activePlayer.faction || nodeObj.id === activePlayer.home_node) && activePlayer.hoard >= (nodeObj.id === 'greatwyk' ? 2 : 3) && gameState.actions_remaining > 0;
      this.elements.btnMuster.disabled = !canMuster;
      this.elements.btnSail.disabled = true;
      this.elements.btnReave.disabled = true;
    }

    // Pray & End Turn
    this.elements.btnPray.disabled = !isHumanTurn || activePlayer.favor >= 7 || gameState.actions_remaining <= 0;
    this.elements.btnEndTurn.disabled = !isHumanTurn || gameState.game_over;
  }

  enableReaveButton(shipId, targetLandNode) {
    this.elements.btnReave.disabled = false;
    this.elements.btnReave.querySelector('small').textContent = `Target: ${targetLandNode.name} (Def: ${targetLandNode.defense})`;
  }

  renderDiceRoll(reaveOutcome) {
    if (!reaveOutcome) return;

    this.elements.diceTraySubtitle.textContent = `Battle at ${reaveOutcome.target_name}`;
    
    // Attacker dice
    this.elements.attackerDiceContainer.innerHTML = '';
    reaveOutcome.attacker_roll.dice.forEach(face => {
      const die = document.createElement('div');
      die.className = `dice-face ${face.toLowerCase()} dice-rolling`;
      die.innerHTML = `
        <span class="dice-icon">${this._getDiceIcon(face)}</span>
        <span>${face}</span>
      `;
      this.elements.attackerDiceContainer.appendChild(die);
    });

    // Defender dice
    this.elements.defenderDiceContainer.innerHTML = '';
    reaveOutcome.defender_roll.dice.forEach(face => {
      const die = document.createElement('div');
      die.className = `dice-face ${face.toLowerCase()} dice-rolling`;
      die.innerHTML = `
        <span class="dice-icon">${this._getDiceIcon(face)}</span>
        <span>${face}</span>
      `;
      this.elements.defenderDiceContainer.appendChild(die);
    });

    // Summary banner
    this.elements.diceSummaryBanner.style.display = 'block';
    if (reaveOutcome.success) {
      this.elements.diceSummaryBanner.style.borderColor = '#2ecc71';
      this.elements.diceSummaryBanner.style.background = 'rgba(46, 204, 113, 0.15)';
      this.elements.diceSummaryBanner.innerHTML = `
        🎉 <strong>VICTORY!</strong> ${reaveOutcome.target_name} Sacked! Dealt <strong>${reaveOutcome.net_attacker_hits}</strong> unblocked hits (Needed ${reaveOutcome.defense_required}). 
        Gained <strong>+${reaveOutcome.hoard_gained} Hoard</strong> and <strong>+${reaveOutcome.legend_gained} Legend</strong>. Lost ${reaveOutcome.crew_lost} crew.
      `;
    } else {
      this.elements.diceSummaryBanner.style.borderColor = '#e74c3c';
      this.elements.diceSummaryBanner.style.background = 'rgba(231, 76, 60, 0.15)';
      this.elements.diceSummaryBanner.innerHTML = `
        🛡️ <strong>REPELLED!</strong> Dealt only <strong>${reaveOutcome.net_attacker_hits}</strong> unblocked hits (Needed ${reaveOutcome.defense_required}). Lost ${reaveOutcome.crew_lost} crew.
      `;
    }
  }

  _getDiceIcon(face) {
    if (face === 'Kraken') return '🦑';
    if (face === 'Axe') return '🪓';
    if (face === 'Shield') return '🛡️';
    if (face === 'Eye') return '👁️';
    return '🎲';
  }

  updateLogs(logs) {
    if (!logs) return;
    this.elements.logContainer.innerHTML = '';
    logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      if (log.includes('SACKED')) entry.classList.add('system');
      entry.textContent = log;
      this.elements.logContainer.appendChild(entry);
    });
    this.elements.logContainer.scrollTop = this.elements.logContainer.scrollHeight;
  }

  showVictoryModal(gameState) {
    const sorted = [...gameState.players].sort((a, b) => b.legend - a.legend);
    const winner = sorted[0];

    this.elements.winnerNameText.textContent = winner.name;
    this.elements.winnerTitleText.textContent = `${winner.title} — King of Salt and Rock`;

    this.elements.finalScoresContainer.innerHTML = '';
    sorted.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `score-row ${idx === 0 ? 'winner-row' : ''}`;
      row.innerHTML = `
        <span><strong>${idx + 1}. ${p.name}</strong> (${p.faction})</span>
        <span>👑 <strong>${p.legend} Legend</strong> | 💰 ${p.hoard} Hoard | 🌊 ${p.favor} Favor</span>
      `;
      this.elements.finalScoresContainer.appendChild(row);
    });

    this.elements.modalVictory.style.display = 'flex';
  }

  showToast(message, type = 'info') {
    if (!this.elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }
}
