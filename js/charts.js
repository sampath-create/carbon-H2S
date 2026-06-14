/**
 * @fileoverview Custom SVG Charting Module. Renders high-quality responsive graphs without external dependencies.
 */

class SVGCharts {
  /**
   * Generates a Donut Chart displaying carbon emission proportions.
   * @param {string} containerId ID of container element.
   * @param {Object} data Calculations breakdown { transport, energy, lifestyle }.
   */
  static drawDonut(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = data.transport + data.energy + data.lifestyle;
    if (total === 0) {
      container.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-chart';
      emptyDiv.setAttribute('role', 'status');
      const p = document.createElement('p');
      p.textContent = 'No carbon footprint records available. Use the calculator to compute emissions.';
      emptyDiv.appendChild(p);
      container.appendChild(emptyDiv);
      return;
    }

    const segments = [
      { label: 'Transportation', value: data.transport, color: '#3b82f6', icon: '🚗' },
      { label: 'Energy Usage', value: data.energy, color: '#f59e0b', icon: '⚡' },
      { label: 'Lifestyle Habits', value: data.lifestyle, color: '#10b981', icon: '🌱' }
    ];

    const r = 35;
    const cx = 50;
    const cy = 50;
    const circ = 2 * Math.PI * r;

    let accumulatedOffset = 0;
    let svgContent = '';

    segments.forEach(seg => {
      if (seg.value <= 0) return;
      const fraction = seg.value / total;
      const strokeLength = fraction * circ;
      const strokeOffset = circ - accumulatedOffset;

      svgContent += `
        <circle 
          cx="${cx}" 
          cy="${cy}" 
          r="${r}" 
          fill="transparent" 
          stroke="${seg.color}" 
          stroke-width="15" 
          stroke-dasharray="${strokeLength} ${circ}" 
          stroke-dashoffset="${strokeOffset}" 
          transform="rotate(-90 ${cx} ${cy})"
          class="donut-segment"
          data-label="${seg.label}"
          data-val="${seg.value}"
          data-pct="${Math.round(fraction * 100)}"
          tabindex="0"
          role="img"
          aria-label="${seg.label}: ${seg.value} kg (${Math.round(fraction * 100)}%)"
        />`;
      accumulatedOffset += strokeLength;
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'donut-chart-wrapper';
    
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 100 100');
    svgEl.setAttribute('class', 'donut-svg');
    svgEl.setAttribute('role', 'img');
    svgEl.setAttribute('aria-label', `Donut chart showing carbon category percentages: Transport ${Math.round(data.transport/total*100)}%, Energy ${Math.round(data.energy/total*100)}%, Lifestyle ${Math.round(data.lifestyle/total*100)}%`);
    svgEl.innerHTML = svgContent + `
      <circle cx="${cx}" cy="${cy}" r="22" fill="var(--bg-secondary)"/>
      <g class="donut-center-text">
        <text x="50" y="47" class="donut-total" text-anchor="middle">${Math.round(total).toLocaleString()}</text>
        <text x="50" y="60" class="donut-label" text-anchor="middle">kg CO₂e</text>
      </g>
    `;

    // Legend construction using safe textContent bindings
    const legendEl = document.createElement('div');
    legendEl.className = 'donut-legend';

    segments.forEach(seg => {
      const percentage = total > 0 ? Math.round((seg.value / total) * 100) : 0;
      
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.setAttribute('tabindex', '0');
      
      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.backgroundColor = seg.color;
      
      const labelText = document.createElement('span');
      labelText.className = 'legend-text';
      labelText.textContent = ` ${seg.icon} ${seg.label}: `;
      
      const valueText = document.createElement('strong');
      valueText.className = 'legend-value';
      valueText.textContent = `${seg.value.toLocaleString()} kg (${percentage}%)`;

      legendItem.appendChild(dot);
      legendItem.appendChild(labelText);
      legendItem.appendChild(valueText);
      legendEl.appendChild(legendItem);
    });

    // Tooltip node creation
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.display = 'none';

    wrapper.appendChild(svgEl);
    wrapper.appendChild(legendEl);
    wrapper.appendChild(tooltip);

    // Set container content safely
    container.innerHTML = '';
    container.appendChild(wrapper);

    // Dynamic hover details
    const elements = svgEl.querySelectorAll('.donut-segment');
    elements.forEach(el => {
      const showTooltip = (e) => {
        const label = el.getAttribute('data-label');
        const val = Number(el.getAttribute('data-val')).toLocaleString();
        const pct = el.getAttribute('data-pct');
        
        tooltip.textContent = `${label}: ${val} kg CO₂e (${pct}%)`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.offsetX + 15}px`;
        tooltip.style.top = `${e.offsetY - 15}px`;
      };
      const hideTooltip = () => {
        tooltip.style.display = 'none';
      };

      el.addEventListener('mousemove', showTooltip);
      el.addEventListener('focus', showTooltip);
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('blur', hideTooltip);
    });
  }

  /**
   * Generates a Line Chart indicating historical carbon footprint trends.
   * @param {string} containerId ID of container element.
   * @param {Array<Object>} history Array of historical records.
   */
  static drawLineChart(containerId, history) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-chart';
      emptyDiv.setAttribute('role', 'status');
      const p = document.createElement('p');
      p.textContent = 'Not enough tracking points. Calculate your footprint to begin plotting your trends.';
      emptyDiv.appendChild(p);
      container.appendChild(emptyDiv);
      return;
    }

    // Sort history chronologically
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    // Limit to last 8 items to prevent overcrowding
    const dataPoints = sorted.slice(-8);

    const width = 500;
    const height = 250;
    const padding = { top: 30, right: 30, bottom: 40, left: 55 };

    const minVal = 0;
    const maxVal = Math.max(12000, ...dataPoints.map(d => d.total)) * 1.1; // Add 10% headroom

    const getX = (index) => {
      if (dataPoints.length <= 1) return padding.left + (width - padding.left - padding.right) / 2;
      return padding.left + (index / (dataPoints.length - 1)) * (width - padding.left - padding.right);
    };

    const getY = (val) => {
      return height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom);
    };

    let svgContent = '';

    // Draw horizontal grid lines and vertical labels
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const yVal = minVal + (i / gridCount) * (maxVal - minVal);
      const yPos = getY(yVal);
      
      // Grid line
      svgContent += `
        <line 
          x1="${padding.left}" 
          y1="${yPos}" 
          x2="${width - padding.right}" 
          y2="${yPos}" 
          stroke="var(--bg-tertiary)" 
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <text 
          x="${padding.left - 8}" 
          y="${yPos + 4}" 
          class="axis-text" 
          text-anchor="end"
        >${Math.round(yVal).toLocaleString()}</text>
      `;
    }

    // Connect lines
    let pathD = '';
    let circles = '';

    dataPoints.forEach((pt, idx) => {
      const x = getX(idx);
      const y = getY(pt.total);
      
      if (idx === 0) {
        pathD = `M ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
      }

      const dateStr = new Date(pt.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // Circles for user selection
      circles += `
        <circle 
          cx="${x}" 
          cy="${y}" 
          r="5" 
          fill="var(--accent-primary)" 
          stroke="var(--bg-secondary)" 
          stroke-width="2" 
          class="line-point"
          data-date="${dateStr}"
          data-total="${pt.total}"
          tabindex="0"
          role="img"
          aria-label="Emission on ${dateStr}: ${pt.total} kg"
        />
      `;

      // Date labels on X axis
      svgContent += `
        <text 
          x="${x}" 
          y="${height - padding.bottom + 20}" 
          class="axis-text axis-label-x" 
          text-anchor="middle"
        >${dateStr}</text>
      `;
    });

    if (dataPoints.length > 1) {
      svgContent += `
        <path 
          d="${pathD}" 
          fill="transparent" 
          stroke="var(--accent-primary)" 
          stroke-width="3" 
          class="trend-line-path"
        />`;
    }

    // Add elements
    svgContent += circles;

    const wrapper = document.createElement('div');
    wrapper.className = 'line-chart-wrapper';

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('class', 'line-svg');
    svgEl.setAttribute('role', 'img');
    svgEl.setAttribute('aria-label', 'Line chart displaying historical carbon emission progress points');
    svgEl.innerHTML = svgContent;

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.display = 'none';

    wrapper.appendChild(svgEl);
    wrapper.appendChild(tooltip);

    container.innerHTML = '';
    container.appendChild(wrapper);

    // Event hooks for interactions
    const points = svgEl.querySelectorAll('.line-point');
    points.forEach(pt => {
      const showTooltip = (e) => {
        const date = pt.getAttribute('data-date');
        const total = Number(pt.getAttribute('data-total')).toLocaleString();
        
        tooltip.textContent = `${date}: ${total} kg CO₂e`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.offsetX + 15}px`;
        tooltip.style.top = `${e.offsetY - 15}px`;
      };
      const hideTooltip = () => {
        tooltip.style.display = 'none';
      };

      pt.addEventListener('mousemove', showTooltip);
      pt.addEventListener('focus', showTooltip);
      pt.addEventListener('mouseleave', hideTooltip);
      pt.addEventListener('blur', hideTooltip);
    });
  }

  /**
   * Generates a Comparison Gauge versus standard baselines.
   * @param {string} containerId ID of container element.
   * @param {number} userTotal User's carbon total (kg CO₂e).
   */
  static drawGauge(containerId, userTotal) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Define gauge extremes
    const maxScale = 15000;
    const averageUser = window.COMPARISON_BASELINES.averageUser;
    const targetUser = window.COMPARISON_BASELINES.targetSustainability;

    // Semicircle measurements
    const cx = 100;
    const cy = 90;
    const r = 70;

    // Calculate angles (180deg is left/minimum, 0deg is right/maximum)
    const getAngle = (val) => {
      const pct = Math.max(0, Math.min(1, val / maxScale));
      return 180 - (pct * 180);
    };

    const userAngle = getAngle(userTotal);
    const avgAngle = getAngle(averageUser);
    const targetAngle = getAngle(targetUser);

    const getCoords = (angle, radius = 70) => {
      const rad = (angle * Math.PI) / 180;
      return {
        x: cx + radius * Math.cos(rad),
        y: cy - radius * Math.sin(rad)
      };
    };

    const userPt = getCoords(userAngle, 62);
    const avgPt = getCoords(avgAngle, 78);
    const targetPt = getCoords(targetAngle, 78);

    // Build the visual SVG layout
    const svgContent = `
      <!-- Semicircle Track -->
      <path 
        d="M 30 90 A 70 70 0 0 1 170 90" 
        fill="transparent" 
        stroke="var(--bg-tertiary)" 
        stroke-width="12" 
        stroke-linecap="round"
      />
      
      <!-- Green Target zone indicator path (0 to Target) -->
      <path 
        d="M 30 90 A 70 70 0 0 1 ${getCoords(targetAngle).x} ${getCoords(targetAngle).y}" 
        fill="transparent" 
        stroke="var(--accent-primary)" 
        stroke-width="12" 
        stroke-linecap="square"
      />
      
      <!-- Target Label -->
      <line 
        x1="${cx}" y1="${cy}" 
        x2="${targetPt.x}" y2="${targetPt.y}" 
        stroke="var(--accent-primary)" 
        stroke-dasharray="2,2" 
        stroke-width="2"
      />
      <text 
        x="${targetPt.x - 5}" 
        y="${targetPt.y - 8}" 
        class="gauge-label-text color-target" 
        text-anchor="end"
      >Target (${(targetUser/1000).toFixed(1)}t)</text>
      
      <!-- Average User baseline -->
      <line 
        x1="${cx}" y1="${cy}" 
        x2="${avgPt.x}" y2="${avgPt.y}" 
        stroke="var(--accent-warning)" 
        stroke-dasharray="2,2" 
        stroke-width="2"
      />
      <text 
        x="${avgPt.x + 5}" 
        y="${avgPt.y - 8}" 
        class="gauge-label-text color-avg" 
        text-anchor="start"
      >Avg Developed country (${(averageUser/1000).toFixed(1)}t)</text>
      
      <!-- Center hub -->
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--text-primary)" />
      
      <!-- Needle pointer targeting user position -->
      <line 
        x1="${cx}" y1="${cy}" 
        x2="${userPt.x}" y2="${userPt.y}" 
        stroke="var(--accent-danger)" 
        stroke-width="4" 
        stroke-linecap="round"
        class="gauge-needle"
      />
      
      <!-- Labels for extremities -->
      <text x="25" y="105" class="axis-text" text-anchor="middle">0t</text>
      <text x="175" y="105" class="axis-text" text-anchor="middle">15t</text>
    `;

    const wrapper = document.createElement('div');
    wrapper.className = 'gauge-chart-wrapper';

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 200 115');
    svgEl.setAttribute('class', 'gauge-svg');
    svgEl.setAttribute('role', 'img');
    svgEl.setAttribute('aria-label', `Carbon emission comparison gauge. Current: ${(userTotal/1000).toFixed(1)} tonnes, average: 8.5 tonnes, target: 2.0 tonnes.`);
    svgEl.innerHTML = svgContent;

    const displayInfo = document.createElement('div');
    displayInfo.className = 'gauge-info-box';
    
    // User status text logic
    let statusClass = 'color-target';
    let statusText = 'Excellent (Within Climate-Safe Target!)';
    if (userTotal > targetUser && userTotal <= averageUser) {
      statusClass = 'color-avg';
      statusText = 'Moderate (Below developed country average)';
    } else if (userTotal > averageUser) {
      statusClass = 'color-warn';
      statusText = 'High (Above average footprint)';
    }

    displayInfo.innerHTML = '';
    
    const currentValDiv = document.createElement('div');
    currentValDiv.className = 'gauge-current-val';
    currentValDiv.textContent = 'Your footprint: ';
    
    const statusSpan = document.createElement('span');
    statusSpan.className = statusClass;
    
    const strongEl = document.createElement('strong');
    strongEl.textContent = `${(userTotal / 1000).toFixed(2)} tonnes CO₂e / year`;
    
    statusSpan.appendChild(strongEl);
    currentValDiv.appendChild(statusSpan);
    
    const statusDescDiv = document.createElement('div');
    statusDescDiv.className = 'gauge-status-desc';
    statusDescDiv.textContent = statusText;
    
    displayInfo.appendChild(currentValDiv);
    displayInfo.appendChild(statusDescDiv);

    wrapper.appendChild(svgEl);
    wrapper.appendChild(displayInfo);

    container.innerHTML = '';
    container.appendChild(wrapper);
  }
}

// Export modules for vanilla JavaScript usage
window.SVGCharts = SVGCharts;
