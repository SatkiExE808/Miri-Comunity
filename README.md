# Miri Comunity

A mobile app for the Miri community: register an account, buy & sell items, send parcels or ask someone to help buy things for you, and book a motorcycle or car ride.

## Stack

- Expo (React Native) with TypeScript
- expo-router for file-based navigation
- AsyncStorage for local persistence (mock backend in v1)
- expo-image-picker for listing photos
- @expo/vector-icons (Ionicons)

Backend is **mocked locally** for now. Wiring it up to Supabase is the planned next step.

## Getting started

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app on your phone, or press `a` (Android emulator) / `i` (iOS simulator).

## Features (v1)

| Feature | Where |
| --- | --- |
| Register / login | `app/(auth)/` |
| Marketplace list + sell with image | `app/(tabs)/marketplace/` |
| Parcel delivery & help-to-buy | `app/(tabs)/services.tsx` |
| Motorcycle / car booking | `app/(tabs)/transport.tsx` |
| Profile + sign out | `app/(tabs)/profile.tsx` |

All data is stored on-device via AsyncStorage — uninstalling the app clears it.

## Building an APK

Expo builds APKs through **EAS Build** (Expo Application Services). The first build sets up the project on Expo's side; after that it's a one-liner.

### One-time setup

```bash
npm install
npm install -g eas-cli      # install the EAS CLI
eas login                   # sign in with your free Expo account
eas build:configure         # links this project to your Expo account
```

`eas build:configure` will fill in a `projectId` under `expo.extra.eas` in `app.json`. Commit that change.

### Build the APK (cloud — recommended)

```bash
npm run build:apk
```

This kicks off a cloud build using the `preview` profile in `eas.json` (which is set to `buildType: apk`). When it finishes, EAS prints a URL where you can download `application-<id>.apk` and install it on any Android device (enable "Install unknown apps" first).

### Build the APK locally (optional)

Only if you have Android Studio + JDK 17 installed:

```bash
npm run build:apk:local
```

The APK is written into the current directory.

### Production (Play Store)

The `production` profile in `eas.json` builds an `.aab` (Android App Bundle) which is what the Play Store requires:

```bash
eas build -p android --profile production
```

## Next steps

1. Replace `src/store/auth.tsx` and `src/store/data.tsx` with Supabase calls (auth, postgres tables, storage bucket for images).
2. Add chat between buyer/seller and rider/passenger.
3. Push notifications for order/ride status changes.
4. Map view for pickup/drop-off with `react-native-maps`.
