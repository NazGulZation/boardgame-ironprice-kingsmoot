/**
 * IRON PRICE: Kingsmoot — SVG Map Base Builder
 * Renders SVG route lines, isle nodes, sea zones, land keeps, and atmospheric effects.
 */

class MapBuilder {
  static renderBase(svg, edgesGroup, nodesGroup, mapData, renderer) {
    if (!mapData) return;

    // 1. Draw Edges
    edgesGroup.innerHTML = '';
    const nodeMap = {};
    mapData.nodes.forEach(n => nodeMap[n.id] = n);

    mapData.edges.forEach(edge => {
      const u = nodeMap[edge[0]];
      const v = nodeMap[edge[1]];
      if (!u || !v) return;

      const shadowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      shadowLine.setAttribute('x1', u.x);
      shadowLine.setAttribute('y1', u.y);
      shadowLine.setAttribute('x2', v.x);
      shadowLine.setAttribute('y2', v.y);
      shadowLine.setAttribute('stroke', '#050a12');
      shadowLine.setAttribute('stroke-width', '7');
      shadowLine.setAttribute('stroke-linecap', 'round');
      shadowLine.setAttribute('opacity', '0.75');
      edgesGroup.appendChild(shadowLine);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', u.x);
      line.setAttribute('y1', u.y);
      line.setAttribute('x2', v.x);
      line.setAttribute('y2', v.y);
      line.setAttribute('stroke', '#41739c');
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-dasharray', '8,6');
      line.setAttribute('stroke-linecap', 'round');
      edgesGroup.appendChild(line);
    });

    // 2. Draw Nodes
    nodesGroup.innerHTML = '';
    mapData.nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'map-node-group');
      g.setAttribute('id', `node-g-${node.id}`);
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      g.addEventListener('click', (e) => {
        e.stopPropagation();
        renderer.handleNodeClick(node.id);
      });

      g.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (renderer.onRightClick) {
          renderer.onRightClick({ type: 'node', nodeId: node.id });
        }
      });

      if (node.kind === 'isle') {
        MapBuilder.renderIsleNode(g, node, svg);
      } else if (node.kind === 'sea') {
        MapBuilder.renderSeaNode(g, node, svg);
      } else if (node.kind === 'land') {
        MapBuilder.renderLandNode(g, node, svg);
      }

      nodesGroup.appendChild(g);
    });

    svg.addEventListener('click', () => {
      renderer.clearSelection();
    });
  }

  static renderIsleNode(g, node, svg) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '58');
    circle.setAttribute('fill', 'url(#isleGrad)');
    circle.setAttribute('stroke', '#bdc3c7');
    circle.setAttribute('stroke-width', '4');
    circle.setAttribute('filter', 'url(#drop-shadow)');
    g.appendChild(circle);

    if (node.image) {
      const clipId = `clip-node-${node.id}`;
      let clipEl = document.getElementById(clipId);
      if (!clipEl) {
        clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipEl.setAttribute('id', clipId);
        const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipCircle.setAttribute('r', '56');
        clipCircle.setAttribute('cx', '0');
        clipCircle.setAttribute('cy', '0');
        clipEl.appendChild(clipCircle);
        const defs = svg.querySelector('defs') || svg;
        defs.appendChild(clipEl);
      }

      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', node.image);
      img.setAttribute('x', '-56');
      img.setAttribute('y', '-56');
      img.setAttribute('width', '112');
      img.setAttribute('height', '112');
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      img.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(img);

      const vig = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      vig.setAttribute('r', '56');
      vig.setAttribute('fill', 'url(#nodeImageVignette)');
      vig.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(vig);

      const innerShadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerShadow.setAttribute('r', '56');
      innerShadow.setAttribute('fill', 'url(#nodeImageInnerShadow)');
      innerShadow.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(innerShadow);

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '58');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#bdc3c7');
      ring.setAttribute('stroke-width', '4');
      g.appendChild(ring);
    } else {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('y', '-16');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '28');
      icon.textContent = '🏰';
      g.appendChild(icon);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('y', '15');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-weight', '900');
    text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
    text.textContent = node.name.toUpperCase();
    g.appendChild(text);

    const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    sub.setAttribute('y', '36');
    sub.setAttribute('text-anchor', 'middle');
    sub.setAttribute('fill', '#f1c40f');
    sub.setAttribute('font-family', 'Inter, sans-serif');
    sub.setAttribute('font-size', '14');
    sub.setAttribute('font-weight', '800');
    sub.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
    sub.textContent = node.id === 'pyke' ? 'Euron Port' : node.id === 'harlaw' ? 'Asha Port' : node.id === 'greatwyk' ? 'Victarion Port' : node.id === 'oldwyk' ? 'Kingsmoot' : '+2 Hoard';
    g.appendChild(sub);
  }

  static renderSeaNode(g, node, svg) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '64');
    circle.setAttribute('fill', 'url(#seaGrad)');
    circle.setAttribute('stroke', node.id === 'storm' ? '#9b59b6' : '#2980b9');
    circle.setAttribute('stroke-width', '4');
    circle.setAttribute('filter', 'url(#drop-shadow)');
    g.appendChild(circle);

    if (node.image) {
      const clipId = `clip-node-${node.id}`;
      let clipEl = document.getElementById(clipId);
      if (!clipEl) {
        clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipEl.setAttribute('id', clipId);
        const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipCircle.setAttribute('r', '62');
        clipCircle.setAttribute('cx', '0');
        clipCircle.setAttribute('cy', '0');
        clipEl.appendChild(clipCircle);
        const defs = svg.querySelector('defs') || svg;
        defs.appendChild(clipEl);
      }

      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', node.image);
      img.setAttribute('x', '-62');
      img.setAttribute('y', '-62');
      img.setAttribute('width', '124');
      img.setAttribute('height', '124');
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      img.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(img);

      const vig = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      vig.setAttribute('r', '62');
      vig.setAttribute('fill', 'url(#nodeImageVignette)');
      vig.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(vig);

      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', '64');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', node.id === 'storm' ? '#9b59b6' : '#2980b9');
      ring.setAttribute('stroke-width', '4');
      g.appendChild(ring);
    } else {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('y', '-16');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '30');
      icon.textContent = node.id === 'storm' ? '⚡' : '🌊';
      g.appendChild(icon);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('y', '16');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-weight', '900');
    text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
    text.textContent = node.name.toUpperCase();
    g.appendChild(text);

    if (node.id === 'storm') {
      const vortex = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      vortex.setAttribute('class', 'storm-vortex');
      for (let i = 0; i < 3; i++) {
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        arc.setAttribute('r', `${48 + i * 8}`);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#a29bfe');
        arc.setAttribute('stroke-width', '2');
        arc.setAttribute('stroke-dasharray', '14,26');
        arc.setAttribute('opacity', '0.65');
        vortex.appendChild(arc);
      }
      g.appendChild(vortex);

      const lightning = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      lightning.setAttribute('class', 'storm-lightning');
      lightning.setAttribute('points', '-5,-40 2,-22 -3,-22 5,-4 -2,-4 3,12');
      lightning.setAttribute('fill', '#f1c40f');
      lightning.setAttribute('stroke', '#ffffff');
      lightning.setAttribute('stroke-width', '1');
      g.appendChild(lightning);

      const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sub.setAttribute('y', '38');
      sub.setAttribute('text-anchor', 'middle');
      sub.setAttribute('fill', '#e056fd');
      sub.setAttribute('font-family', 'Inter, sans-serif');
      sub.setAttribute('font-size', '13');
      sub.setAttribute('font-weight', '800');
      sub.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
      sub.textContent = 'HAZARD BELT';
      g.appendChild(sub);
    }
  }

  static renderLandNode(g, node, svg) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-85');
    rect.setAttribute('y', '-52');
    rect.setAttribute('width', '170');
    rect.setAttribute('height', '104');
    rect.setAttribute('rx', '12');
    rect.setAttribute('fill', 'url(#landGrad)');
    rect.setAttribute('stroke', '#2ecc71');
    rect.setAttribute('stroke-width', '3.5');
    rect.setAttribute('filter', 'url(#drop-shadow)');
    rect.setAttribute('class', 'land-rect');
    g.appendChild(rect);

    if (node.image) {
      const clipId = `clip-node-${node.id}`;
      let clipEl = document.getElementById(clipId);
      if (!clipEl) {
        clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipEl.setAttribute('id', clipId);
        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        clipRect.setAttribute('x', '-83');
        clipRect.setAttribute('y', '-50');
        clipRect.setAttribute('width', '166');
        clipRect.setAttribute('height', '100');
        clipRect.setAttribute('rx', '10');
        clipEl.appendChild(clipRect);
        const defs = svg.querySelector('defs') || svg;
        defs.appendChild(clipEl);
      }

      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', node.image);
      img.setAttribute('x', '-83');
      img.setAttribute('y', '-50');
      img.setAttribute('width', '166');
      img.setAttribute('height', '100');
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      img.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(img);

      const vig = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      vig.setAttribute('x', '-83');
      vig.setAttribute('y', '-50');
      vig.setAttribute('width', '166');
      vig.setAttribute('height', '100');
      vig.setAttribute('rx', '10');
      vig.setAttribute('fill', 'url(#nodeImageVignette)');
      vig.setAttribute('clip-path', `url(#${clipId})`);
      g.appendChild(vig);
    } else {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('y', '-18');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('font-size', '24');
      icon.textContent = '🛡️';
      g.appendChild(icon);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('y', '12');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'Inter, Cinzel, sans-serif');
    text.setAttribute('font-size', '17');
    text.setAttribute('font-weight', '900');
    text.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 4px; letter-spacing: 0.5px;');
    text.textContent = node.name.toUpperCase();
    g.appendChild(text);

    const stats = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stats.setAttribute('y', '36');
    stats.setAttribute('text-anchor', 'middle');
    stats.setAttribute('fill', '#f5c518');
    stats.setAttribute('font-family', 'Inter, sans-serif');
    stats.setAttribute('font-size', '16');
    stats.setAttribute('font-weight', '900');
    stats.setAttribute('class', 'node-stat-text');
    stats.setAttribute('style', 'paint-order: stroke fill; stroke: #000; stroke-width: 3px;');
    stats.textContent = `🛡️${node.defense}  💰${node.hoard}  👑${node.legend}`;
    g.appendChild(stats);
  }
}
