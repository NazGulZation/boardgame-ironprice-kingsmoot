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

  refresh() {
    this.mapRenderer.update(this.gameState, this.currentSelection);
    this.ui.update(this.gameState, this.currentSelection);

    if (this.gameState.last_reave_outcome) {
      this.ui.renderDiceRoll(this.gameState.last_reave_outcome);
    }

    // Auto-step AI if active player is a bot
    this.checkAiTurn();
  }

  handleSelection(selection) {
    // Left-click only inspects or selects (prevents misclick moves)
    if (this.currentSelection.type === 'ship' && selection.type === 'node') {
      const targetNode = this.gameState.nodes[selection.nodeId];
      if (targetNode && targetNode.kind === 'land') {
        this.ui.enableReaveButton(this.currentSelection.shipId, targetNode);
        this.currentSelection.targetLandId = targetNode.id;
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
      this.ui.showToast("Bukan giliran Anda (Giliran Bot).", "error");
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
          this.ui.showToast(`Kapal ${shipObj.id} dipilih! Klik kanan laut untuk Sail, klik kanan keep untuk Reave.`, "info");
          return;
        }
      }
      this.ui.showToast("Pilih kapal Anda (klik kiri) terlebih dahulu, lalu klik kanan tujuan.", "info");
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
      this.ui.showToast("Kapal yang dipilih bukan milik Anda.", "error");
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
        this.ui.showToast(`Kapal sudah berada di ${targetNode.name}.`, "info");
        return;
      }
      this.executeSail(selectedShipId, targetNodeId);
      return;
    }
  }

  async executeReaveDirect(shipId, targetLandId) {
    try {
      const res = await API.sendAction('reave', {
        ship_id: shipId,
        target_land_id: targetLandId
      });

      if (res.success) {
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh();
      } else {
        this.ui.showToast(res.error || "Reave gagal!", "error");
      }
    } catch (err) {
      console.error("Reave error:", err);
      this.ui.showToast("Aksi Reave gagal", "error");
    }
  }

  async executeSail(shipId, targetNodeId) {
    try {
      const res = await API.sendAction('sail', {
        ship_id: shipId,
        target_node: targetNodeId
      });

      if (res.success) {
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

  async executeReave() {
    if (!this.currentSelection || !this.currentSelection.shipId || !this.currentSelection.targetLandId) {
      this.ui.showToast("Select your ship and an adjacent Green Land keep first!", "error");
      return;
    }

    try {
      const res = await API.sendAction('reave', {
        ship_id: this.currentSelection.shipId,
        target_land_id: this.currentSelection.targetLandId
      });

      if (res.success) {
        this.gameState = res.state;
        this.currentSelection = { type: 'none' };
        this.refresh();
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
      const res = await API.stepAI();
      if (res.success) {
        this.gameState = res.state;
        this.refresh();
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
      // Auto-step AI after 900ms delay for visual pacing
      this.aiAutoStepTimer = setTimeout(() => {
        this.stepAi();
      }, 900);
    }
  }

  bindEvents() {
    // Action buttons
    this.ui.elements.btnReave.addEventListener('click', () => this.executeReave());
    this.ui.elements.btnMuster.addEventListener('click', () => this.executeMuster());
    this.ui.elements.btnPray.addEventListener('click', () => this.executePray());
    this.ui.elements.btnEndTurn.addEventListener('click', () => this.executeEndTurn());
    this.ui.elements.btnAiStep.addEventListener('click', () => this.stepAi());

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
