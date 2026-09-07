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
      btnCallStorm: document.getElementById('btn-action-callstorm'),
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
      btnReaveConfirm: document.getElementById('btn-reave-confirm'),

      // Naval Battle Modal (Phase 2)
      modalBattle: document.getElementById('modal-battle'),
      battleModalTitle: document.getElementById('battle-modal-title'),
      battleRoundBadge: document.getElementById('battle-round-badge'),
      battleAttackerName: document.getElementById('battle-attacker-name'),
      battleAttackerShip: document.getElementById('battle-attacker-ship'),
      battleAttackerDice: document.getElementById('battle-attacker-dice'),
      battleAttackerTally: document.getElementById('battle-attacker-tally'),
      battleAttackerTraits: document.getElementById('battle-attacker-traits'),
      battleDefenderName: document.getElementById('battle-defender-name'),
      battleDefenderShip: document.getElementById('battle-defender-ship'),
      battleDefenderDice: document.getElementById('battle-defender-dice'),
      battleDefenderTally: document.getElementById('battle-defender-tally'),
      battleDefenderTraits: document.getElementById('battle-defender-traits'),
      battleDmgToDefender: document.getElementById('battle-dmg-to-defender'),
      battleDmgToAttacker: document.getElementById('battle-dmg-to-attacker'),
      battlePowersBar: document.getElementById('battle-powers-bar'),
      btnBattleBloodPrice: document.getElementById('btn-battle-blood-price'),
      btnBattleMiracleReroll: document.getElementById('btn-battle-miracle-reroll'),
      btnBattleMiracleAutowin: document.getElementById('btn-battle-miracle-autowin'),
      battlePassiveNotice: document.getElementById('battle-passive-notice'),
      battleOutcomeBanner: document.getElementById('battle-outcome-banner'),
      battleOutcomeTitle: document.getElementById('battle-outcome-title'),
      battleOutcomeDesc: document.getElementById('battle-outcome-desc'),
      battleSpoilsRow: document.getElementById('battle-spoils-row'),
      btnBattleRetreat: document.getElementById('btn-battle-retreat'),
      btnBattleContinue: document.getElementById('btn-battle-continue'),
      btnBattleDismiss: document.getElementById('btn-battle-dismiss')
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
      
      const shipDesc = shipObj ? `${shipObj.faction} ${this.getShipDisplayName(shipObj.id)} (${shipObj.crew} warriors)` : selection.shipId;
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

    // Pray, Call Storm & End Turn
    this.elements.btnPray.disabled = !isHumanTurn || activePlayer.favor >= 7 || gameState.actions_remaining <= 0;
    if (this.elements.btnCallStorm) {
      this.elements.btnCallStorm.disabled = !isHumanTurn || activePlayer.favor < 4 || gameState.actions_remaining <= 0 || gameState.active_battle !== null;
    }
    this.elements.btnEndTurn.disabled = !isHumanTurn || gameState.game_over || gameState.active_battle !== null;
  }

  enableReaveButton(shipId, targetLandNode) {
    this.elements.btnReave.disabled = false;
    this.elements.btnReave.querySelector('small').textContent = `Target: ${targetLandNode.name} (Def: ${targetLandNode.defense})`;
  }

  enableSailButton(shipId, targetNode, hasEnemy = false) {
    this.elements.btnSail.disabled = false;
    const actionDesc = hasEnemy ? `⚔️ Attack Fleet at ${targetNode.name}` : `Sail to ${targetNode.name}`;
    const smallEl = this.elements.btnSail.querySelector('small');
    if (smallEl) smallEl.textContent = actionDesc;
    const strongEl = this.elements.btnSail.querySelector('strong');
    if (strongEl) strongEl.textContent = hasEnemy ? 'Attack Fleet' : 'Sail Fleet';
  }

  getShipDisplayName(shipId) {
    const names = {
      'asha_flagship': 'Black Wind', 'euron_flagship': 'Silence', 'victarion_flagship': 'Iron Victory',
      'asha_reaver1': 'Iron Longship I', 'asha_reaver2': 'Iron Longship II',
      'euron_reaver1': 'Iron Longship I', 'euron_reaver2': 'Iron Longship II',
      'victarion_reaver1': 'Iron Longship I', 'victarion_reaver2': 'Iron Longship II'
    };
    return names[shipId] || (shipId ? shipId.replace(/_/g, ' ') : 'Warship');
  }

  renderDiceRoll(reaveOutcome, isNewRoll = false) {
    if (!reaveOutcome) return;
    if (this._lastRenderedReaveOutcome === reaveOutcome && !isNewRoll) return;
    this._lastRenderedReaveOutcome = reaveOutcome;

    this.elements.diceTraySubtitle.textContent = `Battle at ${reaveOutcome.target_name}`;
    const rollClass = isNewRoll ? 'dice-rolling' : 'dice-settled';
    
    // Attacker dice
    this.elements.attackerDiceContainer.innerHTML = '';
    reaveOutcome.attacker_roll.dice.forEach(face => {
      const die = document.createElement('div');
      die.className = `dice-face ${face.toLowerCase()} ${rollClass}`;
      die.innerHTML = `<span class="dice-icon">${this._getDiceIcon(face)}</span><span class="dice-val">${this._getDiceValueTag(face, true)}</span>`;
      this.elements.attackerDiceContainer.appendChild(die);
    });

    // Defender dice
    this.elements.defenderDiceContainer.innerHTML = '';
    reaveOutcome.defender_roll.dice.forEach(face => {
      const die = document.createElement('div');
      die.className = `dice-face ${face.toLowerCase()} ${rollClass}`;
      die.innerHTML = `<span class="dice-icon">${this._getDiceIcon(face)}</span><span class="dice-val">${this._getDiceValueTag(face, false)}</span>`;
      this.elements.defenderDiceContainer.appendChild(die);
    });

    if (isNewRoll) {
      setTimeout(() => {
        document.querySelectorAll('.dice-face.dice-rolling').forEach(d => {
          d.classList.remove('dice-rolling');
          d.classList.add('dice-settled');
        });
      }, 750);
    }

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

  updateDiceTray(attackerRoll, defenderRoll, outcome, isNewRoll = false) {
    const reaveOutcome = outcome || (attackerRoll && attackerRoll.attacker_roll ? attackerRoll : null);
    if (reaveOutcome) {
      this.renderDiceRoll(reaveOutcome, isNewRoll);
    }
  }

  _getDiceIcon(face) {
    const icons = { Kraken: '🦑', Axe: '🪓', Shield: '🛡️', Eye: '👁️' };
    return icons[face] || '🎲';
  }

  _getDiceValueTag(face, isAttacker) {
    if (face === 'Kraken') return isAttacker ? '+2 Hits' : '⚔️ 2 Hits';
    if (face === 'Axe') return isAttacker ? '+1 Hit' : '⚔️ 1 Hit';
    if (face === 'Shield') return '🛡️ 1 Block';
    return face === 'Eye' ? '👁️ Eye' : face;
  }

  showReaveModal(reaveOutcome, onComplete = null, autoDismissMs = 0) {
    if (!reaveOutcome || !this.elements.modalReave) {
      if (onComplete) onComplete();
      return;
    }

    const {
      target_name, attacker_faction, attacker_roll, defender_roll, net_attacker_hits,
      defense_required, success, hoard_gained, legend_gained, crew_lost
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

  showHazardNotification(hazard) {
    if (!hazard) return;
    const { die_face, outcome, crew_lost, favor_gained, ship_id } = hazard;
    if (outcome === 'safe') {
      this.showToast(`🌊 [Storm Belt] ${ship_id} navigated the storm safely! (Rolled ${die_face})`, 'info');
    } else if (outcome === 'pushback') {
      this.showToast(`💨 [Storm Belt] Violent gales repelled ${ship_id} back to harbor! (Rolled Shield)`, 'error');
    } else if (outcome === 'casualty') {
      this.showToast(`💀 [Storm Belt] Raging seas swallowed 1 warrior from ${ship_id}! (+1 Favor gained)`, 'error');
    }
  }

  showBattleModal(battleState, callbacks = {}, activeFaction = null, playerFavor = 0) {
    if (!battleState || !this.elements.modalBattle) return;

    if (this.elements.btnBattleMiracleReroll) {
      this.elements.btnBattleMiracleReroll.disabled = (playerFavor < 2);
    }
    if (this.elements.btnBattleMiracleAutowin) {
      this.elements.btnBattleMiracleAutowin.disabled = (playerFavor < 6);
    }

    const {
      battle_id, node_id, attacker_faction, defender_faction, attacker_ship_id, defender_ship_id,
      round_num, state, history, winner, is_stalemate, retreated_faction,
      hoard_plundered, legend_awarded, blood_price_available
    } = battleState;

    this.elements.modalBattle.style.display = 'flex';
    this.elements.battleModalTitle.textContent = `⚔️ NAVAL CLASH: ${node_id.toUpperCase()}`;
    this.elements.battleRoundBadge.textContent = `Round ${round_num} of 2`;

    this.elements.battleAttackerName.textContent = attacker_faction;
    this.elements.battleAttackerShip.textContent = this.getShipDisplayName(attacker_ship_id);
    this.elements.battleDefenderName.textContent = defender_faction;
    this.elements.battleDefenderShip.textContent = this.getShipDisplayName(defender_ship_id);

    this.elements.battleAttackerTraits.innerHTML = (attacker_faction === 'Victarion' && node_id === 'bay')
      ? '⚔️ <strong>Iron Captain</strong>: Axes deal 2 Hits in Ironman\'s Bay!'
      : (attacker_faction === 'Euron' ? '👁️ <strong>Silence</strong>: First raid surprises defender' : '');
    this.elements.battleDefenderTraits.innerHTML = (defender_faction === 'Victarion' && node_id === 'bay')
      ? '⚔️ <strong>Iron Captain</strong>: Axes deal 2 Hits in Ironman\'s Bay!'
      : '';

    const currentRound = history && history.length > 0 ? history[history.length - 1] : null;

    if (currentRound) {
      this.elements.battleAttackerDice.innerHTML = '';
      currentRound.attacker_roll.dice.forEach(face => {
        const d = document.createElement('div');
        d.className = `dice-face ${face.toLowerCase()} dice-settled`;
        d.innerHTML = `<span class="dice-icon">${this._getDiceIcon(face)}</span><span class="reave-dice-val">${this._getDiceValueTag(face, true)}</span>`;
        this.elements.battleAttackerDice.appendChild(d);
      });
      this.elements.battleAttackerTally.innerHTML = `⚔️ <strong>${currentRound.attacker_roll.hits}</strong> Hits • 🛡️ <strong>${currentRound.attacker_roll.blocks}</strong> Blocks`;

      this.elements.battleDefenderDice.innerHTML = '';
      currentRound.defender_roll.dice.forEach(face => {
        const d = document.createElement('div');
        d.className = `dice-face ${face.toLowerCase()} dice-settled`;
        d.innerHTML = `<span class="dice-icon">${this._getDiceIcon(face)}</span><span class="reave-dice-val">${this._getDiceValueTag(face, false)}</span>`;
        this.elements.battleDefenderDice.appendChild(d);
      });
      this.elements.battleDefenderTally.innerHTML = `⚔️ <strong>${currentRound.defender_roll.hits}</strong> Hits • 🛡️ <strong>${currentRound.defender_roll.blocks}</strong> Blocks`;

      this.elements.battleDmgToDefender.textContent = `${currentRound.net_attacker_hits} Crew`;
      this.elements.battleDmgToAttacker.textContent = `${currentRound.net_defender_hits} Crew`;
    }

    const isEuron = (activeFaction === 'Euron' || attacker_faction === 'Euron');
    this.elements.btnBattleBloodPrice.style.display = (isEuron && blood_price_available && state !== 'finished') ? 'inline-block' : 'none';

    if (state === 'finished') {
      this.elements.battleOutcomeBanner.style.display = 'flex';
      this.elements.battlePowersBar.style.display = 'none';
      this.elements.btnBattleRetreat.style.display = 'none';
      this.elements.btnBattleContinue.style.display = 'none';
      this.elements.btnBattleDismiss.style.display = 'inline-block';

      if (winner) {
        const isWinner = (activeFaction === winner);
        this.elements.battleOutcomeBanner.className = `battle-outcome-banner ${isWinner ? 'victory' : 'defeat'}`;
        this.elements.battleOutcomeTitle.textContent = `${winner.toUpperCase()} VICTORIOUS!`;
        this.elements.battleOutcomeDesc.textContent = retreated_faction 
          ? `${retreated_faction} retreated from the clash!`
          : `Opposing warship was wiped out or broken in line!`;

        let spoilsHtml = '';
        if (hoard_plundered > 0) spoilsHtml += `<span class="spoil-pill hoard">💰 +${hoard_plundered} Hoard Plundered</span>`;
        if (legend_awarded > 0) spoilsHtml += `<span class="spoil-pill legend">👑 +${legend_awarded} Legend Awarded</span>`;
        this.elements.battleSpoilsRow.innerHTML = spoilsHtml;
      } else if (is_stalemate) {
        this.elements.battleOutcomeBanner.className = 'battle-outcome-banner stalemate';
        this.elements.battleOutcomeTitle.textContent = 'STALEMATE!';
        this.elements.battleOutcomeDesc.textContent = 'Both dreadnoughts traded heavy broadsides and fell back.';
        this.elements.battleSpoilsRow.innerHTML = '';
      }
    } else {
      this.elements.battleOutcomeBanner.style.display = 'none';
      this.elements.battlePowersBar.style.display = 'flex';
      this.elements.btnBattleRetreat.style.display = 'inline-block';
      this.elements.btnBattleContinue.style.display = 'inline-block';
      this.elements.btnBattleDismiss.style.display = 'none';

      if (activeFaction === 'Asha') {
        this.elements.btnBattleRetreat.innerHTML = '🏳️ Retreat (Free for Asha)';
      } else {
        this.elements.btnBattleRetreat.innerHTML = '🏳️ Retreat (Sacrifice 1 Crew)';
      }
    }

    this.elements.btnBattleBloodPrice.onclick = () => callbacks.onBloodPrice && callbacks.onBloodPrice();
    this.elements.btnBattleMiracleReroll.onclick = () => callbacks.onMiracleReroll && callbacks.onMiracleReroll();
    this.elements.btnBattleMiracleAutowin.onclick = () => callbacks.onMiracleAutowin && callbacks.onMiracleAutowin();
    this.elements.btnBattleRetreat.onclick = () => callbacks.onRetreat && callbacks.onRetreat();
    this.elements.btnBattleContinue.onclick = () => callbacks.onContinue && callbacks.onContinue();
    this.elements.btnBattleDismiss.onclick = () => {
      this.elements.modalBattle.style.display = 'none';
      if (callbacks.onDismiss) callbacks.onDismiss();
    };

    const closeX = document.getElementById('btn-close-battle-x');
    if (closeX) {
      closeX.style.display = (state === 'finished') ? 'block' : 'none';
      closeX.onclick = () => {
        this.elements.modalBattle.style.display = 'none';
        if (callbacks.onDismiss) callbacks.onDismiss();
      };
    }
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

