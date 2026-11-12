# Getting the app onto iPhones (TestFlight)

Builds run on Expo's servers (EAS Build), so the Mac needs no Xcode and little disk space.
Needs a paid Apple Developer account ($99/year) and a free Expo account (expo.dev).

## One time

1. Enroll at developer.apple.com (or in the Apple Developer iPhone app) and wait for approval.
2. Make a free account at expo.dev.
3. On the Mac, in Terminal:

   ```
   cd ~/Downloads/Step-Competition-main/mobile
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

## Each new version

```
npx eas-cli@latest build -p ios --profile production --auto-submit
```

The first run asks you to sign in to Apple and lets EAS create the certificates and the
App Store Connect app for you (answer yes). The build takes about 15 to 30 minutes, then it
uploads to TestFlight on its own.

## Inviting friends

App Store Connect (appstoreconnect.apple.com) → the app → **TestFlight** → **External Testing**
→ add a group → turn on the **public link**. Anyone with the link installs the TestFlight app and
taps Install. The first external build gets a short Apple review (usually under a day).
