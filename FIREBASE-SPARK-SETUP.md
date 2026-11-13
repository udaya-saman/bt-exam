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

## Pizza Arena 3.2 – mascots, silent warning, achievements, and activity review

This release includes ten consistent original pizza-mascot states in `images/mascot/pizza-*.svg`, all using the same cap and Pizza Hut mark. The states are **welcome, rank-up, overtaken, timer, correct, wrong, monthly, crown, private, and update**. Replacing any illustration later does not require changing quiz data.

- **Timer:** A silent, transparent-to-touch SVG/CSS mascot appears once when a question enters its last **15 seconds**, then disappears automatically. It has no modal backdrop, sound, or focus changes. Reduced-motion accessibility is supported.
- **Answer feedback:** Correct, incorrect and timeout feedback show a small matching mascot.
- **Levels and badges:** The profile displays a 500-points-per-level meter, points milestones, verified correct-answer rewards (10, 50, 100), daily streaks (3, 7, 14), a 50-question weekly challenge, 20-question outlet contribution, and the **Crown Squad** badge for members of the qualifying leading outlet.
- **Streaks:** Days are calculated in **Asia/Colombo** time and only from confirmed Firestore answer events. The current streak may include yesterday if no answer has been recorded yet today.
- **Review only:** Seven consecutive confirmed correct answers with 58–60 seconds remaining set a **reviewSuggested** flag. This does not remove points, disqualify users, or establish cheating. Admins can open **Review activity flags** and clear the flag after checking. Client-controlled offline timing cannot be used as proof.
- **Leaderboard traffic:** A live Firestore listener is opened only while the leaderboard is displayed. The UI shows the top 20 and the viewer's own position, with **View All** to display everyone. For accurate weekly and outlet calculations, the current implementation still downloads eligible public ranking documents while the leaderboard is open, so monitor Spark document reads as usage grows.
- **Cross-device resume:** Incomplete exam snapshots are now sent to `savedSessions/{uid}` at most once per approximately 12 seconds while a user is online. Offline progress stays local until a successful connection. Only the account owner can read saved questions.

### IMPORTANT: Publish updated Firestore rules again

The new scoring fields (`correctAnswers`, `dailyActivity`, `rapidCorrectStreak`, `reviewSuggested`, and `scoreEvents.activityDay`) require the new rules. **GitHub Pages deployment does not update the Firebase Console rules.**

1. Open [Firebase Firestore Rules](https://console.firebase.google.com/project/btexam-c1e63/firestore/rules).
2. Open the repository's [firestore.rules](https://github.com/udaya-saman/bt-exam/blob/main/firestore.rules).
3. Copy all the rule text into Firebase and click **Publish**.
4. Confirm that Authentication/Email-Password and the authorized domain `udaya-saman.github.io` are enabled.
5. Register `indika` and `udaya` with NEW, strong, case-sensitive passwords. Locate their UIDs under Firebase Authentication > Users.
6. In Firestore Data, create `admins/{UID}` documents for both accounts with field `enabled` (Boolean) = `true`.
7. Sign out, sign back in as either administrator, then open **Leaderboard > My Profile > Approve outlet requests > Seed answer keys**. The current source includes 214 questions.
8. Test registration and ranking with an ordinary outlet user and `Other`. Neither `Other` nor administrator scores should appear in the public leaderboard, though both retain private totals.

### Production limitations

Live Firebase authentication, scoring, writes, quotas, and mobile performance still require tests against the actual project and devices. Security rules can validate score arithmetic and flag patterns, but cannot reliably prove elapsed time in an offline, browser-controlled exam. Keep the Cloud Firestore **Spark plan** and watch free usage limits. If real users have accumulated points on an older release, do not replace or discard those documents; the new achievement counters begin recording with new confirmed answers.


## Version 3.3: Administrator user removal – TWO confirmation steps

Once both administrator accounts are registered and granted `admins/{UID}` with `enabled: true`, an admin can open **Leaderboard → My Profile → Approve outlet requests → Manage users** and search by username or outlet. The app shows a **DELETE** control for eligible, non-admin accounts.

1. First confirmation is a warning dialog explaining what will happen.
2. Second confirmation asks the administrator to type **`DELETE username`** exactly and re-enter **their own administrator password**. The password is only used for Firebase reauthentication; it is not stored in Firestore.
3. On successful confirmation, a single Firestore transaction adds an immutable `accountBlocks/{UID}` record, removes the user's `users/{UID}` private profile, releases their `usernames/{usernameLower}` claim, and removes their `publicRanks/{UID}` record when present.
4. The old Firebase Authentication identity is blocked from accessing BT Exam data by the new security rules and signs out on next sign-in. The deleted user cannot simply sign in to resume their account.
5. **Final permanent Auth deletion still requires you to go to Firebase Console → Authentication → Users and delete the original UID.** The app shows the UID after removal so you can find it. Do **not** delete other users by mistake. Firebase Spark does not let ordinary browser code securely invoke the privileged Admin SDK to delete another user's Auth identity.

The deleted UID's `accountBlocks` record is deliberately retained to prevent reactivation and record which administrator removed access. Other historical collections (past `scoreEvents`, `rankedClaims`, `savedSessions`, previous `outletRequests`) are not automatically purged. Their data is inaccessible to blocked users under updated rules, but **full data-erasure requests still require owner-supervised cleanup in Firebase Console or trusted administrative tools**. Do not describe in-app deletion as complete legal-grade personal-data erasure.

**Protection:** Neither signed-in administrators nor accounts named `indika` or `udaya` can be removed through this app. All administrators with an `admins/{UID}` document are protected at the database-rule level. Network access is required. Errors abort the transaction with no partial deletion.

**Publish the NEW Firestore rules from this version before using Manage users.** Changing GitHub alone does not change Firebase security rules. The owner must copy the full current `firestore.rules` into Firestore Database → Rules → Publish.

For safety, first test this feature with a disposable `Other` test account, not a real employee account.

## Version 3.4 – Sticker mascots, reliable scoring and redesigned home

This release preserves every question and answer. It replaces the on-screen mascot SVG characters with a **single compressed WebP sprite created from your uploaded sticker sheet**, mapped to welcome, rank up, overtaken, timer, correct, incorrect, monthly, crown, private and update reactions. The sprite adapter lives in `js/bt-mascot-sprite.js`; the brand-red arcade home and button changes are in `css/pizza-v34.css`.

**Important scoring change:** Answer points are displayed immediately as a simple animated point count beside the mascot. A user's player card shows their confirmed total plus device-local unsynchronised results, including total answers and correct answers. Local results are not guaranteed to be accepted by Firestore; the player card now gives a separate sync-status explanation. Failed Firestore submissions are **retained**, not silently deleted. Verified rewards still use confirmed points.

### Required Firebase actions to make scores permanent

1. Open <https://console.firebase.google.com/project/btexam-c1e63/firestore/rules> and publish the latest `firestore.rules` from the GitHub repository. This version corrects a Monday-based weekly-date validation error.
2. Register `indika` and `udaya` if they do not already exist. Use strong, new passwords.
3. In Firebase Authentication > Users, copy each UID. In Firestore, create `admins/{UID}` with `enabled` Boolean `true` for both accounts.
4. Log in as an admin, open **Leaderboard → My Player Card → Approve outlet requests → Seed answer keys**. This operation creates private answer-key documents. Without those documents, **Firestore will reject all score events**, though locally earned points are displayed and saved for retry.
5. On the test `udaya` account, open My Player Card and press green **Sync**. Verify that the answer count and correct-answer total remain after refreshing or logging in on another device. Run the same test with one `Other` and one ranked-outlet account.
6. If sync still reports an error, preserve the browser's local data and share the error message (never credentials). Do not clear site data until it is resolved.

### User interface and behaviour

- **Back** is removed during the quiz because answered questions are intentionally locked. Answer review remains available on the results screen.
- **My Player Card** sends an outlet-change approval request after the outlet dropdown is changed and confirmed; there is no permanent Submit button.
- **Leaderboard**, **Sync** and profile navigation actions are green. **Sign out**, **Close** and Cancel actions are red.
- Private accounts no longer get an explanatory English banner about public rankings.
- The original paper data and question explanations remain unchanged, while the home uses modern game-like challenge cards and a mascot banner.

### Remaining considerations

The app still requires a live Firebase/Firestore test with seeded answer keys. GitHub Actions syntax and rules compilation alone do not prove that writes pass a real security-rules evaluation. The Spark free plan has document-read and write quotas. Time-based bonus points cannot be made cheat-proof in a fully offline browser; do not use this leaderboard as a certification audit record. If a user's results are older than the 72-hour acceptance window, this version keeps them locally for administrator-assisted review rather than silently deleting them.

For future improvements, consider secure export/backup of unsynchronised scores, additional topic-based learning materials, clearer error diagnostics, and a separate administrator audit process. These should be approved and designed before modifying existing exam data.
