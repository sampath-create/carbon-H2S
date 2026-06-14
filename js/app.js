/**
 * @fileoverview Application entry point and coordinator. Handles event listening,
 * state changes, and DOM rendering delegation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let state = {
    history: [],
    goals: new Map(),
    preferences: { theme: 'dark' }
  };

  /**
   * Serializes the internal Map data structures to plain formats and persists to local storage.
   */
  function saveState() {
    const dataToSave = {
      history: state.history,
      preferences: state.preferences,
      goals: Array.from(state.goals.values())
    };
    window.StorageManager.save(dataToSave);
  }

  // DOM Cache
  const calcForm = document.getElementById('calculator-form');
  const renewPctSlider = document.getElementById('renew-pct');
  const renewPctVal = document.getElementById('renew-pct-val');
  
  const summaryTotal = document.getElementById('summary-total');
  const summaryGoalsCount = document.getElementById('summary-goals');
  const summaryReduction = document.getElementById('summary-reduction');
  
  const donutContainerId = 'donut-chart-container';
  const lineContainerId = 'line-chart-container';
  const gaugeContainerId = 'gauge-container';
  
  const recsContainer = document.getElementById('recommendations-container');
  
  const goalForm = document.getElementById('add-goal-form');
  const goalTitleInput = document.getElementById('goal-title-input');
  const goalReductionInput = document.getElementById('goal-reduction-input');
  const goalsContainer = document.getElementById('goals-list');
  
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeBtnText = document.getElementById('theme-btn-text');
  const printBtn = document.getElementById('print-report-btn');

  /**
   * Triggers a non-blocking toast notification banner.
   * @param {string} message 
   * @param {string} type 'success' | 'error' | 'info'
   */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    });

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Initializes the application.
   */
  function init() {
    // 1. Load data from local storage
    const loadedData = window.StorageManager.load();
    state.history = loadedData.history || [];
    state.preferences = loadedData.preferences || { theme: 'dark' };
    state.goals = new Map((loadedData.goals || []).map(g => [g.id, g]));

    // 2. Initialize design theme
    applyTheme(state.preferences.theme);

    // 3. Pre-fill form from latest record if available
    prefillForm();

    // 4. Register event listeners
    registerEvents();

    // 5. Render dashboard and components
    render();
  }

  /**
   * Applies the theme attribute to the HTML root element.
   * @param {string} theme 'light' | 'dark'
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      themeIcon.textContent = '';
      themeBtnText.textContent = 'Dark Mode';
    } else {
      themeIcon.textContent = '';
      themeBtnText.textContent = 'Light Mode';
    }
  }

  /**
   * Populates form inputs with parameters from the user's latest history item.
   */
  function prefillForm() {
    if (state.history.length === 0) return;
    
    // Sort chronologically and extract latest item inputs
    const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
    const latestInputs = sorted[0].inputs;

    if (!latestInputs) return;

    // Fill form elements safely
    if ('carDist' in latestInputs) document.getElementById('car-dist').value = latestInputs.carDist || '';
    if ('vehicleType' in latestInputs) document.getElementById('vehicle-type').value = latestInputs.vehicleType;
    if ('pubDist' in latestInputs) document.getElementById('pub-dist').value = latestInputs.pubDist || '';
    if ('shortFlights' in latestInputs) document.getElementById('short-flights').value = latestInputs.shortFlights || '';
    if ('longFlights' in latestInputs) document.getElementById('long-flights').value = latestInputs.longFlights || '';
    if ('electricity' in latestInputs) document.getElementById('electricity').value = latestInputs.electricity || '';
    
    if ('renewPct' in latestInputs) {
      const pct = latestInputs.renewPct;
      renewPctSlider.value = pct;
      renewPctSlider.setAttribute('aria-valuenow', pct);
      renewPctVal.textContent = `${pct}%`;
    }

    if ('dietType' in latestInputs) document.getElementById('diet-type').value = latestInputs.dietType;
    if ('shoppingType' in latestInputs) document.getElementById('shopping-type').value = latestInputs.shoppingType;
    if ('wasteType' in latestInputs) document.getElementById('waste-type').value = latestInputs.wasteType;
  }

  /**
   * Wire up event listeners.
   */
  function registerEvents() {
    // Theme Switcher
    themeToggle.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      state.preferences.theme = newTheme;
      applyTheme(newTheme);
      saveState();
    });

    // Print Report
    printBtn.addEventListener('click', () => {
      window.print();
    });

    // Live slider updates
    renewPctSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      renewPctSlider.setAttribute('aria-valuenow', val);
      renewPctVal.textContent = `${val}%`;
    });

    // Form Submission for Calculation
    calcForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!validateCalculatorInputs()) {
        return;
      }

      // Collect inputs into safe raw schema
      const inputs = {
        carDist: parseFloat(document.getElementById('car-dist').value) || 0,
        vehicleType: document.getElementById('vehicle-type').value,
        pubDist: parseFloat(document.getElementById('pub-dist').value) || 0,
        shortFlights: parseInt(document.getElementById('short-flights').value, 10) || 0,
        longFlights: parseInt(document.getElementById('long-flights').value, 10) || 0,
        electricity: parseFloat(document.getElementById('electricity').value) || 0,
        renewPct: parseInt(renewPctSlider.value, 10) || 0,
        dietType: document.getElementById('diet-type').value,
        shoppingType: document.getElementById('shopping-type').value,
        wasteType: document.getElementById('waste-type').value
      };

      // Calculate footprint
      const results = window.CarbonCalculator.calculate(inputs);

      // Append new entry to history
      const newRecord = {
        id: 'rec-' + Date.now(),
        timestamp: Date.now(),
        transport: results.transport,
        energy: results.energy,
        lifestyle: results.lifestyle,
        total: results.total,
        inputs: inputs
      };

      state.history.push(newRecord);
      saveState();
      
      // Re-render dashboard visualizations and insights
      render();
      
      // Scroll smoothly to dashboard metrics
      document.getElementById('dashboard-title').scrollIntoView({ behavior: 'smooth' });
    });

    // Custom Goal Form Submission
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const title = goalTitleInput.value.trim();
      const pct = parseInt(goalReductionInput.value, 10) || 20;

      if (!title) {
        showToast('Please enter a goal description.', 'error');
        return;
      }

      // Calculate current baseline value if history exists
      let latestTotal = 8500; // Default baseline if empty
      if (state.history.length > 0) {
        const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
        latestTotal = sorted[0].total;
      }

      const targetVal = latestTotal * (1 - pct / 100);

      const newGoal = {
        id: 'goal-' + Date.now(),
        title: title,
        category: 'general',
        targetPercent: pct,
        currentValue: latestTotal,
        targetValue: targetVal,
        completed: false,
        createdAt: Date.now()
      };

      state.goals.set(newGoal.id, newGoal);
      saveState();

      // Clear input fields
      goalTitleInput.value = '';
      
      render();
    });

    // Event Delegation: Recommendations Container (Add Recommendation to Goals)
    recsContainer.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-rec-goal-btn');
      if (!addBtn) return;

      const title = addBtn.getAttribute('data-title');
      const category = addBtn.getAttribute('data-category');
      const savings = parseInt(addBtn.getAttribute('data-savings'), 10) || 100;

      // Check if goal already exists to prevent duplicate additions
      const isDuplicate = Array.from(state.goals.values()).some(g => g.title === title && !g.completed);
      if (isDuplicate) {
        showToast('This recommendation is already active in your goals list!', 'info');
        return;
      }

      // Calculate current baseline total
      let latestTotal = 8500;
      if (state.history.length > 0) {
        const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
        latestTotal = sorted[0].total;
      }

      const newGoal = {
        id: 'goal-' + Date.now(),
        title: title,
        category: category,
        targetPercent: Math.round((savings / Math.max(100, latestTotal)) * 100) || 5,
        currentValue: latestTotal,
        targetValue: Math.max(0, latestTotal - savings),
        completed: false,
        createdAt: Date.now()
      };

      state.goals.set(newGoal.id, newGoal);
      saveState();

      // Render update
      render();

      // Alert feedback
      showToast(`"${title}" added to active goals list!`, 'success');
    });

    // Event Delegation: Goals List Container (Checkboxes & Deletion)
    goalsContainer.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.goal-checkbox');
      if (!checkbox) return;

      const goalId = checkbox.getAttribute('data-id');
      const goal = state.goals.get(goalId);
      if (goal) {
        goal.completed = checkbox.checked;
        
        // If completed, update current status value
        if (goal.completed && state.history.length > 0) {
          const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
          goal.currentValue = sorted[0].total;
        }

        saveState();
        render();
      }
    });

    goalsContainer.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.goal-delete-btn');
      if (!deleteBtn) return;

      const goalId = deleteBtn.getAttribute('data-id');
      state.goals.delete(goalId);
      saveState();
      render();
    });
  }

  /**
   * Frontend form validation for custom error handling.
   * @returns {boolean} Whether inputs are valid.
   */
  function validateCalculatorInputs() {
    const carDist = document.getElementById('car-dist');
    const pubDist = document.getElementById('pub-dist');
    const shortFlights = document.getElementById('short-flights');
    const longFlights = document.getElementById('long-flights');
    const electricity = document.getElementById('electricity');

    let isValid = true;

    // Helper to validate individual input fields
    const checkRange = (el, min, max, errorId, label) => {
      const errEl = document.getElementById(errorId);
      const val = parseFloat(el.value);
      
      if (el.value !== '' && (isNaN(val) || val < min || val > max)) {
        const msg = `${label} must be a number between ${min} and ${max}.`;
        el.setCustomValidity(msg);
        if (errEl) {
          errEl.textContent = msg;
        }
        isValid = false;
        return false;
      }
      el.setCustomValidity('');
      if (errEl) {
        errEl.textContent = '';
      }
      return true;
    };

    // Clear previous validations
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    if (!checkRange(carDist, 0, 1000, 'car-dist-error', 'Daily car commute distance')) isValid = false;
    if (!checkRange(pubDist, 0, 1000, 'pub-dist-error', 'Daily transit distance')) isValid = false;
    if (!checkRange(shortFlights, 0, 100, 'short-flights-error', 'Short flight count')) isValid = false;
    if (!checkRange(longFlights, 0, 100, 'long-flights-error', 'Long flight count')) isValid = false;
    if (!checkRange(electricity, 0, 10000, 'electricity-error', 'Monthly electricity consumption')) isValid = false;

    if (!isValid) {
      showToast('Please correct validation errors on the form.', 'error');
    }

    return isValid;
  }

  /**
   * Main rendering routine updates the UI depending on state.
   */
  function render() {
    const sortedHistory = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
    const hasHistory = sortedHistory.length > 0;
    const latestItem = hasHistory ? sortedHistory[0] : null;

    // 1. Update Hero Cards
    updateSummaryStats(latestItem);

    // 2. Render Donut breakdown
    const donutData = latestItem ? {
      transport: latestItem.transport,
      energy: latestItem.energy,
      lifestyle: latestItem.lifestyle
    } : { transport: 0, energy: 0, lifestyle: 0 };
    window.SVGCharts.drawDonut(donutContainerId, donutData);

    // 3. Render Line Trend Chart
    window.SVGCharts.drawLineChart(lineContainerId, state.history);

    // 4. Render Gauge Comparison
    const currentTotal = latestItem ? latestItem.total : 0;
    window.SVGCharts.drawGauge(gaugeContainerId, currentTotal);

    // 5. Render Personalized Recommendations
    renderRecommendations(latestItem ? latestItem.inputs : null);

    // 6. Render active goals list
    renderGoalsList();
  }

  /**
   * Updates top summary cards in the Hero section.
   * @param {Object|null} latestItem 
   */
  function updateSummaryStats(latestItem) {
    if (latestItem) {
      // Annual Footprint Card
      summaryTotal.textContent = `${(latestItem.total / 1000).toFixed(1)} t`;
      
      // Calculate Tracked progress
      if (state.history.length >= 2) {
        // Compare latest vs the very first entry
        const sortedChrono = [...state.history].sort((a, b) => a.timestamp - b.timestamp);
        const baseline = sortedChrono[0].total;
        const current = latestItem.total;
        
        if (baseline > 0) {
          const reduction = ((baseline - current) / baseline) * 100;
          const sign = reduction >= 0 ? '-' : '+';
          summaryReduction.textContent = `${sign}${Math.abs(Math.round(reduction))}%`;
          summaryReduction.style.color = reduction >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)';
        } else {
          summaryReduction.textContent = '0%';
        }
      } else {
        // Compare vs developed country average (8,500 kg)
        const baseline = 8500;
        const current = latestItem.total;
        const diff = ((baseline - current) / baseline) * 100;
        const sign = diff >= 0 ? '-' : '+';
        summaryReduction.textContent = `${sign}${Math.abs(Math.round(diff))}%`;
        summaryReduction.style.color = diff >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)';
      }
    } else {
      summaryTotal.textContent = '--';
      summaryReduction.textContent = '--';
      summaryReduction.style.color = 'var(--text-primary)';
    }

    // Active goals counts
    const activeCount = Array.from(state.goals.values()).filter(g => !g.completed).length;
    summaryGoalsCount.textContent = String(activeCount);
  }

  /**
   * Renders recommendations list on the page.
   * @param {Object|null} inputs 
   */
  function renderRecommendations(inputs) {
    const recommendations = window.InsightsEngine.generate(inputs);
    recsContainer.innerHTML = '';

    recommendations.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'rec-card';
      card.setAttribute('tabindex', '0');

      let difficultyClass = 'badge-easy';
      if (rec.difficulty === 'Medium') difficultyClass = 'badge-medium';
      if (rec.difficulty === 'Hard') difficultyClass = 'badge-hard';

      // Use safe DOM operations for titles and texts to block XSS
      const categoryEl = document.createElement('div');
      categoryEl.className = 'rec-category';
      categoryEl.textContent = rec.category.toUpperCase();

      const titleEl = document.createElement('h3');
      titleEl.className = 'rec-title';
      titleEl.textContent = rec.title;

      const descEl = document.createElement('p');
      descEl.className = 'rec-desc';
      descEl.textContent = rec.description;

      const metaEl = document.createElement('div');
      metaEl.className = 'rec-meta';
      
      const savingsEl = document.createElement('span');
      savingsEl.className = 'rec-savings';
      savingsEl.textContent = `-${rec.savings} kg CO₂e / yr`;

      const diffBadge = document.createElement('span');
      diffBadge.className = `badge ${difficultyClass}`;
      diffBadge.textContent = rec.difficulty;

      metaEl.appendChild(savingsEl);
      metaEl.appendChild(diffBadge);

      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-secondary btn-block add-rec-goal-btn';
      addBtn.textContent = 'Add to Goals';
      addBtn.setAttribute('data-title', rec.title);
      addBtn.setAttribute('data-category', rec.category);
      addBtn.setAttribute('data-savings', rec.savings);
      addBtn.setAttribute('aria-label', `Add goal: ${rec.title} to save ${rec.savings} kilograms of carbon annually`);

      card.appendChild(categoryEl);
      card.appendChild(titleEl);
      card.appendChild(descEl);
      card.appendChild(metaEl);
      card.appendChild(addBtn);

      recsContainer.appendChild(card);
    });
  }

  /**
   * Helper function matching categories to local unicode icons.
   * @param {string} cat 
   * @returns {string} Icon.
   */
  function getCategoryIcon(cat) {
    return '';
  }

  /**
   * Render active goals.
   */
  function renderGoalsList() {
    goalsContainer.innerHTML = '';
    
    if (state.goals.size === 0) {
      goalsContainer.innerHTML = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-chart';
      emptyDiv.style.height = '100px';
      const p = document.createElement('p');
      p.textContent = 'No active sustainability targets. Set a percentage reduction goal or choose recommendations above!';
      emptyDiv.appendChild(p);
      goalsContainer.appendChild(emptyDiv);
      return;
    }

    state.goals.forEach(goal => {
      const card = document.createElement('div');
      card.className = `goal-card ${goal.completed ? 'completed' : ''}`;

      const header = document.createElement('div');
      header.className = 'goal-header';

      const label = document.createElement('label');
      label.className = 'goal-checkbox-container';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'goal-checkbox';
      checkbox.checked = goal.completed;
      checkbox.setAttribute('data-id', goal.id);
      checkbox.setAttribute('aria-label', `Mark goal "${goal.title}" as completed`);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'goal-title';
      titleSpan.textContent = goal.title;

      label.appendChild(checkbox);
      label.appendChild(titleSpan);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'goal-delete-btn';
      deleteBtn.setAttribute('data-id', goal.id);
      deleteBtn.setAttribute('aria-label', `Delete goal "${goal.title}"`);
      deleteBtn.innerHTML = '&times;';

      header.appendChild(label);
      header.appendChild(deleteBtn);

      card.appendChild(header);

      // Calculations details for tracking progress bar
      if (!goal.completed) {
        // Compute target values percentage bar progress
        let latestTotal = goal.currentValue;
        if (state.history.length > 0) {
          const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp);
          latestTotal = sorted[0].total;
        }

        // Percentage completed: baseline is goal.currentValue, target is goal.targetValue
        // Current value is latestTotal
        const range = goal.currentValue - goal.targetValue;
        let progressPct = 0;
        if (range > 0) {
          const currentDiff = goal.currentValue - latestTotal;
          progressPct = Math.max(0, Math.min(100, Math.round((currentDiff / range) * 100)));
        } else {
          progressPct = latestTotal <= goal.targetValue ? 100 : 0;
        }

        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'goal-progress-bar-container';

        const progressBar = document.createElement('div');
        progressBar.className = 'goal-progress-bar';
        progressBar.style.width = `${progressPct}%`;
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuenow', progressPct);
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        progressBar.setAttribute('aria-label', `Goal progress: ${progressPct}%`);

        progressBarContainer.appendChild(progressBar);

        const stats = document.createElement('div');
        stats.className = 'goal-progress-stats';
        
        const leftStat = document.createElement('span');
        leftStat.textContent = `Target: -${goal.targetPercent}% emissions`;
        
        const rightStat = document.createElement('span');
        rightStat.textContent = `${progressPct}% Progress`;

        stats.appendChild(leftStat);
        stats.appendChild(rightStat);

        card.appendChild(progressBarContainer);
        card.appendChild(stats);
      }

      goalsContainer.appendChild(card);
    });
  }

  // Trigger main init execution
  init();
});
