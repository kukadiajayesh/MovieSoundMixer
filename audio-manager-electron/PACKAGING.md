# Packaging — installers for Windows / macOS / Linux

The app is an Electron shell around the React UI (`src/renderer`) and a
Node.js main process (`src/main`) that drives `ffmpeg`/`mkvmerge` as child
processes and keeps history in a local SQLite database. Packaging is handled
entirely by **electron-builder** (config lives in `package.json`'s `build`
key — there's no separate `electron-builder.yml`).

```
src/renderer (React, built by Vite)  ──┐
src/main (TypeScript, built by tsc)  ──┼─▶ dist/  ──▶ electron-builder ──▶ release/
assets/icon.{ico,icns,png}           ──┘
```

## Build from source

```bash
npm install
npm run build
```

Or, from the repo root, `build_installer.sh` (macOS/Linux) /
`build_installer.bat` (Windows) do the same thing with a bit of setup/error
handling around it - double-click, or run from a terminal.

This runs, in order: `vite build` (renderer → `dist/`), `tsc -p
tsconfig.main.json` (main process → `dist/main/`), then `electron-builder`,
which packages `dist/` + the production `node_modules` into the installers
below, written to `release/` (kept separate from `dist/`, which is the
*input* to packaging, not its output).

| OS | Installable artifact | Also produced |
|----|----------------------|----------------|
| Windows | `FFmpeg Audio Manager Setup <version>.exe` (NSIS, lets the user choose the install directory) | `FFmpeg Audio Manager <version>.exe` (portable, no install) |
| macOS | `FFmpeg Audio Manager-<version>.dmg` (Intel) / `FFmpeg Audio Manager-<version>-arm64.dmg` (Apple Silicon) | matching `.zip` for each architecture |
| Linux | `FFmpeg Audio Manager-<version>.AppImage` (any modern glibc distro, no install needed) | `.deb` for Debian/Ubuntu-based distros |

electron-builder **cannot cross-package for Windows or Linux from macOS (or
vice versa)** the way it can cross-build both mac architectures from one
Apple Silicon host — build each target on that OS, or use `npm run build:dir`
(builds the unpacked `release/<platform>-unpacked/` app without invoking any
installer target) for a quick local smoke test. The included GitHub Actions
workflow (`.github/workflows/build.yml`, at the repo root) builds all three
automatically.

## App icons

Icons live in `assets/` (`icon.ico` for Windows, `icon.icns` for macOS,
`icon.png` for Linux) and are wired into `package.json`'s `build.win.icon` /
`build.mac.icon` / `build.linux.icon`. All three are generated from one
1024×1024 master (`icon.png`) — regenerate with Pillow (`.ico`) and macOS's
`sips` + `iconutil` (`.icns`) if you change it; keep the filenames.

## CI builds for all platforms

GitHub Actions can build the installers and publish/attach them to a release automatically in two ways:

1. **Pushing a Git Tag:**
   ```bash
   git tag v1.2.0
   git push --tags
   ```
   This triggers the build and automatically creates a new GitHub Release with the build artifacts.

2. **Publishing a GitHub Release:**
   Creating and publishing a release directly from the GitHub UI will also automatically trigger the build workflow, which packages the application and attaches the resulting installers to that release.

The tag (`v1.2.0` → `1.2.0`) is written into `audio-manager-electron`'s
`package.json` before packaging, so it's what electron-builder stamps into
the installer metadata and artifact filenames. You can also trigger the
build manually from the Actions tab (`workflow_dispatch`) — that run
uploads artifacts but does not create a Release (releases happen only on
tag pushes), and keeps whatever version is currently committed in
`package.json`.

## Known gotchas (already handled in `package.json` / `src/main`)

- **`sqlite3` and `ffmpeg-static` must be real `dependencies`, not
  `devDependencies`.** The main process does a plain `require('sqlite3')` /
  `require('ffmpeg-static')` at runtime (it's compiled 1:1 by `tsc`, not
  bundled the way Vite bundles the renderer) — electron-builder only ships
  a package's **production** dependency tree into the packaged app, so
  either package sitting in `devDependencies` silently disappears from the
  installer and the packaged app crashes on launch with `Cannot find
  module`. `react`/`react-dom`/`zustand`/etc. are fine to stay in
  `devDependencies` precisely because Vite inlines them into
  `dist/assets/*.js` for the renderer instead of `require`-ing them at
  runtime.
- **`ffmpeg-static`'s bundled binary can't run from inside `app.asar`.**
  `require('ffmpeg-static')` returns a path computed from that package's own
  `__dirname`, which resolves *inside* the asar archive once packaged — and
  a binary can't be spawned as a child process from inside one.
  `build.asarUnpack` in `package.json` extracts the real file next to the
  archive under `app.asar.unpacked/`, and `src/main/ffmpeg/detector.ts`
  rewrites the path there (`.replace('app.asar', 'app.asar.unpacked')`,
  a no-op string replace in dev, where the path never contains `app.asar`).
  `sqlite3`'s compiled `.node` addon has the same asar restriction and is
  unpacked the same way.
- **`directories.output: "release"`** — electron-builder's default output
  directory is `dist`, which is also where Vite/tsc write the *input* to
  packaging. Left at the default, electron-builder would write installers
  into the same folder it's reading from, and a second build would then
  re-package the previous run's installer files as if they were app source.
  Kept as a separate `release/` folder instead.
- **Native module rebuilds** — `sqlite3` ships a compiled binding that must
  match Electron's Node ABI, not the system Node's. `postinstall: "electron-
  builder install-app-deps"` in `package.json` rebuilds it right after `npm
  install`, which matters for running the app in dev (`npm start`) as well
  as packaging (electron-builder also rebuilds automatically as part of
  `npm run build`, including separately for each macOS architecture).

## Code signing & distribution

No Apple Developer ID or Windows Authenticode certificate is configured, so:

- **macOS** — without a `CSC_LINK`/`CSC_NAME` (or a "Developer ID
  Application" identity in the build machine's keychain), electron-builder
  automatically falls back to **ad-hoc signing** (`codesign --sign -`).
  That's not optional to skip on Apple Silicon: an arm64 binary with no
  signature at all won't launch, ad-hoc or not. Ad-hoc signing satisfies
  that, but Gatekeeper still blocks the *unnotarized* app for anyone who
  didn't build it themselves — right-click → Open bypasses that for
  personal use; distributing more widely needs a real Apple Developer ID to
  sign and notarize with.
- **Windows** — SmartScreen warns on unsigned `.exe`s. An Authenticode
  certificate removes the warning.

For personal/internal use, signing is optional. For wider distribution, add
the certs and a signing step to `.github/workflows/build.yml`.
