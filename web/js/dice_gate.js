/**
 * IRON PRICE: Kingsmoot — Click-to-Roll Dice Gate (human suspense rolls)
 * Human-involved reave + naval modals wait for a big ROLL click, then reveal
 * dice one-by-one (attackers L->R first, then defenders L->R). AI auto-rolls.
 * Patches UIController (same pattern as naval_choice.js); keeps ui.js small.
 */

class DiceGate {
  static PER_DIE_MS = 800;

  static humanFaction(gameState) {
    const h = gameState && gameState.players ? gameState.players.find(p => !p.is_ai) : null;
    return h ? h.faction : null;
  }

  static isHumanBattle(battle, gameState) {
    if (!battle) return false;
    const h = DiceGate.humanFaction(gameState);
    return battle.attacker_faction === h || battle.defender_faction === h;
  }

  static battleNeedsClick(battle, gameState) {
    if (!battle || !battle.history || battle.history.length === 0) return false;
    if (battle.state === 'finished') return false;
    return DiceGate.isHumanBattle(battle, gameState);
  }

  static settle(ui, el, face, isAttacker, diceCls) {
    el.className = `dice-face ${diceCls} ${face.toLowerCase()} dice-settled`;
    el.innerHTML = `<span class="dice-icon">${ui._getDiceIcon(face)}</span><span class="reave-dice-val">${ui._getDiceValueTag(face, isAttacker)}</span>`;
  }

  static tumble(ui, el, diceCls) {
    const faces = ['Kraken', 'Axe', 'Shield', 'Eye'];
    const f = faces[Math.floor(Math.random() * faces.length)];
    el.className = `dice-face ${diceCls} ${f.toLowerCase()} dice-tumbling`;
    const iconEl = el.querySelector('.dice-icon');
    if (iconEl) iconEl.textContent = ui._getDiceIcon(f);
  }

  static hiddenDice(ui, box, n, diceCls) {
    box.innerHTML = '';
    const els = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = `dice-face ${diceCls} dice-hidden`;
      d.innerHTML = `<span class="dice-icon">?</span><span class="reave-dice-val">…</span>`;
      box.appendChild(d);
      els.push(d);
    }
    return els;
  }

  static async revealSequential(ui, attEls, attFaces, defEls, defFaces, diceCls) {
    for (let i = 0; i < attEls.length; i++) {
      await new Promise(r => setTimeout(r, DiceGate.PER_DIE_MS));
      DiceGate.settle(ui, attEls[i], attFaces[i], true, diceCls);
      if (typeof SoundFX !== 'undefined') SoundFX.play('click');
    }
    for (let i = 0; i < defEls.length; i++) {
      await new Promise(r => setTimeout(r, DiceGate.PER_DIE_MS));
      DiceGate.settle(ui, defEls[i], defFaces[i], false, diceCls);
      if (typeof SoundFX !== 'undefined') SoundFX.play('click');
    }
  }

  static trayPlaceholder(ui) {
    if (ui.elements.diceTraySubtitle) ui.elements.diceTraySubtitle.textContent = 'Awaiting your roll…';
    const ph = '<span class="dice-placeholder">🎲 Awaiting your roll…</span>';
    if (ui.elements.attackerDiceContainer) ui.elements.attackerDiceContainer.innerHTML = ph;
    if (ui.elements.defenderDiceContainer) ui.elements.defenderDiceContainer.innerHTML = ph;
    if (ui.elements.diceSummaryBanner) ui.elements.diceSummaryBanner.style.display = 'none';
  }

  static finishReaveOutcome(ui, reaveOutcome) {
    const o = reaveOutcome;
    if (o.success) {
      ui.elements.reaveOutcomeCard.className = 'reave-outcome-card victory result-banner-pop';
      ui.elements.reaveOutcomeTitle.textContent = `VICTORY — ${o.target_name.toUpperCase()} SACKED!`;
      ui.elements.reaveOutcomeDesc.textContent = `The Ironborn overwhelm the defenses and carry away their plunder!`;
      let spoilsHtml = `<span class="spoil-pill hoard">+${o.hoard_gained} Hoard</span><span class="spoil-pill legend">+${o.legend_gained} Legend</span>`;
      spoilsHtml += o.crew_lost > 0 ? `<span class="spoil-pill casualty">-${o.crew_lost} Warriors Fallen (${o.defender_roll.hits} counter hits − ${o.attacker_roll.blocks} blocks)</span>` : `<span class="spoil-pill safe">Zero Casualties</span>`;
      ui.elements.reaveSpoilsRow.innerHTML = spoilsHtml;
      ui.elements.btnReaveConfirm.textContent = 'Claim Plunder & Continue';
    } else {
      ui.elements.reaveOutcomeCard.className = 'reave-outcome-card repelled result-banner-pop';
      ui.elements.reaveOutcomeTitle.textContent = `RAID REPELLED AT ${o.target_name.toUpperCase()}`;
      const guardDesc = o.guard_lost > 0 ? ` Landed ${o.guard_lost} hit(s): garrison reduced to ⛨${o.new_defense || (o.defense_required - o.guard_lost)} defense!` : '';
      ui.elements.reaveOutcomeDesc.textContent = `Scored ${o.net_attacker_hits} net hit(s) against ${o.defense_required} required defense.${guardDesc} Garrison counter-attack dealt ${o.defender_roll.hits} hits!`;
      let casualtiesHtml = o.guard_lost > 0 ? `<span class="spoil-pill guard" style="background:#3a200a;color:#f5a623;border:1px solid #c5972c;">⛨ Guard -${o.guard_lost}</span>` : '';
      casualtiesHtml += `<span class="spoil-pill casualty">-${o.crew_lost} Warriors Fallen (${o.defender_roll.hits} counter hits − ${o.attacker_roll.blocks} blocks)</span>`;
      ui.elements.reaveSpoilsRow.innerHTML = casualtiesHtml;
      ui.elements.btnReaveConfirm.textContent = 'Fall Back & Continue';
    }
  }

  // Full gated raid flow (bypasses the auto-roll modal; locked until rolled)
  static gatedReave(ui, reaveOutcome, onComplete) {
    const o = reaveOutcome;
    ui.elements.reaveModalTitle.innerHTML = `⚔ Raid on ${o.target_name}`;
    ui.elements.reaveDefenseBadge.innerHTML = `⛨ Keep Defense: <strong>${o.defense_required}</strong> Hits Required`;
    ui.elements.reaveAttackerName.textContent = o.attacker_faction || 'Attacking Fleet';
    ui.elements.reaveDefenderName.textContent = `${o.target_name} Garrison`;
    ui.elements.reaveOutcomeCard.style.display = 'none';
    ui.elements.reaveOutcomeCard.className = 'reave-outcome-card';
    ['reaveStatHits', 'reaveStatBlocks', 'reaveStatNet'].forEach(k => { ui.elements[k].textContent = '...'; });
    ui.elements.reaveStatNeeded.textContent = `${o.defense_required}`;
    ui.elements.reaveAttackerTally.textContent = '🎲 Awaiting your roll…';
    ui.elements.reaveDefenderTally.textContent = '🎲 Awaiting your roll…';
    const attEls = DiceGate.hiddenDice(ui, ui.elements.reaveAttackerDice, o.attacker_roll.dice.length, 'reave-dice-face');
    const defEls = DiceGate.hiddenDice(ui, ui.elements.reaveDefenderDice, o.defender_roll.dice.length, 'reave-dice-face');
    ui.elements.modalReave.style.display = 'flex';
    ui._diceGateOpen = true;
    DiceGate.trayPlaceholder(ui);
    const rollBtn = ui.elements.btnReaveConfirm;
    rollBtn.disabled = false;
    rollBtn.textContent = '🎲 ROLL THE DICE — Tap to roll!';
    rollBtn.classList.add('btn-roll-pulse');
    const closeX = ui.elements.btnCloseReaveX;
    closeX.style.opacity = '0.3';
    closeX.style.pointerEvents = 'none';
    closeX.onclick = null;
    let isClosed = false, rolling = false;
    const finish = () => {
      if (isClosed) return;
      isClosed = true;
      ui._diceGateOpen = false;
      rollBtn.classList.remove('btn-roll-pulse');
      ui.elements.modalReave.style.display = 'none';
      ui.renderDiceRoll(o, true);
      if (onComplete) onComplete();
    };
    rollBtn.onclick = async () => {
      if (rolling) return;
      rolling = true;
      rollBtn.disabled = true;
      rollBtn.textContent = 'Rolling…';
      if (typeof SoundFX !== 'undefined') SoundFX.play('dice');
      const tumble = setInterval(() => {
        attEls.forEach(el => DiceGate.tumble(ui, el, 'reave-dice-face'));
        defEls.forEach(el => DiceGate.tumble(ui, el, 'reave-dice-face'));
      }, 90);
      await new Promise(r => setTimeout(r, 500));
      clearInterval(tumble);
      await DiceGate.revealSequential(ui, attEls, o.attacker_roll.dice, defEls, o.defender_roll.dice, 'reave-dice-face');
      ui.elements.reaveAttackerTally.innerHTML = `<strong>${o.attacker_roll.hits}</strong> Hits ${o.attacker_roll.blocks > 0 ? `• <strong>${o.attacker_roll.blocks}</strong> Blocks` : ''}`;
      ui.elements.reaveDefenderTally.innerHTML = `<strong>${o.defender_roll.blocks}</strong> Blocks • <strong>${o.defender_roll.hits}</strong> Counter Hits`;
      ui.elements.reaveStatHits.textContent = `${o.attacker_roll.hits}`;
      ui.elements.reaveStatBlocks.textContent = `${o.defender_roll.blocks}`;
      ui.elements.reaveStatNet.textContent = `${o.net_attacker_hits}`;
      ui.elements.reaveOutcomeCard.style.display = 'flex';
      DiceGate.finishReaveOutcome(ui, o);
      rollBtn.disabled = false;
      if (typeof SoundFX !== 'undefined' && o.success) setTimeout(() => SoundFX.play('reave'), 400);
      closeX.style.opacity = '';
      closeX.style.pointerEvents = '';
      closeX.onclick = finish;
      rollBtn.onclick = finish;
    };
  }

  // Naval gate: mask just-rendered dice, reveal on Roll click (auto=true: immediately)
  static gateBattleRound(ui, battleState, currentRound, auto = false) {
    const attEls = DiceGate.hiddenDice(ui, ui.elements.battleAttackerDice, currentRound.attacker_roll.dice.length, '');
    const defEls = DiceGate.hiddenDice(ui, ui.elements.battleDefenderDice, currentRound.defender_roll.dice.length, '');
    ui.elements.battleAttackerTally.textContent = auto ? 'Rolling…' : '🎲 Awaiting your roll…';
    ui.elements.battleDefenderTally.textContent = auto ? 'Rolling…' : '🎲 Awaiting your roll…';
    ui.elements.battleDmgToDefender.textContent = '…';
    ui.elements.battleDmgToAttacker.textContent = '…';
    ui.elements.battlePowersBar.style.display = 'none';
    ui.elements.btnBattleRetreat.style.display = 'none';
    ui.elements.btnBattleContinue.style.display = 'none';
    const restore = () => {
      ui.elements.battlePowersBar.style.display = 'flex';
      ui.elements.btnBattleRetreat.style.display = 'inline-block';
      ui.elements.btnBattleContinue.style.display = 'inline-block';
    };
    const rollBtn = document.getElementById('btn-battle-roll');
    if (!rollBtn) { if (auto) DiceGate._revealBattleDice(ui, currentRound, attEls, defEls).then(restore); return; }
    if (auto) {
      DiceGate._revealBattleDice(ui, currentRound, attEls, defEls).then(restore);
      return;
    }
    rollBtn.style.display = 'inline-block';
    rollBtn.textContent = '🎲 ROLL THE DICE — Tap to roll!';
    let rolling = false;
    rollBtn.onclick = async () => {
      if (rolling) return;
      rolling = true;
      rollBtn.disabled = true;
      rollBtn.textContent = 'Rolling…';
      await DiceGate._revealBattleDice(ui, currentRound, attEls, defEls);
      rollBtn.style.display = 'none';
      rollBtn.disabled = false;
      rollBtn.textContent = '🎲 ROLL THE DICE — Tap to roll!';
      restore();
    };
  }

  // Finished naval reveal (round-1 knockout or round 2): shared tumble + stagger
  static async _revealBattleDice(ui, round, attEls, defEls) {
    if (typeof SoundFX !== 'undefined') { SoundFX.play('dice'); SoundFX.play('clash'); }
    const tumble = setInterval(() => {
      attEls.forEach(el => DiceGate.tumble(ui, el, ''));
      defEls.forEach(el => DiceGate.tumble(ui, el, ''));
    }, 90);
    await new Promise(r => setTimeout(r, 500));
    clearInterval(tumble);
    await DiceGate.revealSequential(ui, attEls, round.attacker_roll.dice, defEls, round.defender_roll.dice, '');
    ui.elements.battleAttackerTally.innerHTML = `<strong>${round.attacker_roll.hits}</strong> Hits • <strong>${round.attacker_roll.blocks}</strong> Blocks`;
    ui.elements.battleDefenderTally.innerHTML = `<strong>${round.defender_roll.hits}</strong> Hits • <strong>${round.defender_roll.blocks}</strong> Blocks`;
    ui.elements.battleDmgToDefender.textContent = `${round.net_attacker_hits} Crew`;
    ui.elements.battleDmgToAttacker.textContent = `${round.net_defender_hits} Crew`;
  }

  // Finished naval gate: first reveal clicks (auto=true: round 2+ auto-plays)
  static gateBattleFinal(ui, battle, round, auto = false) {
    const attEls = DiceGate.hiddenDice(ui, ui.elements.battleAttackerDice, round.attacker_roll.dice.length, '');
    const defEls = DiceGate.hiddenDice(ui, ui.elements.battleDefenderDice, round.defender_roll.dice.length, '');
    ui.elements.battleAttackerTally.textContent = auto ? 'Rolling…' : '🎲 Awaiting your roll…';
    ui.elements.battleDefenderTally.textContent = auto ? 'Rolling…' : '🎲 Awaiting your roll…';
    const banner = ui.elements.battleOutcomeBanner, dismiss = ui.elements.btnBattleDismiss;
    const closeX = (typeof document !== 'undefined') ? document.getElementById('btn-close-battle-x') : null;
    banner.style.display = 'none';
    dismiss.style.display = 'none';
    if (closeX) closeX.style.display = 'none';
    const restore = () => {
      banner.style.display = 'flex';
      dismiss.style.display = 'inline-block';
      if (closeX) closeX.style.display = 'block';
    };
    if (auto) {
      DiceGate._revealBattleDice(ui, round, attEls, defEls).then(restore);
      return;
    }
    const rollBtn = document.getElementById('btn-battle-roll');
    if (!rollBtn) return;
    rollBtn.style.display = 'inline-block';
    rollBtn.textContent = '🎲 ROLL THE DICE — Tap to roll!';
    let rolling = false;
    rollBtn.onclick = async () => {
      if (rolling) return;
      rolling = true;
      rollBtn.disabled = true;
      rollBtn.textContent = 'Rolling…';
      await DiceGate._revealBattleDice(ui, round, attEls, defEls);
      rollBtn.style.display = 'none';
      rollBtn.disabled = false;
      rollBtn.textContent = '🎲 ROLL THE DICE — Tap to roll!';
      restore();
    };
  }
}

if (typeof UIController !== 'undefined') {
  UIController.prototype._diceGateOrigBattle = UIController.prototype.showBattleModal;
  UIController.prototype.showBattleModal = function (battleState, callbacks = {}, activeFaction = null, playerFavor = 0, gameState = null, opts = {}) {
    const r = this._diceGateOrigBattle(battleState, callbacks, activeFaction, playerFavor, gameState);
    const hist = (battleState && battleState.history) || [];
    const round = hist.length > 0 ? hist[hist.length - 1] : null;
    // First reveal of a human battle always clicks (even a round-1 knockout);
    // later rounds autoplay. Re-shows with no new dice stay settled.
    if (!round || !DiceGate.isHumanBattle(battleState, gameState)) return r;
    if (this._diceSeenId !== battleState.battle_id) { this._diceSeenId = battleState.battle_id; this._diceSeenRounds = 0; }
    if (hist.length <= this._diceSeenRounds) return r;
    this._diceSeenRounds = hist.length;
    const isFinal = battleState.state === 'finished';
    if (hist.length === 1) {
      if (isFinal) DiceGate.gateBattleFinal(this, battleState, round, false);
      else DiceGate.gateBattleRound(this, battleState, round, false);
    } else {
      if (isFinal) DiceGate.gateBattleFinal(this, battleState, round, true);
      else DiceGate.gateBattleRound(this, battleState, round, true);
    }
    return r;
  };
  UIController.prototype._diceGateOrigReave = UIController.prototype.showReaveModal;
  UIController.prototype.showReaveModal = function (reaveOutcome, onComplete = null, autoDismissMs = 0, opts = {}) {
    if (opts && opts.requiresClick && !autoDismissMs && reaveOutcome) {
      DiceGate.gatedReave(this, reaveOutcome, onComplete);
      return;
    }
    return this._diceGateOrigReave(reaveOutcome, onComplete, autoDismissMs);
  };

  UIController.prototype._diceGateOrigTray = UIController.prototype.renderDiceRoll;
  UIController.prototype.renderDiceRoll = function (reaveOutcome, isNewRoll = false) {
    if (this._diceGateOpen && reaveOutcome) { DiceGate.trayPlaceholder(this); return; }
    return this._diceGateOrigTray(reaveOutcome, isNewRoll);
  };
}
