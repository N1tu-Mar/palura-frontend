# Palura TTS (Expo React Native)

Minimal React Native (Expo) app that speaks a word using **expo-speech**.

## Prerequisites
- Node.js LTS
- `npm` or `yarn`
- Expo CLI (`npx expo` will auto-install if missing)

## Getting started
```bash
npm install
npm start
# then press: a (Android), i (iOS), or w (Web)
```

> Note: For a pure React Native CLI project (without Expo), use `react-native-tts` and native setup.

## Files
- `App.js` — UI + TTS using `expo-speech`
- `package.json` — scripts and dependencies
- `app.json` — app config
- `babel.config.js` — Babel preset for Expo

## Feature ideas
- Play/pause & progress indicator
- Voice/locale selector (en-GB, hi-IN)
- Queueing & phoneme highlighting
- Offline voice packs (native-only)
