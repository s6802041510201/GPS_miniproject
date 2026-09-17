# Google Maps Setup

Geo-Attendance uses `expo-location` for real device location and `react-native-maps` for native map rendering. These are separate concerns:

- `expo-location` reads the device location and does not require a Google Maps API key.
- Google Maps API keys are required when a native build uses Google Maps tiles, especially Android release/development builds outside Expo Go.

## 1. Create restricted API keys

In Google Cloud:

1. Create or select a project.
2. Enable billing for the project.
3. Enable `Maps SDK for Android`.
4. Create an Android API key restricted to:
   - Application: Android apps
   - Package name: `com.kmutnb.geoattendance`
   - SHA-1: the fingerprint for the development or production signing certificate
5. If Google Maps is required on iOS, enable `Maps SDK for iOS` and create a separate iOS-restricted key for bundle ID `com.kmutnb.geoattendance`.
6. Restrict each key to only the Maps SDK it needs.

Never commit real keys to Git. The key must remain in a local `.env` file or in EAS environment variables.

## 2. Local development build

Copy `.env.example` to `.env` and replace the placeholders:

```text
GOOGLE_MAPS_ANDROID_API_KEY=your_android_key
GOOGLE_MAPS_IOS_API_KEY=your_ios_key
EXPO_ANDROID_PACKAGE=com.kmutnb.geoattendance
EXPO_IOS_BUNDLE_IDENTIFIER=com.kmutnb.geoattendance
```

Then create a native development build. Expo Go does not require additional Google Maps setup, but a native build is required to verify the configured key and signing certificate:

```powershell
cd mobile
npx eas login
npx eas build:configure
npx eas build --profile development --platform android
```

Install the generated development build on the Android device, start the Metro server, and open the app from the development build.

## 3. Preview and production builds

Set the same variables as EAS environment variables, then build with the matching profile:

```powershell
cd mobile
npx eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value "your_android_key" --environment preview --visibility sensitive
npx eas env:create --name GOOGLE_MAPS_ANDROID_API_KEY --value "your_android_key" --environment production --visibility sensitive
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

Use the production signing SHA-1 from the final EAS/Google Play signing credentials in the Android key restriction. A development SHA-1 and a Play App Signing SHA-1 are normally different keys and must be registered separately.

## 4. What is already configured in the app

- `expo-location` foreground permission is configured in `app.json`.
- The Map Check-in screen requests foreground permission before tracking.
- The screen tracks the current position with `watchPositionAsync` and removes the subscription when it closes.
- `react-native-maps` uses Google Maps on Android through `PROVIDER_GOOGLE`.
- `app.config.js` injects API keys into the `react-native-maps` config plugin only when environment variables are present.
- `eas.json` includes development, preview, and production build profiles.
