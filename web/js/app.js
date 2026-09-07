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
    // Left-click targeting: if user already has an active owned ship selected
    if (this.currentSelection.type === 'ship') {
      const activeFaction = this.gameState.active_faction;
      let shipObj = null;
      for (const n of Object.values(this.gameState.nodes)) {
        const s = n.occupants.find(x => x.id === this.currentSelection.shipId);
        if (s) { shipObj = s; break; }
      }

      if (shipObj && shipObj.faction === activeFaction) {
        let targetNodeId = null;
        if (selection.type === 'node') {
          targetNodeId = selection.nodeId;
        } else if (selection.type === 'ship' && selection.shipId !== this.currentSelection.shipId) {
          targetNodeId = selection.nodeId;
        }

        if (targetNodeId && this.gameState.nodes[targetNodeId]) {
          const targetNode = this.gameState.nodes[targetNodeId];
          if (targetNode.kind === 'land') {
            this.ui.enableReaveButton(this.currentSelection.shipId, targetNode);
            this.currentSelection.targetLandId = targetNode.id;
            delete this.currentSelection.targetSeaId;
            return;
          } else if (targetNode.kind === 'sea' || targetNode.kind === 'isle') {
            const hasEnemy = targetNode.occupants && targetNode.occupants.some(s => s.faction !== activeFaction && s.crew > 0);
            this.ui.enableSailButton(this.currentSelection.shipId, targetNode, hasEnemy);
            this.currentSelection.targetSeaId = targetNode.id;
            delete this.currentSelection.targetLandId;
            return;
          }
        }
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
      this.executeReaveDirect(selectedShipId, targetNodeId);
      return;
    }

    // Right-click on Sea or Isle -> SAIL!
    if (targetNode.kind === 'sea' || targetNode.kind === 'isle') {
      if (targetNodeId === shipLocation) {
        this.ui.showToast(`Ship is already at ${targetNode.name}.`, "info");
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

      if (res.success) {
        const reaveOutcome = res.state.last_reave_outcome;
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh(false);

        if (reaveOutcome) {
          this.ui.showReaveModal(reaveOutcome, async () => {
            if (shipLoc) {
              await this.mapRenderer.animateReaveTargeting(shipLoc, targetLandId, reaveOutcome, shipId);
            }
            this.checkAiTurn();
          });
        } else {
          this.checkAiTurn();
        }
      } else {
        this.ui.showToast(res.error || "Reave failed!", "error");
      }
    } catch (err) {
      console.error("Reave error:", err);
      this.ui.showToast("Failed to execute Reave action", "error");
    }
  }

  async executeSail(shipId, targetNodeId) {
    try {
      let currentLoc = null;
      const activeFaction = this.gameState ? this.gameState.active_faction : 'Asha';
      if (this.gameState) {
        for (const [nid, node] of Object.entries(this.gameState.nodes)) {
          if (node.occupants && node.occupants.some(s => s.id === shipId)) {
            currentLoc = nid;
            break;
          }
        }
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
            await this.mapRenderer.animateShipSail(shipId, currentLoc, targetNodeId, activeFaction);
          }
          this.gameState = res.state;
          this.currentSelection = { type: 'none' };
          this.mapRenderer.update(this.gameState, this.currentSelection);
          await this.mapRenderer.animateNavalClash(targetNodeId, battle.attacker_ship_id, battle.defender_ship_id);
          this.isClashAnimating = false;
          this.currentBattle = battle;
          this.refresh(false);
          this.showBattle(this.currentBattle);
          return;
        }

        if (currentLoc && currentLoc !== targetNodeId) {
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

      if (res.success) {
        const reaveOutcome = res.state.last_reave_outcome;
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh(false);

        if (reaveOutcome) {
          this.ui.showReaveModal(reaveOutcome, async () => {
            if (shipLoc) {
              await this.mapRenderer.animateReaveTargeting(shipLoc, targetLandId, reaveOutcome, shipId);
            }
            this.checkAiTurn();
          });
        } else {
          this.checkAiTurn();
        }
      } else {
        this.ui.showToast(res.error || "Reave failed!", "error");
      }
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
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh();
      }
    } catch (err) {
      console.error("End turn error:", err);
    }
  }

  async stepAi() {
    try {
      const prevState = this.gameState;
      const prevReaveOutcome = this.gameState ? this.gameState.last_reave_outcome : null;
      const res = await API.stepAI();
      if (res.success) {
        const nextState = res.state;
        const activeFaction = prevState ? prevState.active_faction : nextState.active_faction;

        // 1. Check if a SAIL action occurred -> animate ship sailing across nodes
        if (res.ship_id && res.from && res.to && res.from !== res.to) {
          await this.mapRenderer.animateShipSail(res.ship_id, res.from, res.to, activeFaction);
        }

        // 2. Check if a REAVE action occurred -> animate targeting & keep outcome (SKIP popup dice roll!)
        const newReave = res.outcome || (nextState.last_reave_outcome && 
          (!prevReaveOutcome || JSON.stringify(prevReaveOutcome) !== JSON.stringify(nextState.last_reave_outcome)) ? nextState.last_reave_outcome : null);

        if (newReave && newReave.attacker_roll && newReave.defender_roll) {
          this.ui.renderDiceRoll(newReave, true);
        }

        // 3. Check if NAVAL CLASH occurred
        const battle = res.battle || (nextState && nextState.active_battle);
        if (res.battle_triggered && battle) {
          this.isClashAnimating = true;
          this.mapRenderer.update(nextState, { type: 'none' });
          await this.mapRenderer.animateNavalClash(battle.node_id || res.to, battle.attacker_ship_id, battle.defender_ship_id);
          this.isClashAnimating = false;
        }

        // 4. Check if ship sinking/defeat occurred
        if (battle && battle.state === 'finished' && battle.winner) {
          const loserShipId = (battle.winner === battle.attacker_faction) ? battle.defender_ship_id : battle.attacker_ship_id;
          await this.mapRenderer.animateShipDefeat(loserShipId, battle.node_id, 'sunk');
        }

        this.gameState = nextState;
        this.refresh(false);

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
      onDismiss: () => {
        this.currentBattle = null;
        if (this.ui.elements.modalBattle) {
          this.ui.elements.modalBattle.style.display = 'none';
        }
        this.refresh();
      }
    }, activeFaction, playerFavor);
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
      if (node.kind === 'sea') {
        const hasEnemy = node.occupants && node.occupants.some(s => s.faction !== activeFaction && s.crew > 0);
        if (hasEnemy) {
          validNodes.push(nId);
        }
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
      const res = await API.sendAction('favor_miracle', {
        miracle_type: 'call_storm',
        target_node: targetNodeId
      });

      if (res.success) {
        this.gameState = res.state;
        this.refresh();
        this.ui.showToast(`🌊 STORM INVOKED! Rival fleet at ${targetNodeId.toUpperCase()} battered by raging waves (-1 crew & pushed back)!`, "info");
      } else {
        this.ui.showToast(res.error || "Failed to invoke storm!", "error");
      }
    } catch (err) {
      console.error("Call Storm error:", err);
      this.ui.showToast("Failed to invoke Drowned God's storm", "error");
    }
  }

  bindEvents() {
    // Action buttons
    if (this.ui.elements.btnSail) {
      this.ui.elements.btnSail.addEventListener('click', () => this.executeSailFromButton());
    }
    this.ui.elements.btnReave.addEventListener('click', () => this.executeReave());
    this.ui.elements.btnMuster.addEventListener('click', () => this.executeMuster());
    this.ui.elements.btnPray.addEventListener('click', () => this.executePray());
    this.ui.elements.btnEndTurn.addEventListener('click', () => this.executeEndTurn());
    this.ui.elements.btnAiStep.addEventListener('click', () => this.stepAi());

    if (this.ui.elements.btnCallStorm) {
      this.ui.elements.btnCallStorm.addEventListener('click', () => this.handleCallStormClick());
    }

    // New Game Button & Modals
    document.getElementById('btn-new-game').addEventListener('click', () => {
      this.ui.elements.modalNewGame.style.display = 'flex';
    });

    document.getElementById('btn-close-new-game-modal').addEventListener('click', () => {
      this.ui.elements.modalNewGame.style.display = 'none';
    });

    document.getElementById('btn-cancel-new-game').addEventListener('click', () => {
      this.ui.elements.modalNewGame.style.display = 'none';
    });

    document.getElementById('btn-start-game-confirm').addEventListener('click', async () => {
      const seasonsRadio = document.querySelector('input[name="season-length"]:checked');
      const modeRadio = document.querySelector('input[name="player-mode"]:checked');
      
      const maxSeasons = parseInt(seasonsRadio ? seasonsRadio.value : "5");
      const mode = modeRadio ? modeRadio.value : "solo";

      let aiFactions = [];
      if (mode === "solo") {
        aiFactions = ["Euron", "Victarion"];
      } else if (mode === "ai_spectate") {
        aiFactions = ["Asha", "Euron", "Victarion"];
      }

      const res = await API.startNewGame({
        max_seasons: maxSeasons,
        ai_factions: aiFactions
      });

      this.gameState = res.state;
      this.currentBattle = null;
      this.lastSeenHazardStr = null;
      this.ui.victoryModalShown = false;
      this.ui.elements.modalNewGame.style.display = 'none';
      this.currentSelection = { type: 'none' };
      this.refresh();
    });

    // Rules Modal
    document.getElementById('btn-rules').addEventListener('click', () => {
      this.ui.elements.modalRules.style.display = 'flex';
    });

    document.getElementById('btn-close-rules-modal').addEventListener('click', () => {
      this.ui.elements.modalRules.style.display = 'none';
    });

    document.getElementById('btn-close-rules-confirm').addEventListener('click', () => {
      this.ui.elements.modalRules.style.display = 'none';
    });

    // Play Again button
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
