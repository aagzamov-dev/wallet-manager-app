# Wallet Manager

Wallet Manager is a private, offline-first Android finance app for everyday money tracking. It is designed for fast one-handed expense entry and keeps financial records on the phone instead of requiring an account, subscription, or backend.

> **Status:** Active development. Android is the supported platform. Current app version: **1.4.1**.

## Why Wallet Manager exists

Many money apps require registration, send financial information to a server, or make simple expense entry feel slow. Wallet Manager takes a smaller and more private approach:

- Open the app and record an expense in a few seconds.
- Keep working without internet access.
- See wallet, income, expense, and loan information together.
- Own the data through portable local backups.
- Use a comfortable dark interface designed for a phone and one hand.

## Main features

- Opening wallet balance kept separate from earned income
- Quick expenses with formatted amounts such as `1 000 000`
- Daily, weekly, monthly, and custom-period filters
- Income history with search and category filters
- Personal loans with Give and Returned timelines
- Project payments with Upcoming, Overdue, Partial, and Received states
- Editable English and Uzbek categories
- UZS storage with optional USD display conversion
- Four-digit app PIN and optional Android device unlock
- Encrypted `.mymoney` and portable `.json` backups
- Manual Google Drive saving through Android's standard share menu
- Local error log in Settings for easier troubleshooting

The wallet balance is calculated as:

```text
opening balance + income - expenses - (loans given - loans returned)
```

## Privacy by design

Wallet Manager has:

- No account or registration
- No application backend
- No financial-data synchronization
- No advertising or analytics SDK
- No bank connection
- No Google OAuth or Google Drive API access
- No runtime internet requirement

Expenses, income, loans, categories, and preferences are stored in a private SQLite database on the device. Network access is optional and is used only to download a signed application or compatible EAS Update.

Uninstalling the app normally removes its local database and device-only secrets. Create an encrypted backup before uninstalling, resetting, or replacing the phone when the data matters.

## Security and backups

- The app uses a four-digit PIN with an in-app number pad.
- It can use fingerprint, face, or the Android device credential when supported.
- Only a salted PIN verifier is stored in SecureStore; the PIN is not stored directly.
- Repeated incorrect PIN attempts create increasing delays.
- Encrypted backups use AES-256-GCM.
- Backup keys are derived with PBKDF2-HMAC-SHA256 and random salt.
- Each encrypted export uses a new random IV.
- PIN, biometric settings, device keys, and internal security state are never exported.
- Restore validates the complete file before replacing any records.
- A failed or damaged import leaves the current database unchanged.

The recommended `.mymoney` backup is protected by a separate memorable password of at least eight characters. That password is saved only in Android SecureStore for convenient future exports and must still be remembered after reinstalling or moving to another phone.

### Save manually to Google Drive

1. Open **Settings → Backup & restore**.
2. Tap **Save encrypted backup**.
3. Select Google Drive from Android's share menu.
4. Choose a Drive folder and complete the upload.
5. Check that the file appears in Drive before deleting local data.

Google Drive handles the account and upload. Wallet Manager never receives a Google token and cannot browse, change, or delete Drive files.

Plain `.json` export is useful for portability and inspection, but it is readable. Do not place a plain JSON backup in shared or untrusted storage.

## Mobile experience

- Expenses open first after a cold launch or completed unlock.
- The quick composer requires only amount and category.
- Recent and frequently used categories remain within thumb reach.
- Amounts are grouped while typing for easier reading.
- Important actions use large touch targets and lower-screen placement.
- The interface uses comfortable dark slate surfaces instead of pure black.
- Overview, Expenses, and Income share clear period controls.
- Lists provide explicit loading, empty, retry, and error states.

## Local diagnostics

The **Error log** in Settings keeps the newest 100 application, database, loading, and save errors on the phone. It helps diagnose a problem without sending private data to a logging service. PIN and backup password values are filtered and are never intentionally written to the log.

## Updating without losing data

A new APK updates the installed app without uninstalling when it keeps all three of these:

- Android package: `com.mymoney.mobile`
- The same EAS signing key
- A higher Android `versionCode`

An in-place update preserves the local SQLite database. Creating an encrypted backup before a major update is still recommended.

JavaScript, styles, translations, and bundled image changes can use EAS Update when the installed runtime version matches. Native dependencies, permissions, Expo SDK changes, and native app configuration require a new APK.

## Android build options

The source project stays universal. Build profiles decide which APK is produced:

| Profile | Devices | Purpose |
| --- | --- | --- |
| `xiaomi` | 64-bit ARM Android phones | Smaller personal APK with code/resource shrinking |
| `preview` | ARM and Android emulators | Universal fallback APK for testing and sharing |
| `production` | ARM and Android emulators | Universal signed release APK |

The `xiaomi` profile includes only `arm64-v8a`. Normal builds include Expo's standard Android architectures, so the codebase has not been restricted to one phone.

See [Android builds and updates](docs/ANDROID_BUILDS.md) for future releases, architecture checks, installation, and update rules.

## Technology

- React Native 0.86 and TypeScript
- Expo SDK 57 and Expo Router
- Expo SQLite, SecureStore, Local Authentication, Crypto, FileSystem, and Sharing
- TanStack Query
- React Hook Form and Zod
- Jest and Expo ESLint
- EAS Build and EAS Update

## Project structure

```text
wallet-manager-app/
├── assets/              App icons and images
├── docs/                Build and maintenance guides
├── src/
│   ├── app/             Screens and Expo Router navigation
│   ├── backup/          Export, encryption, validation, and restore
│   ├── components/      Shared native UI components
│   ├── data/            SQLite setup, migrations, and repositories
│   ├── domain/          Finance calculations and domain types
│   ├── errors/          Local diagnostics and error boundary
│   ├── i18n/            English and Uzbek translations
│   ├── security/        PIN, device unlock, and session handling
│   └── theme/           Dark design tokens
├── app.config.js        Conditional native build optimization
├── app.json             Expo identity and Android configuration
├── eas.json             EAS build profiles
└── package.json
```

## Contributing

Issues and focused pull requests are welcome.

1. Preserve the offline-first privacy model.
2. Follow the existing TypeScript, Expo Router, and feature structure.
3. Add or update tests for financial calculations, storage, import, or security changes.
4. Avoid backends, trackers, unnecessary permissions, and large dependencies unless discussed first.
5. Run the project checks before opening a pull request.

Please report security issues privately to the repository owner instead of publishing exploit details in a public issue.

## Run the project

### Requirements

- Node.js and npm
- An Android phone or emulator
- Expo Go for normal UI and local-data development
- An Expo development build for complete biometric and SecureStore testing

### Install and start

```bash
git clone https://github.com/aagzamov-dev/wallet-manager-app.git
cd wallet-manager-app
npm install
npx expo start
```

### Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
```

### Build Android APKs

```bash
# Smaller APK for a 64-bit ARM Xiaomi phone
npm run build:xiaomi

# Universal fallback APK
npm run build:apk
```

## License

Wallet Manager is available under the [MIT License](LICENSE).
