/**
 * IRON PRICE: Kingsmoot — Naval Fleet Rows Renderer
 * Renders every hull in a naval clash as vertical rows (one row per ship),
 * so reinforcing ships are never hidden behind the first hull.
 * Kept out of ui.js to respect the strict 700-line file quota.
 */

class BattleFleets {
  static names = {
    'asha_flagship': 'Black Wind', 'euron_flagship': 'Silence',
    'victarion_flagship': 'Iron Victory',
    'asha_reaver1': 'Iron Longship I', 'asha_reaver2': 'Iron Longship II',
    'euron_reaver1': 'Iron Longship I', 'euron_reaver2': 'Iron Longship II',
    'victarion_reaver1': 'Iron Longship I', 'victarion_reaver2': 'Iron Longship II'
  };

  static shipName(id) {
    return BattleFleets.names[id] || (id ? String(id).replace(/_/g, ' ') : 'Warship');
  }

  static escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // Resolve fleet rows: prefer backend attacker_fleet/defender_fleet details
  // (with live crew), fall back to fleet_ids, fall back to single primary id.
  // Optional gameState backfills crew from nodes[node_id].occupants.
  static fleetDetails(battle, side, gameState) {
    const isAtt = side === 'attacker';
    const details = isAtt ? battle.attacker_fleet : battle.defender_fleet;
    if (Array.isArray(details) && details.length) return details.slice();
    const ids = isAtt ? battle.attacker_fleet_ids : battle.defender_fleet_ids;
    const primary = isAtt ? battle.attacker_ship_id : battle.defender_ship_id;
    const list = (Array.isArray(ids) && ids.length ? ids.slice() : (primary ? [primary] : []));
    if (primary && !list.includes(primary)) list.unshift(primary);
    const crewById = {};
    if (gameState && gameState.nodes && battle.node_id && gameState.nodes[battle.node_id]) {
      for (const s of (gameState.nodes[battle.node_id].occupants || [])) crewById[s.id] = s;
    }
    return list.map(id => {
      const live = crewById[id] || {};
      return { id, name: BattleFleets.shipName(id), crew: live.crew, max_crew: live.max_crew,
        is_flagship: live.is_flagship !== undefined ? live.is_flagship : /flagship$/.test(id) };
    });
  }

  static rowHtml(ship, sunkIds) {
    const sunk = sunkIds && sunkIds.includes(ship.id);
    const crew = (ship.crew === undefined || ship.crew === null) ? '?' : ship.crew;
    const max = (ship.max_crew === undefined || ship.max_crew === null) ? '' : `/${ship.max_crew}`;
    const flag = ship.is_flagship ? '<span class="fleet-flag">⚑ Flagship</span>' : '';
    const sunkCls = (sunk || Number(ship.crew) === 0) ? ' sunk' : '';
    return `<div class="fleet-ship-row${sunkCls}">` +
      `<span class="fleet-ship-icon">⛵</span>` +
      `<span class="fleet-ship-name">${BattleFleets.escape(ship.name || BattleFleets.shipName(ship.id))}</span>${flag}` +
      `<span class="fleet-ship-crew">${crew}${max} ⚔</span>` +
      `${sunk ? '<span class="fleet-ship-sunk">✕ SUNK</span>' : ''}</div>`;
  }

  static renderInto(container, fleet, sunkIds) {
    if (!container) return;
    if (!fleet || !fleet.length) { container.innerHTML = '<div class="fleet-ship-row empty">— No hulls —</div>'; return; }
    container.innerHTML = fleet.map(s => BattleFleets.rowHtml(s, sunkIds)).join('');
  }

  // Main entry: render attacker + defender vertical rows into the modal.
  // Containers reuse the legacy single-ship IDs so existing bindings keep working.
  static renderBattleFleets(ui, battle, gameState) {
    const att = BattleFleets.fleetDetails(battle, 'attacker', gameState);
    const def = BattleFleets.fleetDetails(battle, 'defender', gameState);
    BattleFleets.renderInto(ui.elements.battleAttackerShip, att, battle.sunk_ship_ids);
    BattleFleets.renderInto(ui.elements.battleDefenderShip, def, battle.sunk_ship_ids);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = BattleFleets;
