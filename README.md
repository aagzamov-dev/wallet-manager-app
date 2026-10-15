# My Money Manager

Private, Android-first personal finance app. All financial data stays on the phone in SQLite; the app has no backend, account, sync, or analytics. Network access is used only to download signed Expo app updates.

## Run locally

```bash
npm install
npx expo start
```

Use Expo Go for normal UI and data work. Use a development build when checking device biometrics and SecureStore behavior.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
npx expo export --platform android
```

## Private Android APK

Sign in once, configure the EAS project, then start the internal preview build:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile in `eas.json` produces an installable APK.

## Send app updates

The preview APK uses the `preview` update channel. For JavaScript, styling, translations, and image changes, keep the app version unchanged and publish:

```bash
npm run update:preview -- --message "Describe the update"
```

The update downloads automatically and is applied on the next app launch. Financial records are not uploaded.

Native dependency, permission, Expo SDK, or app icon changes require a new APK. Increase `expo.version` and `android.versionCode` in `app.json`, then run:

```bash
npm run build:apk
```

Installing the newly signed APK updates the existing app and preserves its local database because the Android package and signing key stay the same.

## Data and backups

- SQLite uses foreign keys, WAL mode, indexed queries, versioned migrations, and transactions.
- PIN verifiers and device-only safety keys are stored in SecureStore.
- `.mymoney` backups use PBKDF2-HMAC-SHA256 and AES-256-GCM.
- Portable `.json` backups are also available for manual inspection.
- PIN, biometric configuration, and device security keys are never exported.
# wallet-manager-app
