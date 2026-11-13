# BT Exam Prep – Firebase Spark (No Billing) Setup

This branch preserves the existing exam questions and explanations. It replaces the previous Blaze-only Cloud Functions integration with Firebase Authentication (email/password internally), Cloud Firestore, browser local storage, Firestore security rules and GitHub Pages. **Firebase Cloud Functions and Firebase Storage are NOT used.**

## Important differences from the former Blaze design

- Firebase's **Spark plan is free and needs no payment method**, but it has quotas. Check the Firebase usage dashboard often.
- Users enter **only a username, password and outlet**; the app generates a synthetic internal Firebase Authentication email. Real email is not collected.
- **No automatic password recovery is available** in this free design. A signed-in user can change password. Do not promise recovery codes unless a trusted backend is added.
- Compressed 96px profile photos are stored in each user's Firestore profile, not Firebase Storage (max ~24KB base64).
- No Cloud Functions, scheduled jobs, push notification delivery, or trusted server-side clock. In-app rank changes and admin requests appear when the app is in use.
- Scoring events are checked by Firestore rules against **admin-seeded answer keys**. Even with rules, an offline user can modify their local client or time; this is a motivation system, not cheat-proof certification.
- All-time, weekly and monthly points are stored in Firestore user documents and viewed in real time. **Live listeners of every user can consume a lot of free reads**, so monitor quotas.
- Weekly scoring starts Monday 00:00 Asia/Colombo. The monthly winner announcement appears from the **4th day** of the next month, after a 72-hour late-sync window.
- Attempts are limited to one ranked attempt per paper per Sri Lankan day. Repeating the paper remains possible as unranked practice.
- Scores earned offline are provisional until validated online. Scores that are more than 72 hours old, conflict with another attempt, or fail validation may not reach the ranking.
- Previously unfinished papers can sync between devices when online; local progress cannot appear on another device until the originating device reconnects.

## One-time configuration – no Firebase billing plan or Node.js required

### 1. Create the project

1. Open https://console.firebase.google.com and select **Add project**.
2. Keep the project on **Spark** (no billing account).
3. Open **Build > Authentication > Sign-in method > Email/Password**, enable **Email/Password** (do not enable Email link).
4. Open **Build > Firestore Database > Create database**. Choose Standard/Native mode and the location nearest users (e.g. Mumbai if available). Do not deploy with open test-mode rules.
5. Open **Project settings > General > Your apps > Add app > Web**. Register your app and copy the Firebase public config values.
6. Edit [firebase-config.js](firebase-config.js) in the GitHub repo. Replace the FOUR placeholder values with `apiKey`, `authDomain`, `projectId`, and `appId`. **Do not put passwords or secret keys in this file.**
7. Open **Firestore Database > Rules**, replace the text with the contents of [firestore.rules](firestore.rules) and click **Publish**. Check the rules deploy without errors.

Alternatively, if you use Firebase CLI locally:
```powershell
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```
The CLI is optional; the Firebase Console rules editor is sufficient.

### 2. Create the two administrators

**Before giving the site URL to employees**, register the two designated admin usernames through the app on the configured site:

- `indika`
- `udaya`

Use **new strong passwords**, NOT the passwords shared in previous chat messages. Passwords are case-sensitive; usernames are case-insensitive.

To grant the admin role manually:
1. In Firebase Console > Authentication > Users, open each newly registered user and copy their **UID**.
2. In Firestore Database > Data, create collection `admins`.
3. Create one document for each administrator where **Document ID equals that user's UID**, and add a boolean field `enabled` = `true`. The application uses document existence, not an editable client-side role flag.
4. Reload the app after granting the admin role.
5. Open **Profile > Approve outlet requests > Seed answer keys**. The administrator seeds the 214 actual answers from the existing question bank into private `answerKeys` documents. Do this **before test scoring**.

If the admin registration usernames were already taken, do not grant admin status to the unexpected accounts. Review accounts and resolve the conflict securely.

### 3. Test before handing out the link

- Register an ordinary test user; confirm the selected outlet and automatic login.
- Answer a correct question within 45 seconds: 25 points should be shown when 15 seconds remain.
- Answer incorrectly and allow a timeout: both earn 0.
- Resume a paper, including on a second device; make sure previous answers stay locked and the timer is not reset.
- Complete the same paper twice in one day; only the first ranked attempt should count.
- Go offline and answer more questions; reconnect and confirm pending scores are accepted.
- Change the outlet and verify only an admin can approve.
- Check weekly and all-time individual and outlet leaderboards.
- Test password change, profile photo and signing out.
- Watch Firestore **Usage** readings, particularly document reads and writes, on the Spark plan.

### 4. What to update in GitHub

The existing GitHub Pages URL remains https://udaya-saman.github.io/bt-exam/ . Updating the repo triggers the usual GitHub Pages deploy once changes are merged to the published branch. Your `main` branch is untouched by this setup branch until its pull request is merged.

The following files are maintained:
- `index.html`: original quiz with guarded account hooks and timer/answer safeguards; questions unchanged
- `js/bt-spark.js`: Spark-only login/profile/scoring/leaderboards UI
- `firebase-config.js`: public Firebase Web App settings (currently placeholders)
- `firestore.rules`: account, role, anti-duplicate scoring and outlet-approval rules
- `firebase.json`, `firestore.indexes.json`: optional Firebase CLI configuration
- `sw.js`: offline app shell and SDK cache
- `version.json`: update notification
- `images/`: default avatar and slots for manually supplied popup art

For manually supplied popup art, add:
- `images/overtake/you-overtook.png`
- `images/congratulations/monthly-champion.png`

Missing popup art falls back to readable text; the default avatar is already included.

## Limitations and data-safety notes

The app cannot deploy rules or make you an admin automatically; those actions must be completed in Firebase Console as the project owner. The GitHub connection does not provide access to your Firebase project.

This is **not** a complete recreation of the former server-backed package. In particular, scheduled push notifications, trusted server-side score aggregation, secure no-email password recovery, and infallible offline anti-cheating are not achievable with the pure Spark browser-only setup. Firestore offline quota usage and browser storage eviction still apply.

**No live Firebase project has been configured or tested yet.** Do not hand the app out until the above checks pass.


## Pizza Arena v3.1 – IMPORTANT NEW FIRESTORE RULES (13 November 2026)

**Before testing registration or scoring, re-publish the updated [firestore.rules](firestore.rules) in Firebase Console.** Rules uploaded to GitHub do not deploy to Firebase automatically. The app now stores private totals in `users/{uid}` and only publishes eligible totals in `publicRanks/{uid}`. Until new rules are published, leaderboard reads and score writes will be rejected.

### "Other" outlet / admin privacy

- Registration and outlet-change menus include **Other**.
- "Other" players still sign in, receive private score points, see points in **My Profile**, and can practice, but are excluded from weekly, all-time, outlet-average, crown, monthly champion and public podium.
- The two original administrator usernames (`indika`, `udaya`, case insensitive) are **always private**; their scores never enter the public list, including before the Firestore admin UID document is added.
- Any account with a Firestore `admins/{UID}` document (`enabled: true`) is also excluded from public score writes.
- When an admin approves changing an outlet to `Other`, the existing public rank document is deleted. If that person later returns to a regular outlet, their **new** ranked scores can appear, but their historical private points do not move to the public board.
- **For future admin promotions of accounts other than `indika` / `udaya`, manually delete that user's existing `publicRanks/{UID}` document in Firestore Console immediately when granting the admin role.** No paid Cloud Function is used to auto-remove records. Their later sign-in attempts removal as a fallback.
- Admins can continue to view the public leaderboard, but their own points are shown privately in **My Profile**.

### What to do right now

1. The GitHub app update is already handled by merging the PR once GitHub tests pass. No ZIP or command line needed.
2. Go to Firebase Console > Firestore Database > Rules and paste the latest [firestore.rules](firestore.rules), then press **Publish**.
3. Verify **Authentication > Sign-in method > Email/Password** is enabled; **Firestore Database** already exists; and `udaya-saman.github.io` is an authorized Authentication domain.
4. Register administrators `indika` and `udaya` using new strong passwords. Do not reuse passwords posted in chats.
5. From Firebase > Authentication > Users copy each account's UID. Create an `admins` collection with one UID-named document each and a Boolean field `enabled: true`.
6. After re-signing in, open Leaderboard > My Profile > Approve outlet requests > **Seed answer keys** (214 questions).
7. Test three accounts: **Other**, one eligible outlet, and an admin. Check the private totals increase for each, while **only the eligible account appears in weekly, all-time, outlet, podium and monthly rankings**.
8. Test outlet changes to/from **Other**, offline score queue sync, and rank-change mascot reactions.

### Theme / mascot

The app uses a Pizza Hut–inspired red, near-black, cream and warm-gold arcade theme. The original vector pizza mascot is stored in `images/mascot/pizza-champ.svg` and `images/mascot/pizza-challenge.svg`. Styles live in `css/pizza-game.css`. These are cached offline by the updated service worker. SVG artwork is original, not a licensed Pizza Hut trademark or character.

**Security note:** Client-reported offline answer timing is not proof against manipulated devices. Firestore validates scoring increments against answer keys but cannot provide server-verified elapsed times on Spark. Points are educational motivation, not an audit-grade certification system.
