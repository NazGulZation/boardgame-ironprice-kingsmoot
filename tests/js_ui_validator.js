/**
 * IRON PRICE: Kingsmoot — Automated Web UI & SVG Renderer Validator
 * Validates DOM generation, SVG attribute correctness, and ensures no 'NaN' or 'undefined' values.
 */

const fs = require('fs');
const path = require('path');

// 1. Mock minimal DOM environment for SVG testing
class MockElement {
  constructor(tag, ns) {
    this.tagName = tag;
    this.namespaceURI = ns;
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.classList = new Set();
    this.style = {};
  }

  setAttribute(name, value) {
    const valStr = String(value);
    if (valStr.includes('NaN')) {
      throw new Error(`[SVG NaN Violation] Element <${this.tagName}> attribute '${name}' was set to '${valStr}'`);
    }
    if (valStr.includes('undefined')) {
      throw new Error(`[SVG Undefined Violation] Element <${this.tagName}> attribute '${name}' was set to '${valStr}'`);
    }
    this.attributes[name] = valStr;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener() {}
  querySelectorAll(sel) {
    const results = [];
    this._findAllDescendants(el => {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        return el.classList.has(cls) || (el.attributes['class'] && el.attributes['class'].includes(cls));
      }
      return el.tagName === sel;
    }, results);
    return results;
  }

  _findAllDescendants(predicate, results) {
    for (const child of this.children) {
      if (predicate(child)) results.push(child);
      child._findAllDescendants(predicate, results);
    }
  }

  querySelector(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return this._findDescendant(el => el.classList.has(cls) || (el.attributes['class'] && el.attributes['class'].includes(cls)));
    }
    return this._findDescendant(el => el.tagName === sel);
  }

  _findDescendant(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const found = child._findDescendant(predicate);
      if (found) return found;
    }
    return null;
  }
}

const elementStore = {};

global.document = {
  getElementById(id) {
    if (!elementStore[id]) {
      elementStore[id] = new MockElement('div', null);
      elementStore[id].id = id;
    }
    return elementStore[id];
  },
  createElementNS(ns, tag) {
    return new MockElement(tag, ns);
  },
  querySelectorAll(sel) {
    const results = [];
    Object.values(elementStore).forEach(root => {
      const found = root.querySelectorAll(sel);
      results.push(...found);
    });
    return results;
  }
};

global.window = {
  addEventListener() {}
};

const vm = require('vm');

// 2. Load and evaluate map modules in global context
const mapBuilderCode = fs.readFileSync(path.join(__dirname, '../web/js/map_builder.js'), 'utf-8');
const mapAnimatorCode = fs.readFileSync(path.join(__dirname, '../web/js/map_animator.js'), 'utf-8');
const mapRendererCode = fs.readFileSync(path.join(__dirname, '../web/js/map_renderer.js'), 'utf-8');

vm.runInThisContext(mapBuilderCode);
vm.runInThisContext(mapAnimatorCode);
vm.runInThisContext(mapRendererCode);

// 3. Load Map Data
const mapData = JSON.parse(fs.readFileSync(path.join(__dirname, '../map.json'), 'utf-8'));

// 4. Create Mock Game State covering all nodes and multi-ship conditions
function createTestGameState() {
  const nodes = {};
  mapData.nodes.forEach(n => {
    nodes[n.id] = {
      id: n.id,
      name: n.name,
      kind: n.kind,
      x: n.x,
      y: n.y,
      occupants: [],
      defense: n.defense || 0,
      hoard: n.hoard || 0,
      legend: n.legend || 0,
      is_burned: false
    };
  });

  // Add ships across varied nodes (including isles, bay, storm belt, and deep sea)
  nodes['harlaw'].occupants = [
    { id: 'asha_flagship', faction: 'Asha', is_flagship: true, crew: 4 },
    { id: 'asha_reaver1', faction: 'Asha', is_flagship: false, crew: 2 }
  ];
  nodes['pyke'].occupants = [
    { id: 'euron_flagship', faction: 'Euron', is_flagship: true, crew: 4 }
  ];
  nodes['greatwyk'].occupants = [
    { id: 'victarion_flagship', faction: 'Victarion', is_flagship: true, crew: 5 }
  ];
  nodes['bay'].occupants = [
    { id: 'asha_reaver2', faction: 'Asha', is_flagship: false, crew: 3 },
    { id: 'vic_reaver1', faction: 'Victarion', is_flagship: false, crew: 2 }
  ];
  nodes['storm'].occupants = [
    { id: 'euron_reaver1', faction: 'Euron', is_flagship: false, crew: 3 }
  ];
  nodes['seaS'].occupants = [
    { id: 'euron_reaver2', faction: 'Euron', is_flagship: false, crew: 1 },
    { id: 'vic_reaver2', faction: 'Victarion', is_flagship: false, crew: 3 },
    { id: 'asha_test3', faction: 'Asha', is_flagship: false, crew: 2 }
  ];

  return {
    season: 1,
    turn_in_season: 1,
    active_faction: 'Asha',
    nodes: nodes
  };
}

// 5. Execute Tests
console.log('🧪 Starting Web UI & MapRenderer Verification...');

const mapSvg = global.document.getElementById('map-svg');
mapSvg.querySelector = () => null;

const renderer = new MapRenderer('map-svg', () => {}, () => {});
renderer.init(mapData);
console.log('  ✅ MapRenderer.init(mapData) completed without errors.');

const testState = createTestGameState();
renderer.update(testState);
console.log('  ✅ MapRenderer.update(testState) rendered nodes and ships with 0 NaN/undefined values.');

// Test dock offsets and coordinate calculation for all nodes
let totalCoordChecks = 0;
mapData.nodes.forEach(n => {
  for (let count = 1; count <= 4; count++) {
    for (let idx = 0; idx < count; idx++) {
      const offset = renderer.getDockOffset(n.id, count, idx);
      if (isNaN(offset.offsetX) || isNaN(offset.offsetY) || isNaN(offset.x) || isNaN(offset.y)) {
        throw new Error(`getDockOffset returned NaN for node ${n.id}, count ${count}, idx ${idx}`);
      }
      const coords = renderer.getShipCoordinates(n.id, null);
      if (isNaN(coords.x) || isNaN(coords.y)) {
        throw new Error(`getShipCoordinates returned NaN for node ${n.id}`);
      }
      totalCoordChecks++;
    }
  }
});
console.log(`  ✅ Verified ${totalCoordChecks} dynamic ship coordinate and dock offset permutations.`);

// Test Selection highlighting
renderer.handleShipClick('asha_flagship', 'harlaw');
renderer.highlightSelection();
console.log('  ✅ MapRenderer.highlightSelection() executed cleanly for selected flagship.');

renderer.handleNodeClick('bay');
renderer.highlightSelection();
console.log('  ✅ MapRenderer.highlightSelection() executed cleanly for selected node.');

console.log('🎉 ALL WEB UI & SVG RENDERER TESTS PASSED SUCCESSFULLY!');
