# Testing Guide & Specifications

This document outlines the testing strategy for the EcoTrace Carbon Footprint Tracker, covering both automated unit tests and manual browser verifications.

---

## 1. Automated Test Suite (`tests.html`)

An automated test suite is integrated directly into the workspace. Open `tests.html` in any browser to execute the tests.

### A. Carbon Footprint Calculations (`js/calculator.js`)
* **Test Case: Petrol Car Commute**
  * *Inputs:* 10 km daily car commute (Petrol), 0 km public transit, 0 flights, 0 energy usage, Vegan diet, Low shopping, Low waste.
  * *Expected Result:*
    * Transport: $10 \text{ km} \times 365 \text{ days} \times 0.18 \text{ kg/km} = 657 \text{ kg CO}_2\text{e}$
    * Lifestyle: Vegan (800) + Shopping Low (400) + Waste Low (100) = $1,300 \text{ kg CO}_2\text{e}$
    * Total Footprint: $1,957 \text{ kg CO}_2\text{e}$
* **Test Case: Electric Vehicle & Transit**
  * *Inputs:* 20 km daily car commute (Electric), 50 km daily public transit, 2 short flights, 1 long flight, 0 energy usage, Vegetarian diet, Medium shopping, Medium waste.
  * *Expected Result:*
    * Transport: $(20 \times 365 \times 0.05) + (50 \times 365 \times 0.04) + (2 \times 150) + (1 \times 1200) = 2,595 \text{ kg CO}_2\text{e}$
    * Lifestyle: Vegetarian (1200) + Shopping Medium (1000) + Waste Medium (300) = $2,500 \text{ kg CO}_2\text{e}$
* **Test Case: Renewable Grid Offset**
  * *Inputs:* 300 kWh monthly electricity usage, 75% renewable energy enrollment, zero transportation/lifestyle footprint.
  * *Expected Result:*
    * Energy: $300 \text{ kWh} \times 12 \text{ months} \times 0.38 \text{ kg/kWh} \times (1 - 0.75) = 342 \text{ kg CO}_2\text{e}$

### B. Input Validation & Data Sanitization (`js/storage.js`)
* **Test Case: Storage Schema Fallback**
  * *Inputs:* Corrupted storage data with invalid properties (`history: 'not-an-array'`, `preferences: { theme: 'magenta' }`).
  * *Expected Result:* Automatically sanitizes and falls back to default empty schema structures, setting theme to `dark`.
* **Test Case: XSS Script Injection Prevention**
  * *Inputs:* Text strings containing script tags (e.g. `'9999<script>alert("XSS")</script>'`) inside numeric parameters.
  * *Expected Result:* Cleaned by coercion rules, converting inputs to safe positive numeric values.

### C. Insight Recommendation Rules (`js/insights.js`)
* **Test Case: High-Emission Recommendations Trigger**
  * *Inputs:* High petrol commute and heavy meat consumption.
  * *Expected Result:* Serves recommendations for electric vehicle transition (`switch-electric`) and diet adjustments (`meatless-mondays`).

---

## 2. Manual Testing Checklist

Ensure all items pass before production deployment:

### A. Data Persistence & Local Storage
1. Fill out the calculator with unique figures (e.g. 15 km petrol commute, 200 kWh energy) and click **Calculate Footprint**.
2. Refresh the browser page.
3. **Pass Condition:** The input fields remain populated with your exact figures, and the summary charts restore correctly.

### B. Mobile Responsiveness
1. Open the page in a browser and resize the viewport to mobile dimensions ($360 \times 800 \text{px}$).
2. **Pass Condition:**
   * All sections flow in a single column without horizontal scrolling.
   * Buttons and inputs remain easy to tap ($44 \times 44 \text{px}$ minimum size).
   * SVGs scale responsively within their panels.

### C. Keyboard Navigation & Accessibility (WCAG 2.1 AA)
1. Use the `Tab` key to navigate through the entire page.
2. **Pass Condition:**
   * The active element receives a clear green outline.
   * The skip link appears at the top when tabbed first.
   * Interactive chart nodes (donut segments and line graph dots) can be focused and show descriptions.
   * Form fields, selectors, and buttons are accessible in a logical left-to-right, top-to-bottom order.

### D. Edge Cases & Error Boundaries
1. Enter empty strings, negative values (e.g. `-50`), or excessively large numbers (e.g. `99999999`) in the number inputs.
2. Click **Calculate Footprint**.
3. **Pass Condition:** Form constraints trigger native browser validation bubbles, blocking negative values or bounding inputs inside their logical limits (e.g. daily travel capped at 1,000 km, monthly energy capped at 10,000 kWh).
