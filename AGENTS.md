# Agent Guidelines

- The touchscreen frontend must keep an accessible, high-contrast palette. When updating styles in `local/webapp/static/css/`, prefer color combinations with sufficient contrast for touch displays.
- The static mock pages in `local/static_mock/` must remain self-contained (inline CSS/JS only) and mirror the real Flask templates under `local/webapp/templates/`. Whenever you change a template or shared styling, update the corresponding mock so it stays visually and behaviorally aligned.
- Avoid reintroducing external asset imports (e.g. `@import` statements) inside the static mocks—they should open offline without additional files.
