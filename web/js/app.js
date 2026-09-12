/**
 * IRON PRICE: Kingsmoot — Main Application Controller (Phase 1)
 */

class KingsmootApp {
  constructor() {
    this.mapRenderer = null;
    this.ui = new UIController();
    this.mapData = null;
    this.gameState = null;
    this.currentSelection = { type: 'none' };
    this.aiAutoStepTimer = null;
    this.currentBattle = null;
    this.lastSeenHazardStr = null;
    this._steppingAi = false;
  }

  async init() {
    try {
      // 1. Fetch Map Data & Initial State
      this.mapData = await API.getMapData();
      this.mapRenderer = new MapRenderer(
        'game-map-svg',
        (selection) => this.handleSelection(selection),
        (target) => this.handleRightClick(target)
      );
      this.mapRenderer.init(this.mapData);

      this.gameState = await API.getState();
      this.refresh();

      // 2. Setup Event Listeners
      this.bindEvents();

      console.log("⚔️ IRON PRICE: Kingsmoot App Initialized successfully!");
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  refresh(autoCheckAi = true) {
    this.mapRenderer.update(this.gameState, this.currentSelection);
    this.ui.update(this.gameState, this.currentSelection);

    if (this.gameState.last_reave_outcome) {
      this.ui.renderDiceRoll(this.gameState.last_reave_outcome, false);
    }

    // Hazard notifications (e.g. Storm Belt hazard)
    if (this.gameState.last_hazard_outcome) {
      const hazardKey = JSON.stringify(this.gameState.last_hazard_outcome);
      if (this.lastSeenHazardStr !== hazardKey) {
        this.lastSeenHazardStr = hazardKey;
        this.ui.showHazardNotification(this.gameState.last_hazard_outcome);
      }
    }

    // Check active battle
    if (this.currentBattle || this.isClashAnimating) {
      return;
    }
    if (this.gameState.active_battle) {
      this.currentBattle = this.gameState.active_battle;
      this.showBattle(this.currentBattle);
      return;
    }

    // Auto-step AI if active player is a bot and no active battle
    if (autoCheckAi && (!this.currentBattle || this.currentBattle.state === 'finished')) {
      this.checkAiTurn();
    }
  }

  handleSelection(selection) {
    if (selection.type === 'ship') {
      this.currentSelection = selection;
      this.refresh();
      return;
    }

    if (this.currentSelection.type === 'ship' && selection.type === 'node') {
      let shipObj = null, shipLoc = null;
      for (const [nid, n] of Object.entries(this.gameState.nodes)) {
        const s = n.occupants.find(x => x.id === this.currentSelection.shipId);
        if (s) { shipObj = s; shipLoc = nid; break; }
      }
      const target = this.gameState.nodes[selection.nodeId];
      if (shipObj && shipObj.faction === this.gameState.active_faction && target && target.id !== shipLoc) {
        if (this.gameState.actions_remaining <= 0) {
          this.ui.showToast("All actions spent. Click 'End Turn' to pass.", "info");
          return;
        }
        if (shipObj.crew <= 0) {
          const msg = (target.kind === 'land')
            ? `Cannot reave with ${this.ui.getShipDisplayName(shipObj.id)}: 0 warriors on board!`
            : `Cannot move ${this.ui.getShipDisplayName(shipObj.id)}: 0 warriors on board (Muster first)!`;
          this.ui.showToast(msg, 'error');
          return;
        }
        const desc = `${shipObj.faction} ${this.ui.getShipDisplayName(shipObj.id)}`;
        const locName = this.gameState.nodes[shipLoc].name;
        this.mapRenderer.selectedShipId = this.currentSelection.shipId;
        const isLand = target.kind === 'land';
        if (isLand) {
          this.ui.enableReaveButton(shipObj.id, target);
          this.currentSelection.targetLandId = target.id;
          delete this.currentSelection.targetSeaId;
        } else {
          const hasEnemy = target.occupants && target.occupants.some(s => s.faction !== shipObj.faction && s.crew > 0);
          this.ui.enableSailButton(shipObj.id, target, hasEnemy);
          this.currentSelection.targetSeaId = target.id;
          delete this.currentSelection.targetLandId;
        }
        this.ui.elements.selectedEntityName.textContent = `${desc} @ ${locName} ➔ ${isLand ? 'Target: ' : 'Destination: '}${target.name}`;
        this.ui.elements.btnMuster.disabled = true;
        this.mapRenderer.highlightSelection();
        const el = document.getElementById(`node-g-${target.id}`);
        if (el) el.classList.add(isLand ? 'reave-highlight' : 'target-highlight');
        return;
      }
    }
    this.currentSelection = selection;
    this.refresh();
  }

  handleRightClick(target) {
    if (!this.gameState || this.gameState.game_over) return;
    const activeFaction = this.gameState.active_faction;
    const activePlayer = this.gameState.players[this.gameState.active_player_idx];
    
    if (activePlayer.is_ai) {
      this.ui.showToast("Not your turn (Bot's turn).", "error");
      return;
    }

    if (this.gameState.actions_remaining <= 0) {
      this.ui.showToast("All actions spent. Click 'End Turn' to pass.", "info");
      return;
    }

    // 1. If no ship currently selected:
    if (!this.currentSelection || this.currentSelection.type !== 'ship') {
      // If right-clicked active player's ship -> select it
      if (target.type === 'ship') {
        const nodeObj = this.gameState.nodes[target.nodeId];
        const shipObj = nodeObj ? nodeObj.occupants.find(s => s.id === target.shipId) : null;
        if (shipObj && shipObj.faction === activeFaction) {
          this.currentSelection = target;
          this.refresh();
          this.ui.showToast(`Ship ${shipObj.id} selected! Right-click sea to Sail, right-click keep to Reave.`, "info");
          return;
        }
      }
      this.ui.showToast("Select your ship (left-click) first, then right-click destination.", "info");
      return;
    }

    // 2. A ship is selected:
    const selectedShipId = this.currentSelection.shipId;
    let shipLocation = null;
    let shipObj = null;

    for (const [nId, n] of Object.entries(this.gameState.nodes)) {
      for (const s of n.occupants) {
        if (s.id === selectedShipId) {
          shipLocation = nId;
          shipObj = s;
          break;
        }
      }
    }

    if (!shipObj || shipObj.faction !== activeFaction) {
      this.ui.showToast("Selected ship does not belong to you.", "error");
      return;
    }

    let targetNodeId = (target.type === 'node') ? target.nodeId : target.nodeId;
    if (!targetNodeId || !this.gameState.nodes[targetNodeId]) return;
    const targetNode = this.gameState.nodes[targetNodeId];

    // Right-click on Green Land -> REAVE!
    if (targetNode.kind === 'land') {
      if (shipObj.crew <= 0) {
        this.ui.showToast(`Cannot reave with ${this.ui.getShipDisplayName(shipObj.id)}: 0 warriors on board!`, "error");
        return;
      }
      this.executeReaveDirect(selectedShipId, targetNodeId);
      return;
    }

    // Right-click on Sea or Isle -> SAIL!
    if (targetNode.kind === 'sea' || targetNode.kind === 'isle') {
      if (targetNodeId === shipLocation) {
        this.ui.showToast(`Ship is already at ${targetNode.name}.`, "info");
        return;
      }
      if (shipObj.crew <= 0) {
        this.ui.showToast(`Cannot move ${this.ui.getShipDisplayName(shipObj.id)}: 0 warriors on board (Muster first)!`, "error");
        return;
      }
      this.executeSail(selectedShipId, targetNodeId);
      return;
    }
  }

  async executeReaveDirect(shipId, targetLandId) {
    try {
      let shipLoc = null;
      if (this.gameState) {
        for (const [nid, node] of Object.entries(this.gameState.nodes)) {
          if (node.occupants && node.occupants.some(s => s.id === shipId)) {
            shipLoc = nid;
            break;
          }
        }
      }

      const res = await API.sendAction('reave', {
        ship_id: shipId,
        target_land_id: targetLandId
      });

      this.completeHumanReave(res, shipId, targetLandId, shipLoc);
    } catch (err) {
      console.error("Reave error:", err);
      this.ui.showToast("Failed to execute Reave action", "error");
    }
  }

  // Shared human reave completion: full UI refresh, but the MAP keeps
  // wiped hulls at the raid origin behind the dice popup (no vanish);
  // after close it plays axe + dying, and only then reveals respawns.
  completeHumanReave(res, shipId, targetLandId, shipLoc) {
    if (!res.success) {
      this.ui.showToast(res.error || "Reave failed!", "error");
      return;
    }
    const reaveOutcome = res.state.last_reave_outcome;
    this.gameState = res.state;
    this.currentSelection = { type: 'none' };
    this.refresh(false);
    this.mapRenderer.update(this.mapRenderer.raidTableau(reaveOutcome, shipLoc, res.state), this.currentSelection);

    if (reaveOutcome) {
      this.ui.showReaveModal(reaveOutcome, async () => {
        if (shipLoc) {
          await this.mapRenderer.animateReaveTargeting(shipLoc, targetLandId, reaveOutcome, shipId);
          await this.mapRenderer.playRaidDefeat(reaveOutcome, shipLoc);
          this.mapRenderer.update(this.gameState, this.currentSelection);
        }
        this.checkAiTurn();
      });
    } else {
      this.checkAiTurn();
    }
  }

  async executeSail(shipId, targetNodeId) {
    try {
      let currentLoc = null, shipObj = null;
      const activeFaction = this.gameState ? this.gameState.active_faction : 'Asha';
      if (this.gameState) {
        for (const [nid, node] of Object.entries(this.gameState.nodes)) {
          const found = node.occupants && node.occupants.find(s => s.id === shipId);
          if (found) { currentLoc = nid; shipObj = found; break; }
        }
      }
      if (shipObj && shipObj.crew <= 0) {
        this.ui.showToast(`Cannot move ${this.ui.getShipDisplayName(shipId)}: 0 warriors on board (Muster first)!`, "error");
        return;
      }

      const res = await API.sendAction('sail', {
        ship_id: shipId,
        target_node: targetNodeId
      });

      if (res.success) {
        const battle = res.battle || (res.state && res.state.active_battle);
        if (battle) {
          this.isClashAnimating = true;
          if (currentLoc && currentLoc !== targetNodeId) {
            if (typeof SoundFX !== 'undefined') SoundFX.play('sail');
            await this.mapRenderer.animateShipSail(shipId, currentLoc, targetNodeId, activeFaction);
          }
          await this.mapRenderer.stageNavalClash(battle, this.gameState, res.state);
          this.isClashAnimating = false;
          this.gameState = res.state;
          this.currentSelection = { type: 'none' };
          this.currentBattle = battle;
          this.refresh(false);
          this.showBattle(this.currentBattle);
          return;
        }

        if (currentLoc && currentLoc !== targetNodeId) {
          if (typeof SoundFX !== 'undefined') SoundFX.play('sail');
          await this.mapRenderer.animateShipSail(shipId, currentLoc, targetNodeId, activeFaction);
        }

        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh();
      } else {
        this.ui.showToast(res.error || "Illegal move!", "error");
      }
    } catch (err) {
      console.error("Sail error:", err);
      this.ui.showToast("Failed to execute sail move", "error");
    }
  }

  executeSailFromButton() {
    if (!this.currentSelection || !this.currentSelection.shipId) {
      this.ui.showToast("Select your ship first!", "info");
      return;
    }
    if (!this.currentSelection.targetSeaId) {
      this.ui.showToast("Click destination sea/isle on map to sail!", "info");
      return;
    }
    this.executeSail(this.currentSelection.shipId, this.currentSelection.targetSeaId);
  }

  async executeReave() {
    if (!this.currentSelection || !this.currentSelection.shipId || !this.currentSelection.targetLandId) {
      this.ui.showToast("Select your ship and an adjacent Green Land keep first!", "error");
      return;
    }

    const shipId = this.currentSelection.shipId;
    const targetLandId = this.currentSelection.targetLandId;
    let shipLoc = null;
    if (this.gameState) {
      for (const [nid, node] of Object.entries(this.gameState.nodes)) {
        if (node.occupants && node.occupants.some(s => s.id === shipId)) {
          shipLoc = nid;
          break;
        }
      }
    }

    try {
      const res = await API.sendAction('reave', {
        ship_id: shipId,
        target_land_id: targetLandId
      });

      this.completeHumanReave(res, shipId, targetLandId, shipLoc);
    } catch (err) {
      console.error("Reave error:", err);
      this.ui.showToast("Reave action failed", "error");
    }
  }

  async executeMuster() {
    let nodeId = null;
    let shipId = null;

    if (this.currentSelection.type === 'node') {
      nodeId = this.currentSelection.nodeId;
    } else if (this.currentSelection.type === 'ship') {
      nodeId = this.currentSelection.nodeId;
      shipId = this.currentSelection.shipId;
    }

    if (!nodeId) {
      this.ui.showToast("Click your home port or ship to muster crew!", "error");
      return;
    }

    try {
      const res = await API.sendAction('muster', {
        node_id: nodeId,
        ship_id: shipId
      });

      if (res.success) {
        this.gameState = res.state;
        this.refresh();
      } else {
        this.ui.showToast(res.error || "Muster failed!", "error");
      }
    } catch (err) {
      console.error("Muster error:", err);
      this.ui.showToast("Muster action failed", "error");
    }
  }

  async executePray() {
    try {
      const res = await API.sendAction('pray');
      if (res.success) {
        this.gameState = res.state;
        this.refresh();
      } else {
        this.ui.showToast(res.error || "Pray failed!", "error");
      }
    } catch (err) {
      console.error("Pray error:", err);
      this.ui.showToast("Pray action failed", "error");
    }
  }

  async executeEndTurn() {
    try {
      const res = await API.sendAction('end_turn');
      if (res.success) {
        if (typeof SoundFX !== 'undefined') SoundFX.play('endTurn');
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh();
      }
    } catch (err) {
      console.error("End turn error:", err);
    }
  }

  async stepAi() {
    if (this._steppingAi) return;
    this._steppingAi = true;
    try {
      const prevState = this.gameState;
      const prevReaveOutcome = this.gameState ? this.gameState.last_reave_outcome : null;
      const res = await API.stepAI();
      if (res.success) {
        const nextState = res.state;
        const activeFaction = prevState ? prevState.active_faction : nextState.active_faction;

        // 1. Check if a SAIL action occurred -> animate ship sailing across nodes
        if (res.ship_id && res.from && res.to && res.from !== res.to) {
          if (typeof SoundFX !== 'undefined') SoundFX.play('sail');
          await this.mapRenderer.animateShipSail(res.ship_id, res.from, res.to, activeFaction);
        }

        // 2. Check if a REAVE action occurred -> map-only raid presentation:
        //    axe-flight + keep impact on the map is the SOLE visual for AI turns.
        //    The dice-roll popup modal is intentionally suppressed during AI turns
        //    (it would cover the map and hide the ravage animation); the bottom
        //    dice tray shows the tumbling dice instead.
        const newReave = res.outcome || (nextState.last_reave_outcome &&
          (!prevReaveOutcome || JSON.stringify(prevReaveOutcome) !== JSON.stringify(nextState.last_reave_outcome)) ? nextState.last_reave_outcome : null);
        const isRaid = Boolean(newReave && newReave.attacker_roll && newReave.defender_roll);

        if (isRaid) {
          // Guarantee no stale/visible popup can cover the map animation.
          if (this.ui.elements.modalReave) {
            this.ui.elements.modalReave.style.display = 'none';
          }
          const originNode = res.origin_node || newReave.origin_node;
          const targetLand = res.target_land_id || newReave.target_id;
          const raidShipId = res.ship_id || newReave.ship_id;
          if (originNode && targetLand) {
            try {
              await this.mapRenderer.animateReaveTargeting(originNode, targetLand, newReave, raidShipId);
              await this.mapRenderer.playRaidDefeat(newReave, originNode);
            } catch (animErr) {
              console.warn("AI raid animation failed:", animErr);
            }
          } else {
            console.warn("AI raid animation skipped: missing origin/target", { originNode, targetLand, res, newReave });
          }
        }

        // 3. Naval clash: swords play BEFORE the dice popup via staged
        //    tableau; sinking plays AFTER popup dismiss (or at once here
        //    when no popup follows, e.g. AI-vs-AI finished battles).
        const battle = res.battle || (nextState && nextState.active_battle);
        if (res.battle_triggered && battle) {
          this.isClashAnimating = true;
          await this.mapRenderer.stageNavalClash(battle, prevState, nextState);
          await this.mapRenderer.playShipSinking(battle);
          this.isClashAnimating = false;
        }

        this.gameState = nextState;
        this.refresh(false);

        // Re-apply rolling dice AFTER refresh: refresh() re-renders the tray in
        // settled mode from the fresh state object (different reference), which
        // would otherwise instantly wipe the raid's tumbling-dice effect.
        if (isRaid) {
          this.ui.renderDiceRoll(newReave, true);
        }

        // If human player is actively engaged in an unresolved battle, show battle modal
        const humanPlayer = this.gameState.players.find(p => !p.is_ai);
        const isHumanInBattle = battle && humanPlayer && 
          (battle.attacker_faction === humanPlayer.faction || battle.defender_faction === humanPlayer.faction) && 
          battle.state !== 'finished';
        
        if (isHumanInBattle) {
          this.currentBattle = battle;
          this.showBattle(this.currentBattle);
          return;
        }

        // Visual pacing: wait a moment before scheduling next AI step
        setTimeout(() => {
          this.checkAiTurn();
        }, 500);
      }
    } catch (err) {
      console.error("AI step error:", err);
    } finally {
      this._steppingAi = false;
    }
  }

  checkAiTurn() {
    if (this.aiAutoStepTimer) {
      clearTimeout(this.aiAutoStepTimer);
      this.aiAutoStepTimer = null;
    }

    if (!this.gameState || this.gameState.game_over) return;

    const activePlayer = this.gameState.players[this.gameState.active_player_idx];
    if (activePlayer && activePlayer.is_ai) {
      // Auto-step AI with visual pacing delay
      this.aiAutoStepTimer = setTimeout(() => {
        this.stepAi();
      }, 700);
    }
  }

  showBattle(battle) {
    if (!battle) return;
    const activePlayer = this.gameState.players[this.gameState.active_player_idx];
    const playerFavor = activePlayer ? activePlayer.favor : 0;
    const activeFaction = this.gameState.active_faction;

    this.ui.showBattleModal(battle, {
      onBloodPrice: () => this.handleBattleAction({ use_blood_price: true }),
      onMiracleReroll: () => this.handleBattleAction({ miracle_cost: 2 }),
      onMiracleAutowin: () => this.handleBattleAction({ miracle_cost: 6 }),
      onRetreat: () => this.handleBattleAction({ retreat: true }),
      onContinue: () => this.handleBattleAction({ continue_round: true }),
      onDismiss: async () => {
        this.currentBattle = null;
        if (this.ui.elements.modalBattle) {
          this.ui.elements.modalBattle.style.display = 'none';
        }
        if (battle && this.mapRenderer) this.mapRenderer.animateBattleCasualties(battle);
        if (battle.state === 'finished' && (battle.sunk_ship_ids || []).length) {
          await this.mapRenderer.playShipSinking(battle);
        }
        this.refresh();
      }
    }, activeFaction, playerFavor, this.gameState);
  }

  async handleBattleAction(actionPayload) {
    if (!this.currentBattle) return;
    try {
      actionPayload.battle_id = this.currentBattle.battle_id;
      const res = await API.sendAction('battle_round', actionPayload);
      if (res.success) {
        this.gameState = res.state;
        const battle = res.battle || (res.state && res.state.active_battle);
        if (battle) {
          this.currentBattle = battle;
          this.showBattle(this.currentBattle);
        } else {
          this.currentBattle = null;
          if (this.ui.elements.modalBattle) {
            this.ui.elements.modalBattle.style.display = 'none';
          }
          this.refresh();
        }
      } else {
        this.ui.showToast(res.error || "Battle action failed!", "error");
      }
    } catch (err) {
      console.error("Battle action error:", err);
      this.ui.showToast("Failed to process battle action", "error");
    }
  }

  handleCallStormClick() {
    if (!this.gameState || this.gameState.game_over) return;
    const activePlayer = this.gameState.players[this.gameState.active_player_idx];
    if (activePlayer.is_ai) {
      this.ui.showToast("Not your turn (Bot's turn).", "error");
      return;
    }
    if (activePlayer.favor < 4) {
      this.ui.showToast("Not enough Drowned Favor! 4 Favor required for Call Storm.", "error");
      return;
    }
    if (this.gameState.actions_remaining <= 0) {
      this.ui.showToast("No actions remaining this turn.", "error");
      return;
    }

    const activeFaction = this.gameState.active_faction;
    const validNodes = [];
    for (const [nId, node] of Object.entries(this.gameState.nodes)) {
      if (node.kind === 'sea' && node.occupants && node.occupants.some(s => s.faction !== activeFaction && s.crew > 0)) {
        validNodes.push(nId);
      }
    }

    if (validNodes.length === 0) {
      this.ui.showToast("No enemy fleet in sea zones to strike with storm!", "error");
      return;
    }

    this.ui.showToast("⚡ Click target sea zone for storm (flashing red)!", "info");
    this.mapRenderer.setMiracleTargetMode(true, validNodes, (targetNodeId) => {
      this.executeCallStorm(targetNodeId);
    });
  }

  async executeCallStorm(targetNodeId) {
    try {
      const enemy = (this.gameState && this.gameState.nodes[targetNodeId])
        ? this.gameState.nodes[targetNodeId].occupants.find(s => s.faction !== this.gameState.active_faction && s.crew > 0)
        : null;
      const res = await API.sendAction('favor_miracle', {
        miracle_type: 'call_storm',
        target_node: targetNodeId
      });

      if (res.success) {
        if (enemy && this.mapRenderer) this.mapRenderer.animateCrewLoss(enemy.id, 1, targetNodeId);
        this.gameState = res.state;
        this.refresh();
        this.ui.showToast(`≋ STORM INVOKED! Rival fleet at ${targetNodeId.toUpperCase()} battered by raging waves (-1 crew & pushed back)!`, "info");
      } else {
        this.ui.showToast(res.error || "Failed to invoke storm!", "error");
      }
    } catch (err) {
      console.error("Call Storm error:", err);
      this.ui.showToast("Failed to invoke Drowned God's storm", "error");
    }
  }

  bindEvents() {
    const el = this.ui.elements;
    if (el.btnSail) el.btnSail.addEventListener('click', () => this.executeSailFromButton());
    el.btnReave.addEventListener('click', () => this.executeReave());
    el.btnMuster.addEventListener('click', () => this.executeMuster());
    el.btnPray.addEventListener('click', () => this.executePray());
    el.btnEndTurn.addEventListener('click', () => this.executeEndTurn());
    el.btnAiStep.addEventListener('click', () => this.stepAi());
    if (typeof SoundFX !== 'undefined') SoundFX.bindToggle();
    if (el.btnCallStorm) el.btnCallStorm.addEventListener('click', () => this.handleCallStormClick());

    // Modals
    const hideNewGame = () => { this.ui.elements.modalNewGame.style.display = 'none'; };
    document.getElementById('btn-new-game').addEventListener('click', () => { this.ui.elements.modalNewGame.style.display = 'flex'; });
    document.getElementById('btn-close-new-game-modal').addEventListener('click', hideNewGame);
    document.getElementById('btn-cancel-new-game').addEventListener('click', hideNewGame);

    document.getElementById('btn-start-game-confirm').addEventListener('click', async () => {
      const seasonsRadio = document.querySelector('input[name="season-length"]:checked');
      const modeRadio = document.querySelector('input[name="player-mode"]:checked');
      const maxSeasons = parseInt(seasonsRadio ? seasonsRadio.value : "5");
      const mode = modeRadio ? modeRadio.value : "solo";
      const aiFactions = (mode === "solo") ? ["Euron", "Victarion"] : (mode === "ai_spectate" ? ["Asha", "Euron", "Victarion"] : []);

      const res = await API.startNewGame({ max_seasons: maxSeasons, ai_factions: aiFactions });
      this.gameState = res.state;
      this.currentBattle = null;
      this.lastSeenHazardStr = null;
      this.ui.victoryModalShown = false;
      this.ui.elements.modalNewGame.style.display = 'none';
      this.currentSelection = { type: 'none' };
      this.refresh();
    });

    const hideRules = () => { this.ui.elements.modalRules.style.display = 'none'; };
    document.getElementById('btn-rules').addEventListener('click', () => { this.ui.elements.modalRules.style.display = 'flex'; });
    document.getElementById('btn-close-rules-modal').addEventListener('click', hideRules);
    document.getElementById('btn-close-rules-confirm').addEventListener('click', hideRules);

    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.ui.elements.modalVictory.style.display = 'none';
      this.ui.elements.modalNewGame.style.display = 'flex';
    });
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new KingsmootApp();
  app.init();
});
