/**
 * IRON PRICE: Kingsmoot — REST API Client (Phase 1)
 */

const API = {
  async getState() {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch game state');
    return await res.json();
  },

  async getMapData() {
    const res = await fetch('/api/map_data', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch map data');
    return await res.json();
  },

  async startNewGame(options = {}) {
    const res = await fetch('/api/new_game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!res.ok) throw new Error('Failed to create new game');
    return await res.json();
  },

  async sendAction(actionType, params = {}) {
    const payload = { action_type: actionType, ...params };
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Action failed: ${actionType}`);
    return await res.json();
  },

  async stepAI() {
    const res = await fetch('/api/ai_step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error('Failed to step AI');
    return await res.json();
  }
};
