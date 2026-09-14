# Agent Instructions

## Project Areas

- Root Node.js files control the train and expose the WebSocket server.
- `web/` contains the React/Vite dashboard.
- `slides/` is an independent Slidev presentation project.

The root `README.md` is the source of truth for detailed behavior, hardware notes,
protocol details, and troubleshooting.

## Important Commands

- `npm run app:mock` runs the dashboard without Bluetooth hardware.
- `npm run app` runs the dashboard against the real train and can drive it.
- `node index.js --stationary` skips driving parts of the CLI showcase.
- `npm run build --prefix slides` builds the presentation.

## Hardware Safety

- Prefer mock mode or stationary mode during development.
- Do not run commands that may drive the physical train without checking first.
- Do not assume Bluetooth hardware is available.
- Real train tests require the train to be placed on a track or clear floor and may
  require Bluetooth permission for the terminal application on macOS.

## Conventions

- Preserve the existing JavaScript, JSX, Vue, and CSS style in each area.
- Keep hardware behavior and protocol explanations in `README.md` up to date.
- Update documentation when changing commands, WebSocket messages, or hardware
  behavior.
- Avoid adding dependencies unless they are needed by the relevant project area.

## Verification

- Use `npm run app:mock` to verify dashboard changes without hardware.
- Build the slides with `npm run build --prefix slides` after slide or presentation
  component changes.
- Test real Bluetooth behavior only when the hardware is available and it is safe
  to operate the train.
