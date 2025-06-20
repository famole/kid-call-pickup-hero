# Mobile App

This directory contains the initial setup for the Kid Call Pickup Hero mobile application using **Expo** and **React Native**.

The mobile app shares the same Supabase backend as the web app. It can reuse hooks and services from `src/` once those are moved to a shared package.

## Getting Started

1. Ensure you have `npm` and `expo` CLI installed: `npm i -g expo-cli`.
2. Install dependencies:
   ```sh
   cd mobile
   npm install
   ```
3. Start the development server:
   ```sh
   npm run start
   ```

Use `npm run android` or `npm run ios` to open the app in an emulator or a connected device.

This is just a starting point; extend the code to implement the full pickup request flow.
