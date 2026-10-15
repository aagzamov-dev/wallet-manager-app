# Android Builds and Updates

This guide explains how to make future Wallet Manager APKs while keeping the source project compatible with different Android phones and emulators.

## Available build profiles

### Xiaomi ARM64

```bash
npm run build:xiaomi
```

This uses the `xiaomi` profile in `eas.json`. It creates a signed release APK containing only the `arm64-v8a` native libraries and enables Android code and resource shrinking. It is the recommended personal build for a modern 64-bit Xiaomi phone.

The APK will not install on a 32-bit-only phone or an x86 Android emulator.

### Universal fallback

```bash
npm run build:apk
```

This uses the `preview` profile and includes the standard ARM and emulator architectures. It is larger, but it is the safest file for testing unknown devices or Android emulators.

### Universal production

```bash
npx eas-cli@latest build --platform android --profile production
```

This creates a universal signed release APK on the production update channel.

## Confirm a phone's processor architecture

Connect the phone with USB debugging enabled, then run:

```bash
adb shell getprop ro.product.cpu.abilist
```

When the result starts with `arm64-v8a`, the Xiaomi build is appropriate. If it does not include `arm64-v8a`, use the universal APK instead.

## Why the source remains universal

`app.config.js` checks the `ANDROID_BUILD_TARGET` environment value supplied only by the `xiaomi` EAS profile. It limits native libraries to ARM64 for that one build. Without this value, Expo uses its normal Android architecture list.

This means:

- Application code is shared by every build.
- The Xiaomi APK is smaller.
- Universal APKs can still be built later.
- x86 and x86_64 Android emulators remain supported by normal profiles.

Release code minification and unused-resource shrinking are enabled for all release builds. JavaScript bundle compression is intentionally left disabled because the bundle is relatively small and compression can slow application startup.

## Make a future version

Before building a new native release:

1. Increase `expo.version` in `app.json`, for example from `1.4.1` to `1.4.2`.
2. Increase `android.versionCode` in `app.json` by at least one.
3. Keep the Android package `com.mymoney.mobile` unchanged.
4. Keep using the same Expo project and Android signing key.
5. Run the quality checks.
6. Start the Xiaomi or universal build.

Also keep the version in `package.json` and `package-lock.json` aligned with the Expo app version.

## Install as an update

Download the APK from the EAS build page and open it on the phone. Android should offer **Update** when the package and signing key match and the new `versionCode` is higher.

With Android Debug Bridge, the equivalent command is:

```bash
adb install -r wallet-manager.apk
```

The `-r` option replaces the application while keeping its local data. Make an encrypted backup before an important update even though an in-place update normally preserves the database.

If Android reports an incompatible package or signature, do not uninstall when important data exists. Export a backup first, investigate the signing key, and only then decide whether reinstalling is necessary.

## Send a compatible over-the-air update

For JavaScript, styles, translations, and bundled images that do not change native code:

```bash
npm run update:production -- --message "Describe the update"
```

The Xiaomi profile uses the `production` channel. Because the runtime policy follows the app version, an update is delivered only to installations with the same compatible app version.

Use a new APK instead when changing:

- Expo SDK or React Native version
- Native packages or config plugins
- Android permissions
- Native icons or splash configuration
- Android package or other native build settings

## Build checklist

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run doctor
npx expo config --type public
```

After EAS finishes, check the build page, download the APK, install it as an update, and confirm that expenses and settings still open correctly in airplane mode.
