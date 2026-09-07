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
      finalScoresContainer: document.getElementById('final-scores-container'),

      // Reave Combat Modal
      modalReave: document.getElementById('modal-reave'),
      reaveModalTitle: document.getElementById('reave-modal-title'),
      reaveDefenseBadge: document.getElementById('reave-defense-badge'),
      btnCloseReaveX: document.getElementById('btn-close-reave-x'),
      reaveAttackerName: document.getElementById('reave-attacker-name'),
      reaveAttackerDice: document.getElementById('reave-attacker-dice'),
      reaveAttackerTally: document.getElementById('reave-attacker-tally'),
      reaveDefenderName: document.getElementById('reave-defender-name'),
      reaveDefenderDice: document.getElementById('reave-defender-dice'),
      reaveDefenderTally: document.getElementById('reave-defender-tally'),
      reaveStatHits: document.getElementById('reave-stat-hits'),
      reaveStatBlocks: document.getElementById('reave-stat-blocks'),
      reaveStatNet: document.getElementById('reave-stat-net'),
      reaveStatNeeded: document.getElementById('reave-stat-needed'),
      reaveOutcomeCard: document.getElementById('reave-outcome-card'),
      reaveOutcomeTitle: document.getElementById('reave-outcome-title'),
      reaveOutcomeDesc: document.getElementById('reave-outcome-desc'),
      reaveSpoilsRow: document.getElementById('reave-spoils-row'),
      btnReaveConfirm: document.getElementById('btn-reave-confirm')
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

      const factionIcons = {
        'Asha': '🦅',
        'Euron': '👁️',
        'Victarion': '🪓'
      };
      const factionFlagships = {
        'Asha': 'The Black Wind',
        'Euron': 'The Silence',
        'Victarion': 'Iron Victory'
      };
      const fIcon = factionIcons[p.faction] || '⚔️';
      const flagName = factionFlagships[p.faction] || 'Longship';

      const card = document.createElement('div');
      card.className = `claimant-card ${isActive ? 'active-card' : ''}`;
      card.style.borderLeft = `5px solid ${p.color}`;

      card.innerHTML = `
        <div class="claimant-header">
          <span class="claimant-name" style="color: ${p.color}">
            <span>${fIcon}</span> ${p.name}
            ${p.is_ai ? '<span class="claimant-role-badge">BOT</span>' : '<span class="claimant-role-badge" style="background:#143e28;color:#2ecc71;border-color:#2ecc71">CLAIMANT (YOU)</span>'}
          </span>
          <span class="claimant-role-badge" title="Flagship: ${flagName}">${p.title}</span>
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
            <span class="c-stat-label">WARRIORS</span>
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
      this.elements.selectedEntityName.textContent = 'None (Select Longship or Island Haven)';
      this.elements.btnSail.disabled = true;
      this.elements.btnReave.disabled = true;
      this.elements.btnMuster.disabled = true;
    } else if (selection.type === 'ship') {
      let shipObj = null;
      let nodeObj = gameState.nodes[selection.nodeId];
      if (nodeObj) {
        shipObj = nodeObj.occupants.find(s => s.id === selection.shipId);
      }
      
      const shipDesc = shipObj ? `${shipObj.faction} ${shipObj.is_flagship ? 'Flagship ★' : 'War Longship ⛵'} (${shipObj.crew} warriors)` : selection.shipId;
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
        <span class="dice-val">${this._getDiceValueTag(face, true)}</span>
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
        <span class="dice-val">${this._getDiceValueTag(face, false)}</span>
      `;
      this.elements.defenderDiceContainer.appendChild(die);
    });

    // Summary banner
    this.elements.diceSummaryBanner.style.display = 'block';
    if (reaveOutcome.success) {
      this.elements.diceSummaryBanner.style.borderColor = 'var(--gold-accent)';
      this.elements.diceSummaryBanner.style.background = 'linear-gradient(180deg, rgba(243, 195, 72, 0.15) 0%, rgba(13, 22, 32, 0.9) 100%)';
      this.elements.diceSummaryBanner.innerHTML = `
        ⚔️ <strong>THE IRON PRICE IS PAID!</strong> ${reaveOutcome.target_name} Sacked! Dealt <strong>${reaveOutcome.net_attacker_hits}</strong> unblocked hits (Needed ${reaveOutcome.defense_required}). 
        Plundered <strong>+${reaveOutcome.hoard_gained} Hoard 💰</strong> and carved <strong>+${reaveOutcome.legend_gained} Legend 👑</strong>. Lost ${reaveOutcome.crew_lost} warriors.
      `;
    } else {
      this.elements.diceSummaryBanner.style.borderColor = '#e74c3c';
      this.elements.diceSummaryBanner.style.background = 'linear-gradient(180deg, rgba(231, 76, 60, 0.15) 0%, rgba(20, 10, 10, 0.9) 100%)';
      this.elements.diceSummaryBanner.innerHTML = `
        🛡️ <strong>DEFENDERS HELD!</strong> Dealt only <strong>${reaveOutcome.net_attacker_hits}</strong> unblocked hits (Needed ${reaveOutcome.defense_required}). Lost ${reaveOutcome.crew_lost} warriors to the stones.
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

  _getDiceValueTag(face, isAttacker) {
    if (face === 'Kraken') return isAttacker ? '+2 Hits' : '⚔️ 2 Hits';
    if (face === 'Axe') return isAttacker ? '+1 Hit' : '⚔️ 1 Hit';
    if (face === 'Shield') return isAttacker ? '🛡️ 1 Block' : '🛡️ 1 Block';
    if (face === 'Eye') return '👁️ Eye';
    return face;
  }

  showReaveModal(reaveOutcome, onComplete = null, autoDismissMs = 0) {
    if (!reaveOutcome || !this.elements.modalReave) {
      if (onComplete) onComplete();
      return;
    }

    const {
      target_name,
      attacker_faction,
      attacker_roll,
      defender_roll,
      net_attacker_hits,
      defense_required,
      success,
      hoard_gained,
      legend_gained,
      crew_lost
    } = reaveOutcome;

    // Header & Info
    this.elements.reaveModalTitle.innerHTML = `⚔️ Raid on ${target_name}`;
    this.elements.reaveDefenseBadge.innerHTML = `🛡️ Keep Defense: <strong>${defense_required}</strong> Hits Required`;
    this.elements.reaveAttackerName.textContent = attacker_faction || 'Attacking Fleet';
    this.elements.reaveDefenderName.textContent = `${target_name} Garrison`;

    // Reset formula & outcome card
    this.elements.reaveOutcomeCard.style.display = 'none';
    this.elements.reaveOutcomeCard.className = 'reave-outcome-card';
    this.elements.reaveStatHits.textContent = '...';
    this.elements.reaveStatBlocks.textContent = '...';
    this.elements.reaveStatNet.textContent = '...';
    this.elements.reaveStatNeeded.textContent = `${defense_required}`;
    this.elements.reaveAttackerTally.textContent = '⚔️ Rolling...';
    this.elements.reaveDefenderTally.textContent = '🛡️ Rolling...';
    this.elements.btnReaveConfirm.textContent = 'Rolling...';
    this.elements.btnReaveConfirm.disabled = true;

    // Open Modal
    this.elements.modalReave.style.display = 'flex';

    // Populate placeholder tumbling dice
    this.elements.reaveAttackerDice.innerHTML = '';
    const attackerDiceEls = [];
    attacker_roll.dice.forEach(() => {
      const d = document.createElement('div');
      d.className = 'dice-face reave-dice-face dice-tumbling';
      d.innerHTML = `<span class="dice-icon">🎲</span><span class="reave-dice-val">...</span>`;
      this.elements.reaveAttackerDice.appendChild(d);
      attackerDiceEls.push(d);
    });

    this.elements.reaveDefenderDice.innerHTML = '';
    const defenderDiceEls = [];
    defender_roll.dice.forEach(() => {
      const d = document.createElement('div');
      d.className = 'dice-face reave-dice-face dice-tumbling';
      d.innerHTML = `<span class="dice-icon">🎲</span><span class="reave-dice-val">...</span>`;
      this.elements.reaveDefenderDice.appendChild(d);
      defenderDiceEls.push(d);
    });

    // Rapid face cycling for suspenseful tumbling animation
    const faces = ['Kraken', 'Axe', 'Shield', 'Eye'];
    const rollInterval = setInterval(() => {
      attackerDiceEls.forEach(el => {
        const randFace = faces[Math.floor(Math.random() * faces.length)];
        el.className = `dice-face reave-dice-face ${randFace.toLowerCase()} dice-tumbling`;
        const iconEl = el.querySelector('.dice-icon');
        if (iconEl) iconEl.textContent = this._getDiceIcon(randFace);
      });
      defenderDiceEls.forEach(el => {
        const randFace = faces[Math.floor(Math.random() * faces.length)];
        el.className = `dice-face reave-dice-face ${randFace.toLowerCase()} dice-tumbling`;
        const iconEl = el.querySelector('.dice-icon');
        if (iconEl) iconEl.textContent = this._getDiceIcon(randFace);
      });
    }, 75);

    // After roll duration (~900ms), lock in final rolled dice
    setTimeout(() => {
      clearInterval(rollInterval);

      // Lock Attacker Dice
      attackerDiceEls.forEach((el, idx) => {
        const face = attacker_roll.dice[idx];
        const valTag = this._getDiceValueTag(face, true);
        el.className = `dice-face reave-dice-face ${face.toLowerCase()} dice-settled`;
        el.innerHTML = `
          <span class="dice-icon">${this._getDiceIcon(face)}</span>
          <span class="reave-dice-val">${valTag}</span>
        `;
      });
      this.elements.reaveAttackerTally.innerHTML = `⚔️ <strong>${attacker_roll.hits}</strong> Hits ${attacker_roll.blocks > 0 ? `• 🛡️ <strong>${attacker_roll.blocks}</strong> Blocks` : ''}`;

      // Lock Defender Dice
      defenderDiceEls.forEach((el, idx) => {
        const face = defender_roll.dice[idx];
        const valTag = this._getDiceValueTag(face, false);
        el.className = `dice-face reave-dice-face ${face.toLowerCase()} dice-settled`;
        el.innerHTML = `
          <span class="dice-icon">${this._getDiceIcon(face)}</span>
          <span class="reave-dice-val">${valTag}</span>
        `;
      });
      this.elements.reaveDefenderTally.innerHTML = `🛡️ <strong>${defender_roll.blocks}</strong> Blocks • ⚔️ <strong>${defender_roll.hits}</strong> Counter Hits`;

      // Update Formula Stats
      this.elements.reaveStatHits.textContent = `${attacker_roll.hits}`;
      this.elements.reaveStatBlocks.textContent = `${defender_roll.blocks}`;
      this.elements.reaveStatNet.textContent = `${net_attacker_hits}`;
      this.elements.reaveStatNeeded.textContent = `${defense_required}`;

      // Reveal Outcome Card
      this.elements.reaveOutcomeCard.style.display = 'flex';
      this.elements.btnReaveConfirm.disabled = false;

      if (success) {
        this.elements.reaveOutcomeCard.className = 'reave-outcome-card victory result-banner-pop';
        this.elements.reaveOutcomeTitle.textContent = `🎉 VICTORY — ${target_name.toUpperCase()} SACKED!`;
        this.elements.reaveOutcomeDesc.textContent = `The Ironborn overwhelm the defenses and carry away their plunder!`;

        let spoilsHtml = `
          <span class="spoil-pill hoard">💰 +${hoard_gained} Hoard</span>
          <span class="spoil-pill legend">👑 +${legend_gained} Legend</span>
        `;
        if (crew_lost > 0) {
          spoilsHtml += `<span class="spoil-pill casualty">💀 -${crew_lost} Crew Lost (${defender_roll.hits} counter hits − ${attacker_roll.blocks} blocks)</span>`;
        } else {
          spoilsHtml += `<span class="spoil-pill safe">✨ Zero Casualties</span>`;
        }
        this.elements.reaveSpoilsRow.innerHTML = spoilsHtml;
        this.elements.btnReaveConfirm.textContent = 'Claim Plunder & Continue';
      } else {
        this.elements.reaveOutcomeCard.className = 'reave-outcome-card repelled result-banner-pop';
        this.elements.reaveOutcomeTitle.textContent = `🛡️ RAID REPELLED AT ${target_name.toUpperCase()}!`;
        this.elements.reaveOutcomeDesc.textContent = `Scored only ${net_attacker_hits} net hits against ${defense_required} required defense. Garrison counter-attack dealt ${defender_roll.hits} hits!`;

        let casualtiesHtml = `<span class="spoil-pill casualty">💀 -${crew_lost} Crew Lost (${defender_roll.hits} counter hits − ${attacker_roll.blocks} blocks)</span>`;
        this.elements.reaveSpoilsRow.innerHTML = casualtiesHtml;
        this.elements.btnReaveConfirm.textContent = 'Fall Back & Continue';
      }

    }, 900);

    // Setup close handlers
    let isClosed = false;
    let autoDismissTimer = null;
    const handleClose = () => {
      if (isClosed) return;
      isClosed = true;
      if (autoDismissTimer) clearTimeout(autoDismissTimer);
      clearInterval(rollInterval);
      this.elements.modalReave.style.display = 'none';
      if (onComplete) onComplete();
    };

    if (autoDismissMs > 0) {
      autoDismissTimer = setTimeout(() => {
        handleClose();
      }, autoDismissMs);
    }

    this.elements.btnReaveConfirm.onclick = handleClose;
    this.elements.btnCloseReaveX.onclick = handleClose;
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
