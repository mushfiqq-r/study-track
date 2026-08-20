# Offline Concept App desktop build

This project can run as a standalone Tauri desktop app. The desktop build uses the React/Vite frontend only, so it does not require the web server or an internet connection at runtime.

## Run locally during development

Install Node.js, pnpm, Rust, and the platform dependencies listed in the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/). Then run:

```bash
pnpm install
pnpm tauri dev
```

A desktop window should open with the app.

## Build an installer locally

Run:

```bash
pnpm tauri build
```

The installer files will be placed under `src-tauri/target/release/bundle/`. On Linux, this produces `.deb`, `.rpm`, and `.AppImage` files. Windows and macOS produce their platform-specific installer formats when built on those platforms.

## Build installers without installing Rust

The repository includes a manual GitHub Actions workflow at `.github/workflows/build-desktop.yml`. On GitHub, open the **Actions** tab, choose **Build desktop installers**, select **Run workflow**, and wait for the three platform builds to finish. Download the resulting artifacts from the workflow run.

## Offline limitations

The app stores its entries and settings in the local browser storage used by the desktop webview. Those data remain on the same computer, but they are not automatically synchronized with another computer. Login, maps, and image URLs that point to external services still require internet access unless those assets are replaced with local files.
