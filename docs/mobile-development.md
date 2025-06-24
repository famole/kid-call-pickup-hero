# Mobile Development

This guide explains how to start building the React Native version of Kid Call Pickup Hero.

## Git workflow

Create a separate branch for mobile work:

```sh
git checkout -b mobile
```

Commit changes to that branch and open a pull request when ready.

## Project setup

The `mobile/` directory contains a minimal Expo setup. Install dependencies and run the app:

```sh
cd mobile
npm install
npm run start
```

Use `npm run android` or `npm run ios` to test on emulators or devices.

The app uses the same Supabase credentials as the web version, provided through environment variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
Shared modules reference these values through `import.meta.env` or `process.env`, so the mobile `babel.config.js` enables the `unstable_transformImportMeta` option to transform `import.meta` for Hermes.
The Metro configuration also defines `nodeModulesPaths` so modules installed at the repo root (like `@supabase/supabase-js`) can be resolved when bundling the Expo app. The shared Supabase client checks both `process.env` and `import.meta.env` to avoid runtime errors when either is undefined.
