# Index HTML Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the embedded single-file web UI into maintainable static assets and improve the dashboard information hierarchy without changing backend API behavior or adding a frontend build step.

**Architecture:** Keep Go embed as the only asset delivery mechanism, but separate structure, styling, and behavior into `web/index.html`, `web/styles.css`, and `web/app.js`. Preserve all existing runtime flows while tightening panel hierarchy, contextual drilldown labels, selected states, and empty/loading feedback.

**Tech Stack:** Go, net/http, embedded static files, vanilla HTML/CSS/JavaScript

---

### Task 1: Lock in split-asset expectations with failing tests

**Files:**
- Modify: `main_test.go`
- Test: `main_test.go`

- [ ] **Step 1: Write the failing tests**
  Add embedded-asset tests that expect `web/index.html` to reference external `styles.css` and `app.js`, and route-serving tests that expect `/styles.css` and `/app.js` to be available.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `go test ./...`
  Expected: failures because the current UI still inlines CSS and JavaScript and does not expose the new asset expectations.

- [ ] **Step 3: Write the minimal implementation**
  Update the embedded UI structure so the new static assets exist and are served correctly through the existing file server.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `go test ./...`
  Expected: embedded asset and route-serving tests pass.

### Task 2: Split the page into maintainable HTML, CSS, and JavaScript files

**Files:**
- Modify: `web/index.html`
- Create: `web/styles.css`
- Create: `web/app.js`
- Test: `main_test.go`

- [ ] **Step 1: Preserve the HTML skeleton and semantic regions**
  Move the page shell, panel markup, settings surface, chart container, and drilldown sections into a cleaned-up `web/index.html` with explicit top-level regions.

- [ ] **Step 2: Move styles into `web/styles.css`**
  Port the current visual system into a dedicated stylesheet organized by variables, layout, panel primitives, table states, settings panel, chart styles, and responsive rules.

- [ ] **Step 3: Move behavior into `web/app.js`**
  Port the current JavaScript into a dedicated script organized by app state, element lookup, utilities, API helpers, render helpers, chart logic, event binding, and bootstrap flow.

- [ ] **Step 4: Run tests to verify the split remains healthy**
  Run: `go test ./...`
  Expected: all tests remain green after the asset split.

### Task 3: Improve dashboard hierarchy and drilldown clarity

**Files:**
- Modify: `web/index.html`
- Modify: `web/styles.css`
- Modify: `web/app.js`
- Test: `main_test.go`

- [ ] **Step 1: Write the failing tests**
  Extend embedded UI tests so they expect stronger region structure and updated contextual labels for drilldown titles, settings controls, and status/running-state copy.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `go test ./...`
  Expected: failures because the old page structure and labels do not satisfy the new hierarchy expectations.

- [ ] **Step 3: Write the minimal implementation**
  Rework the dashboard layout so controls, status, overview, and drilldown panels are visually clearer; update titles and helper text dynamically based on dimension and selection state; strengthen selected and empty states.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `go test ./...`
  Expected: hierarchy and contextual-label tests pass without regressing behavior.

### Task 4: Verify end-to-end behavior and embedded delivery

**Files:**
- Modify: `main_test.go`
- Test: `main_test.go`

- [ ] **Step 1: Refresh embedded content assertions**
  Update current HTML-content tests so they validate the new file split and the retained behavior markers for settings boot flow, manual refresh, time-range handling, and footer links.

- [ ] **Step 2: Run full verification**
  Run: `go test ./...`
  Expected: all Go tests pass.

- [ ] **Step 3: Run static analysis**
  Run: `go vet ./...`
  Expected: exit code 0 with no findings.
