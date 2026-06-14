# EcoTrace - Carbon Footprint Tracker Web Application

EcoTrace is a lightweight, offline-first web application designed to help individuals calculate, monitor, and reduce their carbon footprint through daily habits and active goal setting.

---

## 1. Features

- **Personalized Carbon Calculator**: Form input tracking Transportation, Energy usage, and Lifestyle/Diet habits with dynamic validation bounds.
- **Progress Dashboard**: Custom SVG-based visualizations of category distributions (Donut Chart), historical trends (Line Chart), and developed country baseline averages (Comparison Gauge).
- **Goal Tracking System**: Allows users to set customized percentage reduction goals or adopt high-impact recommendations directly.
- **Tailored Recommendations**: Dynamic calculation of potential annual carbon offsets based on individual user parameters.
- **Local Storage Persistence**: Safely parses and preserves history data directly in-browser with zero backend dependencies.
- **A11y/Contrast Integration**: Native keyboard accessibility, focus rings, skip links, and ARIA roles meeting WCAG 2.1 AA benchmarks.

---

## 2. File Structure

```text
/
├── index.html            # Core HTML structure & accessibility annotations
├── css/
│   └── styles.css        # Layouts, typography, glassmorphism themes & print rules
├── js/
│   ├── app.js            # Coordinator, event listeners & DOM updates
│   ├── calculator.js     # Mathematical carbon computation model
│   ├── storage.js        # LocalStorage validator & schema manager
│   ├── insights.js       # Recommendations generator engine
│   └── charts.js         # Direct SVG drawing components
├── README.md             # Project overview & guidelines
├── TESTING.md            # Manual & automated testing documentation
└── tests.html            # Client-side automated unit test suite
```

---

## 3. Getting Started

### Local Setup
Since the codebase relies strictly on standard vanilla HTML5, CSS3, and modern ES6+ JavaScript, no package installation, bundler, or build tool is needed.

1. Clone or download the repository to your local computer.
2. Open the `index.html` file in any modern web browser.

### Running the Tests
To run the integrated unit and validation tests:
1. Open the `tests.html` file in your web browser.
2. The page will instantly report the pass/fail results of the calculations, insights, and input sanitization modules.
