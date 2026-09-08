/**
 * IRON PRICE: Kingsmoot — Willing-Attacker Naval Choice (resolve NOW vs WAIT)
 * Handles deferred-clash choice modal, reinforcement banner, and action gating
 * without bloating app.js / ui.js past the 700-line quota (prototype patches).
 */

class NavalChoice {
  static isAwaiting(battle) {
    return Boolean(battle && battle.state === 'awaiting_choice');
  }

  static isDeferred(battle) {
    return Boolean(battle && (battle.state === 'deferred' || battle.deferred === true));
  }

  static isPending(battle) {
    return NavalChoice.isAwaiting(battle) || NavalChoice.isDeferred(battle);
  }

  static async choose(app, choice) {
    if (!app || !app.currentBattle) return;
    const battleId = app.currentBattle.battle_id;
    try {
      const res = await API.sendAction('battle_choice', { battle_id: battleId, choice });
      if (!res.success) {
        app.ui.showToast(res.error || 'Battle choice failed!', 'error');
        return;
      }
      const battle = res.battle || (res.state && res.state.active_battle);
      app.gameState = res.state;
      if (battle && NavalChoice.isDeferred(battle)) {
        app.currentBattle = battle;
        if (app.ui.elements.modalBattle) app.ui.elements.modalBattle.style.display = 'none';
        app.ui.showToast('⏳ Clash deferred! Sail a friendly longship into the contested sea, then it erupts at end of actions.', 'info');
        app.refresh(false);
        NavalChoice.updateBanner(app.gameState);
        return;
      }
      if (battle) {
        app.currentBattle = battle;
        app.refresh(false);
        app.showBattle(app.currentBattle);
        return;
      }
      app.currentBattle = null;
      app.refresh();
    } catch (err) {
      console.error('Battle choice error:', err);
      if (app && app.ui) app.ui.showToast('Failed to send battle choice', 'error');
    }
  }

  static updateBanner(gameState) {
    const banner = document.getElementById('deferred-banner');
    if (!banner) return;
    const battle = gameState ? gameState.active_battle : null;
    if (NavalChoice.isAwaiting(battle)) {
      banner.style.display = 'block';
      banner.textContent = `⏳ ${battle.attacker_faction} vs ${battle.defender_faction} at ${battle.node_id.toUpperCase()} — resolve NOW or WAIT?`;
    } else if (NavalChoice.isDeferred(battle)) {
      banner.style.display = 'block';
      banner.textContent = `⏳ Deferred clash at ${battle.node_id.toUpperCase()} — sail reinforcements, then it erupts at end of actions!`;
    } else {
      banner.style.display = 'none';
    }
  }
}

// Patch UIController.showBattleModal to render choice mode first.
if (typeof UIController !== 'undefined') {
  UIController.prototype._origShowBattleModal = UIController.prototype.showBattleModal;
  UIController.prototype.showBattleModal = function (battleState, callbacks = {}, activeFaction = null, playerFavor = 0) {
    const choiceBox = document.getElementById('battle-choice-box');
    const choiceDesc = document.getElementById('battle-choice-desc');
    const btnNow = document.getElementById('btn-battle-resolve-now');
    const btnWait = document.getElementById('btn-battle-defer');
    if (NavalChoice.isAwaiting(battleState)) {
      if (this.elements.modalBattle) this.elements.modalBattle.style.display = 'flex';
      if (this.elements.battleModalTitle) this.elements.battleModalTitle.textContent = `⏳ NAVAL CLASH PENDING: ${battleState.node_id.toUpperCase()}`;
      if (this.elements.battleRoundBadge) this.elements.battleRoundBadge.textContent = 'Awaiting orders';
      if (this.elements.battleAttackerName) this.elements.battleAttackerName.textContent = battleState.attacker_faction;
      if (this.elements.battleAttackerShip) this.elements.battleAttackerShip.textContent = this.getShipDisplayName(battleState.attacker_ship_id);
      if (this.elements.battleDefenderName) this.elements.battleDefenderName.textContent = battleState.defender_faction;
      if (this.elements.battleDefenderShip) this.elements.battleDefenderShip.textContent = this.getShipDisplayName(battleState.defender_ship_id);
      if (this.elements.battleAttackerDice) this.elements.battleAttackerDice.innerHTML = '<span class="dice-placeholder">Dice held — no roll yet</span>';
      if (this.elements.battleDefenderDice) this.elements.battleDefenderDice.innerHTML = '<span class="dice-placeholder">Dice held — no roll yet</span>';
      if (this.elements.battleAttackerTally) this.elements.battleAttackerTally.textContent = '⏳ Awaiting orders...';
      if (this.elements.battleDefenderTally) this.elements.battleDefenderTally.textContent = '⏳ Awaiting orders...';
      if (this.elements.battlePowersBar) this.elements.battlePowersBar.style.display = 'none';
      if (this.elements.battleOutcomeBanner) this.elements.battleOutcomeBanner.style.display = 'none';
      if (this.elements.btnBattleRetreat) this.elements.btnBattleRetreat.style.display = 'none';
      if (this.elements.btnBattleContinue) this.elements.btnBattleContinue.style.display = 'none';
      if (this.elements.btnBattleDismiss) this.elements.btnBattleDismiss.style.display = 'none';
      if (choiceBox) choiceBox.style.display = 'flex';
      if (choiceDesc) choiceDesc.textContent = `${battleState.attacker_faction} sailed willingly into ${battleState.defender_faction} waters at ${battleState.node_id.toUpperCase()}. Resolve dice NOW, or WAIT until end of actions to sail a second friendly longship in for +1 bonus die.`;
      if (btnNow) btnNow.onclick = () => callbacks.onResolveNow && callbacks.onResolveNow();
      if (btnWait) btnWait.onclick = () => callbacks.onDefer && callbacks.onDefer();
      const closeX = document.getElementById('btn-close-battle-x');
      if (closeX) closeX.style.display = 'none';
      return;
    }
    if (choiceBox) choiceBox.style.display = 'none';
    return this._origShowBattleModal(battleState, callbacks, activeFaction, playerFavor);
  };

  // Patch action gating: End Turn stays available while deferred/awaiting.
  UIController.prototype._origUpdateActionButtons = UIController.prototype.updateActionButtons;
  UIController.prototype.updateActionButtons = function (gameState, selection) {
    this._origUpdateActionButtons(gameState, selection);
    const battle = gameState ? gameState.active_battle : null;
    if (NavalChoice.isPending(battle)) {
      const activePlayer = gameState.players[gameState.active_player_idx];
      const isHumanTurn = activePlayer && !activePlayer.is_ai;
      if (this.elements.btnEndTurn) this.elements.btnEndTurn.disabled = !isHumanTurn || gameState.game_over;
      if (this.elements.btnCallStorm) this.elements.btnCallStorm.disabled = true;
    }
    NavalChoice.updateBanner(gameState);
  };
}

// Patch KingsmootApp.showBattle to wire choice callbacks; hide modal for deferred.
if (typeof KingsmootApp !== 'undefined') {
  KingsmootApp.prototype._origShowBattle = KingsmootApp.prototype.showBattle;
  KingsmootApp.prototype.showBattle = function (battle) {
    if (!battle) return;
    if (NavalChoice.isDeferred(battle)) {
      if (this.ui.elements.modalBattle) this.ui.elements.modalBattle.style.display = 'none';
      NavalChoice.updateBanner(this.gameState);
      return;
    }
    const baseCallbacks = {
      onBloodPrice: () => this.handleBattleAction({ use_blood_price: true }),
      onMiracleReroll: () => this.handleBattleAction({ miracle_cost: 2 }),
      onMiracleAutowin: () => this.handleBattleAction({ miracle_cost: 6 }),
      onRetreat: () => this.handleBattleAction({ retreat: true }),
      onContinue: () => this.handleBattleAction({ continue_round: true }),
      onResolveNow: () => NavalChoice.choose(this, 'resolve_now'),
      onDefer: () => NavalChoice.choose(this, 'defer'),
      onDismiss: async () => {
        this.currentBattle = null;
        if (this.ui.elements.modalBattle) this.ui.elements.modalBattle.style.display = 'none';
        if (battle.state === 'finished' && (battle.sunk_ship_ids || []).length && this.mapRenderer) {
          await this.mapRenderer.playShipSinking(battle);
        }
        this.refresh();
      }
    };
    const activePlayer = this.gameState.players[this.gameState.active_player_idx];
    const playerFavor = activePlayer ? activePlayer.favor : 0;
    const activeFaction = this.gameState.active_faction;
    this.ui.showBattleModal(battle, baseCallbacks, activeFaction, playerFavor);
  };

  // Patch refresh so deferred clashes never pop the dice modal mid-manoeuvre.
  KingsmootApp.prototype._origRefresh = KingsmootApp.prototype.refresh;
  KingsmootApp.prototype.refresh = function (autoCheckAi = true) {
    this.mapRenderer.update(this.gameState, this.currentSelection);
    this.ui.update(this.gameState, this.currentSelection);
    if (this.gameState.last_reave_outcome) {
      this.ui.renderDiceRoll(this.gameState.last_reave_outcome, false);
    }
    if (this.gameState.last_hazard_outcome) {
      const hazardKey = JSON.stringify(this.gameState.last_hazard_outcome);
      if (this.lastSeenHazardStr !== hazardKey) {
        this.lastSeenHazardStr = hazardKey;
        this.ui.showHazardNotification(this.gameState.last_hazard_outcome);
      }
    }
    if (this.currentBattle || this.isClashAnimating) return;
    if (this.gameState.active_battle) {
      if (NavalChoice.isDeferred(this.gameState.active_battle)) {
        NavalChoice.updateBanner(this.gameState);
        if (autoCheckAi) this.checkAiTurn();
        return;
      }
      this.currentBattle = this.gameState.active_battle;
      this.showBattle(this.currentBattle);
      return;
    }
    NavalChoice.updateBanner(this.gameState);
    if (autoCheckAi && (!this.currentBattle || this.currentBattle.state === 'finished')) {
      this.checkAiTurn();
    }
  };
}
