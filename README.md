# MOVEXA — your pocket gym coach

A single-page web app: 30-day full-body plans (gym, dumbbells or no equipment), guided workout player with voice cues, animated form demos, gym machine guide, weight and measurement tracking, personal records, badges, nutrition estimates, water tracker and reminders with sound.

## Download the Android app
**[⬇ Download MOVEXA.apk](https://github.com/filipovski95/movexa/releases/latest/download/MOVEXA.apk)** — works offline, reminders arrive as phone notifications.

On your Android phone: tap the link, open the downloaded file, and allow "Install unknown apps" for your browser when asked.

## Or use it in the browser
1. Open the app link (GitHub Pages) in Safari (iPhone) or Chrome (Android).
2. iPhone: tap **Share → Add to Home Screen**. Android: tap **⋮ → Install app / Add to Home screen**.

The offline coach answers common questions from `coach-kb.js`; add entries there to teach it more. Data is stored on your device (browser storage). Ask Coach (AI), account sync, Google Calendar and file downloads work only when the app is opened inside Claude.

## Before public launch
- Fill in the `LEGAL` settings at the top of the script in `index.html` (company name, address, email, governing law).
- Have a lawyer review the Terms, Privacy Policy, Consumer Health Data Notice and Health & Safety Disclaimer.
- Run a full trademark search for the name MOVEXA.

MOVEXA provides general fitness information, not medical advice.

## How the APK is built
Every push to `main` runs `.github/workflows/android.yml`, which wraps the app with Capacitor, bundles fonts for offline use, and publishes `MOVEXA.apk` to Releases. The included `android-res/debug.keystore` is a development key so updates install over earlier versions. Before publishing on Google Play, create a private release key and keep it out of the repository.
