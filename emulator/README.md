# Firebase Emulator authentication prototype

This isolated prototype does not connect to Firebase production and is not imported by the React/Vite application. It creates only fake Auth users and Firestore documents when the emulator test script runs.

Run with `npm run test:firebase-emulator`. The runner copies the emulator-only rules to a temporary ASCII path (needed because the workspace path contains Vietnamese characters that the Firestore Emulator's Java process cannot open), writes an ephemeral emulator config, uses the demo project ID `demo-c38-emulator`, starts only the Auth and Firestore Emulators, then cleans up the temporary files. No Firebase Functions, real email delivery, production credentials, or deployment commands are used.

The rules in `firestore.emulator.rules` make `accountLinks/{uid}` read-only to clients. A trusted provisioning process must create each link and matching `users/{internalAccountId}` profile; that provisioning process is intentionally not implemented here. All mapped roles are restricted to their linked school in this prototype.

Firebase Auth's client password-reset API does not enforce that the account's email was previously marked verified. The emulator test therefore verifies that unverified identities cannot read their mapping or protected school data, but marks the stronger unverified-email recovery policy as TODO. Enforcing that policy requires a trusted backend; it must not be simulated as a client-side guarantee.

The production `firestore.rules`, existing admin/student services, and Local Storage are not used by this prototype.
