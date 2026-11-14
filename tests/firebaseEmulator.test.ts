import { readFile } from "node:fs/promises";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp,
  type App as FirebaseAdminApp,
} from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
  applyActionCode,
  confirmPasswordReset,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  connectFirestoreEmulator,
  deleteDoc,
  documentId,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  getFirestore,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import {
  createFirebaseAdminAuthService,
  type AdminAuthSession,
} from "../src/services/firebaseAdminAuthService";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "demo-c38-emulator";
const API_KEY = "emulator-only-api-key";
const AUTH_EMULATOR_ADDRESS = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const AUTH_EMULATOR_URL = AUTH_EMULATOR_ADDRESS.startsWith("http")
  ? AUTH_EMULATOR_ADDRESS
  : `http://${AUTH_EMULATOR_ADDRESS}`;
const [FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT_TEXT] = (
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"
).split(":");
const FIRESTORE_EMULATOR_PORT = Number(FIRESTORE_EMULATOR_PORT_TEXT);
const SUPER_ADMIN_UID = "m7cPasleY9VECYBCEvaauVdEF6Mq";
const SUPER_ADMIN_EMAIL = "tangngocdien@gmail.com";
const SUPER_ADMIN_SCHOOL_ID = "school-thcs-quang-chau";
const FAKE_PASSWORD = "EmulatorOnly-Password-123!";
const FAKE_RESET_PASSWORD = "EmulatorOnly-Reset-456!";

interface FakeAccount {
  internalAccountId: string;
  email: string;
  role: "super_admin" | "admin" | "teacher" | "student";
  schoolId: string;
  uid: string;
  classId?: string;
}

async function verifyFakeEmail(auth: Auth, user: User): Promise<void> {
  await sendEmailVerification(user);
  const verificationCode = await getOutOfBandCode(user.email!, "VERIFY_EMAIL");
  if (!verificationCode) throw new Error("No fake verification action was returned by the Auth Emulator.");
  await applyActionCode(auth, verificationCode);
  await reload(user);
  if (!user.emailVerified) throw new Error("Fake email verification did not complete in the Auth Emulator.");
}

async function getOutOfBandCode(email: string, requestType: string): Promise<string | undefined> {
  const response = await fetch(`${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  if (!response.ok) throw new Error("Could not read fake email actions from the Auth Emulator.");

  const result = await response.json() as {
    oobCodes?: Array<{ email: string; oobCode: string; requestType: string }>;
  };
  return result.oobCodes?.find((code) => code.email === email && code.requestType === requestType)?.oobCode;
}

function fakeLink(account: FakeAccount) {
  return {
    authUid: account.uid,
    internalAccountId: account.internalAccountId,
    role: account.role,
    schoolId: account.schoolId,
    status: "active",
    createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
    linkedBy: "emulator-fixture",
    ...(account.classId ? { classId: account.classId } : {}),
  };
}

function fakeAuthorizationSnapshot(
  data: Record<string, unknown>,
  fromCache: boolean
): DocumentSnapshot<DocumentData> {
  return {
    metadata: { fromCache, hasPendingWrites: false },
    exists: () => true,
    data: () => data,
  } as DocumentSnapshot<DocumentData>;
}

function missingAuthorizationSnapshot(): DocumentSnapshot<DocumentData> {
  return {
    metadata: { fromCache: false, hasPendingWrites: false },
    exists: () => false,
    data: () => undefined,
  } as DocumentSnapshot<DocumentData>;
}

function createAuthorizationWatchHarness() {
  const watchers = new Map<string, {
    onNext: (snapshot: DocumentSnapshot<DocumentData>) => void;
    onError: (error: Error) => void;
  }>();
  return {
    watchDocument(
      reference: DocumentReference<DocumentData>,
      onNext: (snapshot: DocumentSnapshot<DocumentData>) => void,
      onError: (error: Error) => void
    ): Unsubscribe {
      const watcher = { onNext, onError };
      watchers.set(reference.path, watcher);
      return () => {
        if (watchers.get(reference.path) === watcher) watchers.delete(reference.path);
      };
    },
    emit(referencePath: string, data: Record<string, unknown>, fromCache: boolean): void {
      watchers.get(referencePath)?.onNext(fakeAuthorizationSnapshot(data, fromCache));
    },
    emitMissing(referencePath: string): void {
      watchers.get(referencePath)?.onNext(missingAuthorizationSnapshot());
    },
    fail(referencePath: string, error: Error): void {
      watchers.get(referencePath)?.onError(error);
    },
  };
}

function observeAuthSession(service: ReturnType<typeof createFirebaseAdminAuthService>) {
  let currentState: AdminAuthSession = { status: "loading" };
  const pending: Array<{
    predicate: (state: AdminAuthSession) => boolean;
    resolve: (state: AdminAuthSession) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  const unsubscribe = service.subscribe((state) => {
    currentState = state;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const waiter = pending[index];
      if (!waiter.predicate(state)) continue;
      clearTimeout(waiter.timer);
      pending.splice(index, 1);
      waiter.resolve(state);
    }
  });

  return {
    unsubscribe,
    get currentState() {
      return currentState;
    },
    waitFor(predicate: (state: AdminAuthSession) => boolean, description: string) {
      if (predicate(currentState)) return Promise.resolve(currentState);
      return new Promise<AdminAuthSession>((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = pending.findIndex((waiter) => waiter.resolve === resolve);
          if (index >= 0) pending.splice(index, 1);
          reject(new Error(`Timed out waiting for ${description}.`));
        }, 10000);
        pending.push({ predicate, resolve, timer });
      });
    },
  };
}

function byUid(accounts: FakeAccount[], internalAccountId: string): FakeAccount {
  const account = accounts.find((item) => item.internalAccountId === internalAccountId);
  if (!account) throw new Error(`Missing fake account: ${internalAccountId}`);
  return account;
}

test("Firebase Authentication and Firestore Emulator authorization", async (t) => {
  let environment: RulesTestEnvironment | undefined;
  let authApp: FirebaseApp | undefined;
  let adminApp: FirebaseAdminApp | undefined;
  let auth: Auth | undefined;
  let authDb: Firestore | undefined;

  try {
    const rules = await readFile(new URL("../firestore.emulator.rules", import.meta.url), "utf8");
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: FIRESTORE_EMULATOR_HOST,
        port: FIRESTORE_EMULATOR_PORT,
      },
    });

    authApp = initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID }, "auth-emulator-tests");
    auth = getAuth(authApp);
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    authDb = getFirestore(authApp);
    connectFirestoreEmulator(authDb, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
    const firebaseAdminAuth = createFirebaseAdminAuthService(auth, authDb);

    await environment.clearFirestore();
    const fixtures: Array<Omit<FakeAccount, "uid">> = [
      {
        internalAccountId: "super-admin-root",
        email: SUPER_ADMIN_EMAIL,
        role: "super_admin",
        schoolId: SUPER_ADMIN_SCHOOL_ID,
      },
      {
        internalAccountId: "fake-admin",
        email: "admin@example.test",
        role: "admin",
        schoolId: "fake-school-a",
      },
      {
        internalAccountId: "fake-teacher-a",
        email: "teacher-a@example.test",
        role: "teacher",
        schoolId: "fake-school-a",
      },
      {
        internalAccountId: "fake-teacher-b",
        email: "teacher-b@example.test",
        role: "teacher",
        schoolId: "fake-school-b",
      },
      {
        internalAccountId: "fake-student-9a",
        email: "student-9a@example.test",
        role: "student",
        schoolId: "fake-school-a",
        classId: "fake-class-9a",
      },
      {
        internalAccountId: "fake-student-9b",
        email: "student-9b@example.test",
        role: "student",
        schoolId: "fake-school-a",
        classId: "fake-class-9b",
      },
      {
        internalAccountId: "fake-student-school-b",
        email: "student-school-b@example.test",
        role: "student",
        schoolId: "fake-school-b",
        classId: "fake-class-9a",
      },
    ];

    const accounts: FakeAccount[] = [];
    const rootFixture = fixtures.find((fixture) => fixture.internalAccountId === "super-admin-root");
    if (!rootFixture) throw new Error("Missing isolated Super Admin fixture.");
    process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_ADDRESS.replace(/^https?:\/\//, "");
    adminApp = initializeAdminApp({ projectId: PROJECT_ID }, "auth-emulator-admin-tests");
    const rootUser = await getAdminAuth(adminApp).createUser({
      uid: SUPER_ADMIN_UID,
      email: rootFixture.email,
      password: FAKE_PASSWORD,
      emailVerified: true,
    });
    accounts.push({ ...rootFixture, uid: rootUser.uid });

    for (const fixture of fixtures.filter((item) => item.internalAccountId !== "super-admin-root")) {
      const credential = await createUserWithEmailAndPassword(auth, fixture.email, FAKE_PASSWORD);
      await verifyFakeEmail(auth, credential.user);
      accounts.push({ ...fixture, uid: credential.user.uid });
    }

    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all(
        accounts.map(async (account) => {
          await setDoc(doc(firestore, "users", account.internalAccountId), {
            role: account.role,
            schoolId: account.schoolId,
            status: "active",
            authUid: account.uid,
            contactEmail: account.email,
            fullName: account.internalAccountId,
          });
          await setDoc(doc(firestore, "accountLinks", account.uid), fakeLink(account));
        })
      );
      await Promise.all(
        ["fake-school-a", "fake-school-b"].map((schoolId) =>
          setDoc(doc(firestore, "schools", schoolId), { schoolId, name: "Fake school" })
        )
      );
      await Promise.all([
        setDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample"), {
          schoolId: "fake-school-a",
          value: "fake",
        }),
        setDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample"), {
          schoolId: "fake-school-b",
          value: "fake",
        }),
        setDoc(doc(firestore, "schoolData", "fake-school-a", "records", "student-9a"), {
          schoolId: "fake-school-a",
          classId: "fake-class-9a",
          ownerUid: byUid(accounts, "fake-student-9a").uid,
          value: "fake student record",
        }),
        setDoc(doc(firestore, "schoolData", "fake-school-a", "records", "student-9b"), {
          schoolId: "fake-school-a",
          classId: "fake-class-9b",
          ownerUid: byUid(accounts, "fake-student-9b").uid,
          value: "fake student record",
        }),
        setDoc(doc(firestore, "schoolData", "fake-school-b", "records", "student-school-b"), {
          schoolId: "fake-school-b",
          classId: "fake-class-9a",
          ownerUid: byUid(accounts, "fake-student-school-b").uid,
          value: "fake student record",
        }),
      ]);
    });

    const byInternalId = (id: string) => accounts.find((item) => item.internalAccountId === id)!;
    const scopedFirestore = (account: FakeAccount, emailVerified = true) =>
      environment!.authenticatedContext(account.uid, {
        email: account.email,
        email_verified: emailVerified,
      }).firestore();
    const waitForSessionState = (
      service: ReturnType<typeof createFirebaseAdminAuthService>,
      predicate: (state: AdminAuthSession) => boolean,
      description: string
    ) => new Promise<AdminAuthSession>((resolve, reject) => {
      let unsubscribe: () => void = () => {};
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timed out waiting for ${description}.`));
      }, 10000);
      unsubscribe = service.subscribe((state) => {
        if (!predicate(state)) return;
        clearTimeout(timer);
        unsubscribe();
        resolve(state);
      });
    });

    await t.test("fake user can sign in and access its own mapped account", async () => {
      await signOut(auth!);
      const result = await signInWithEmailAndPassword(auth!, SUPER_ADMIN_EMAIL, FAKE_PASSWORD);
      await reload(result.user);
      assert.equal(result.user.uid, SUPER_ADMIN_UID);
      assert.equal(result.user.emailVerified, true);

      const mapping = await getDoc(doc(authDb!, "accountLinks", result.user.uid));
      assert.equal(mapping.exists(), true);
      assert.equal(mapping.data()?.internalAccountId, "super-admin-root");
    });

    await t.test("Firebase Auth Super Admin login requires the designated UID and matching profile", async () => {
      await signOut(auth!);
      const user = await firebaseAdminAuth.signIn(SUPER_ADMIN_EMAIL, FAKE_PASSWORD);
      assert.equal(user.id, "super-admin-root");
      assert.equal(user.role, "super_admin");
      assert.equal(user.email, SUPER_ADMIN_EMAIL);
      assert.equal(user.schoolId, SUPER_ADMIN_SCHOOL_ID);
      assert.equal(auth!.currentUser?.uid, SUPER_ADMIN_UID);
      await firebaseAdminAuth.signOut();
    });

    await t.test("Firebase Auth rejects a Super Admin profile outside the fixed school", async () => {
      const root = byInternalId("super-admin-root");
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", root.internalAccountId), {
          schoolId: "fake-school-a",
        })
      );
      try {
        await assert.rejects(firebaseAdminAuth.signIn(root.email, FAKE_PASSWORD));
        assert.equal(auth!.currentUser, null);
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          updateDoc(doc(context.firestore(), "users", root.internalAccountId), {
            schoolId: SUPER_ADMIN_SCHOOL_ID,
          })
        );
      }
    });

    await t.test("Firebase Auth teacher login resolves to the teacher portal role", async () => {
      await signOut(auth!);
      const user = await firebaseAdminAuth.signIn("teacher-a@example.test", FAKE_PASSWORD);
      assert.equal(user.id, "fake-teacher-a");
      assert.equal(user.role, "teacher");
      assert.equal(user.schoolId, "fake-school-a");
      await firebaseAdminAuth.signOut();
    });

    await t.test("Firebase Auth session restoration and sign-out update the observer", async () => {
      await signOut(auth!);
      await signInWithEmailAndPassword(auth!, "teacher-a@example.test", FAKE_PASSWORD);
      const restored = await waitForSessionState(
        firebaseAdminAuth,
        (state) => state.status === "authenticated",
        "authenticated Firebase session"
      );
      assert.equal(restored.status, "authenticated");
      if (restored.status === "authenticated") assert.equal(restored.user.id, "fake-teacher-a");

      const signedOut = waitForSessionState(
        firebaseAdminAuth,
        (state) => state.status === "signed_out",
        "Firebase sign-out"
      );
      await firebaseAdminAuth.signOut();
      assert.equal((await signedOut).status, "signed_out");
    });

    await t.test("cached mapping and profile are not accepted when server verification is unavailable", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      await signInWithEmailAndPassword(auth!, teacher.email, FAKE_PASSWORD);
      await getDocFromServer(doc(authDb!, "accountLinks", teacher.uid));
      await getDocFromServer(doc(authDb!, "users", teacher.internalAccountId));
      await signOut(auth!);
      const cachedDataOnlyService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async () => {
          throw Object.assign(new Error("Simulated offline server read"), { code: "unavailable" });
        },
      });

      await assert.rejects(cachedDataOnlyService.signIn(teacher.email, FAKE_PASSWORD));
      assert.equal(auth!.currentUser, null);
    });

    await t.test("server profile read unavailable after a valid mapping does not grant access", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      let serverReadCount = 0;
      const profileUnavailableService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async (reference) => {
          serverReadCount += 1;
          if (serverReadCount === 1) return getDocFromServer(reference);
          throw Object.assign(new Error("Simulated Firestore outage"), { code: "unavailable" });
        },
      });

      await assert.rejects(profileUnavailableService.signIn(teacher.email, FAKE_PASSWORD));
      assert.equal(serverReadCount, 2);
      assert.equal(auth!.currentUser, null);
    });

    await t.test("permission-denied server reads do not grant access", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const deniedService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async () => {
          throw Object.assign(new Error("Simulated Firestore denial"), { code: "permission-denied" });
        },
      });

      await assert.rejects(deniedService.signIn(teacher.email, FAKE_PASSWORD));
      assert.equal(auth!.currentUser, null);
    });

    await t.test("permission-denied listener errors revoke the active Firebase session", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor(
        (state) => state.status === "authenticated",
        "authenticated session before permission-denied listener error"
      );
      const revokedState = observer.waitFor(
        (state) => state.status === "error",
        "permission-denied listener revocation"
      );
      try {
        watch.fail(
          `accountLinks/${teacher.uid}`,
          Object.assign(new Error("Access denied"), { code: "permission-denied" })
        );
        assert.equal((await revokedState).status, "error");
        assert.equal(auth!.currentUser, null);
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("unavailable listener errors block app access without trusting the old view model", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor(
        (state) => state.status === "authenticated",
        "authenticated session before unavailable listener error"
      );
      const blockedState = observer.waitFor(
        (state) => state.status === "error",
        "unavailable listener access block"
      );
      try {
        watch.fail(
          `accountLinks/${teacher.uid}`,
          Object.assign(new Error("Network unavailable"), { code: "unavailable" })
        );
        assert.equal((await blockedState).status, "error");
        assert.notEqual(auth!.currentUser, null);
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("restored Auth session stays blocked when Firestore is unavailable", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      await signInWithEmailAndPassword(auth!, teacher.email, FAKE_PASSWORD);
      const unavailableService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async () => {
          throw Object.assign(new Error("Simulated Firestore outage"), { code: "unavailable" });
        },
      });

      const blocked = await waitForSessionState(
        unavailableService,
        (state) => state.status === "error",
        "blocked session after unavailable error"
      );
      assert.equal(blocked.status, "error");
      assert.notEqual(auth!.currentUser, null);
      await unavailableService.signOut();
    });

    await t.test("restored session requires server verification again after offline recovery", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      await signInWithEmailAndPassword(auth!, teacher.email, FAKE_PASSWORD);
      const watch = createAuthorizationWatchHarness();
      let firestoreAvailable = false;
      const offlineRestoreService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async (reference) => {
          if (!firestoreAvailable) {
            throw Object.assign(new Error("Simulated Firestore outage"), { code: "unavailable" });
          }
          return getDocFromServer(reference);
        },
        watchDocument: watch.watchDocument,
      });
      const profile = (await getDocFromServer(doc(authDb!, "users", teacher.internalAccountId))).data();
      assert.ok(profile);
      const observer = observeAuthSession(offlineRestoreService);
      const blockedState = await observer.waitFor(
        (state) => state.status === "error",
        "offline restored-session block"
      );
      try {
        assert.equal(blockedState.status, "error");
        assert.notEqual(auth!.currentUser, null);

        const restoredState = observer.waitFor(
          (state) => state.status === "authenticated",
          "server-confirmed restored session"
        );
        firestoreAvailable = true;
        watch.emit(`accountLinks/${teacher.uid}`, fakeLink(teacher), false);
        watch.emit(`users/${teacher.internalAccountId}`, profile, false);
        const restored = await restoredState;
        assert.equal(restored.status, "authenticated");
        if (restored.status === "authenticated") assert.equal(restored.user.id, teacher.internalAccountId);
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("active session is blocked by cache and restored only after server verification", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      let firestoreAvailable = true;
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async (reference) => {
          if (!firestoreAvailable) {
            throw Object.assign(new Error("Simulated Firestore outage"), { code: "unavailable" });
          }
          return getDocFromServer(reference);
        },
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const profile = (await getDocFromServer(doc(authDb!, "users", teacher.internalAccountId))).data();
      assert.ok(profile);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor(
        (state) => state.status === "authenticated",
        "authenticated session before cache event"
      );
      const blockedState = observer.waitFor(
        (state) => state.status === "error",
        "offline access block"
      );
      try {
        firestoreAvailable = false;
        watch.emit(`accountLinks/${teacher.uid}`, fakeLink(teacher), true);
        assert.equal((await blockedState).status, "error");

        const restoredState = observer.waitFor(
          (state) => state.status === "authenticated",
          "server-confirmed access after reconnect"
        );
        firestoreAvailable = true;
        watch.emit(`accountLinks/${teacher.uid}`, fakeLink(teacher), false);
        watch.emit(`users/${teacher.internalAccountId}`, profile, false);
        const restored = await restoredState;
        assert.equal(restored.status, "authenticated");
        if (restored.status === "authenticated") assert.equal(restored.user.id, teacher.internalAccountId);
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("an in-flight server read cannot restore access after a cache-only snapshot", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      await signInWithEmailAndPassword(auth!, teacher.email, FAKE_PASSWORD);
      const profileSnapshot = await getDocFromServer(
        doc(authDb!, "users", teacher.internalAccountId)
      );
      let markProfileReadStarted!: () => void;
      const profileReadStarted = new Promise<void>((resolve) => {
        markProfileReadStarted = resolve;
      });
      let resolvePendingProfile!: (snapshot: DocumentSnapshot<DocumentData>) => void;
      const pendingProfileRead = new Promise<DocumentSnapshot<DocumentData>>((resolve) => {
        resolvePendingProfile = resolve;
      });
      let firstProfileRead = true;
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async (reference) => {
          if (reference.path === `users/${teacher.internalAccountId}` && firstProfileRead) {
            firstProfileRead = false;
            markProfileReadStarted();
            return pendingProfileRead;
          }
          return getDocFromServer(reference);
        },
        watchDocument: watch.watchDocument,
      });
      const observer = observeAuthSession(monitoredService);
      try {
        await profileReadStarted;
        const blockedState = observer.waitFor(
          (state) => state.status === "error",
          "cache-only session block during a pending server read"
        );
        watch.emit(`accountLinks/${teacher.uid}`, fakeLink(teacher), true);
        await blockedState;
        resolvePendingProfile(profileSnapshot);
        await new Promise((resolve) => setTimeout(resolve, 50));
        assert.equal(observer.currentState.status, "error");

        const restoredState = observer.waitFor(
          (state) => state.status === "authenticated",
          "fresh server verification after the stale read"
        );
        const profile = profileSnapshot.data();
        assert.ok(profile);
        watch.emit(`accountLinks/${teacher.uid}`, fakeLink(teacher), false);
        watch.emit(`users/${teacher.internalAccountId}`, profile, false);
        assert.equal((await restoredState).status, "authenticated");
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("locked profile revokes an active Firebase session", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor((state) => state.status === "authenticated", "active teacher session");
      const revokedState = observer.waitFor(
        (state) => state.status === "error",
        "locked profile revocation"
      );
      try {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { status: "locked" });
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "locked" });
        });
        let lockedProfile: Record<string, unknown> | undefined;
        await environment!.withSecurityRulesDisabled(async (context) => {
          lockedProfile = (await getDoc(
            doc(context.firestore(), "users", teacher.internalAccountId)
          )).data();
        });
        assert.ok(lockedProfile);
        watch.emit(`accountLinks/${teacher.uid}`, { ...fakeLink(teacher), status: "locked" }, false);
        watch.emit(`users/${teacher.internalAccountId}`, lockedProfile, false);
        assert.equal((await revokedState).status, "error");
        assert.equal(auth!.currentUser, null);
      } finally {
        observer.unsubscribe();
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "active" });
        });
        await signOut(auth!);
      }
    });

    await t.test("changed role revokes the existing session instead of reusing prior privileges", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor((state) => state.status === "authenticated", "active teacher session");
      const revokedState = observer.waitFor(
        (state) => state.status === "error",
        "role-change revocation"
      );
      try {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { role: "admin" });
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { role: "admin" });
        });
        let changedProfile: Record<string, unknown> | undefined;
        await environment!.withSecurityRulesDisabled(async (context) => {
          changedProfile = (await getDoc(
            doc(context.firestore(), "users", teacher.internalAccountId)
          )).data();
        });
        assert.ok(changedProfile);
        watch.emit(`accountLinks/${teacher.uid}`, { ...fakeLink(teacher), role: "admin" }, false);
        watch.emit(`users/${teacher.internalAccountId}`, changedProfile, false);
        assert.equal((await revokedState).status, "error");
        assert.equal(auth!.currentUser, null);
      } finally {
        observer.unsubscribe();
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { role: "teacher" });
        });
        await signOut(auth!);
      }
    });

    await t.test("deleted mapping revokes the active Firebase session", async () => {
      await signOut(auth!);
      const teacher = byInternalId("fake-teacher-a");
      const watch = createAuthorizationWatchHarness();
      const monitoredService = createFirebaseAdminAuthService(auth!, authDb!, {
        watchDocument: watch.watchDocument,
      });
      await monitoredService.signIn(teacher.email, FAKE_PASSWORD);
      const observer = observeAuthSession(monitoredService);
      await observer.waitFor((state) => state.status === "authenticated", "active teacher session");
      const revokedState = observer.waitFor(
        (state) => state.status === "error",
        "mapping deletion revocation"
      );
      try {
        await environment!.withSecurityRulesDisabled((context) =>
          deleteDoc(doc(context.firestore(), "accountLinks", teacher.uid))
        );
        watch.emitMissing(`accountLinks/${teacher.uid}`);
        assert.equal((await revokedState).status, "error");
        assert.equal(auth!.currentUser, null);
      } finally {
        observer.unsubscribe();
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
        );
        await signOut(auth!);
      }
    });

    await t.test("Firebase Auth rejects unverified and unmapped accounts", async () => {
      await signOut(auth!);
      const unverifiedEmail = "unverified@example.test";
      const unverified = await createUserWithEmailAndPassword(auth!, unverifiedEmail, FAKE_PASSWORD);
      await assert.rejects(
        firebaseAdminAuth.signIn(unverifiedEmail, FAKE_PASSWORD),
        /Email chưa được xác minh/
      );
      assert.equal(auth!.currentUser, null);
      assert.equal(unverified.user.emailVerified, false);
      assert.ok(await getOutOfBandCode(unverifiedEmail, "VERIFY_EMAIL"));

      await signOut(auth!);
      const unmappedEmail = "unmapped@example.test";
      const unmapped = await createUserWithEmailAndPassword(auth!, unmappedEmail, FAKE_PASSWORD);
      await verifyFakeEmail(auth!, unmapped.user);
      await assert.rejects(firebaseAdminAuth.signIn(unmappedEmail, FAKE_PASSWORD));
      assert.equal(auth!.currentUser, null);
    });

    await t.test("unverified restored sessions are signed out before reading internal Firestore documents", async () => {
      await signOut(auth!);
      const email = "unverified-session@example.test";
      const credential = await createUserWithEmailAndPassword(auth!, email, FAKE_PASSWORD);
      let documentReadCount = 0;
      const guardedService = createFirebaseAdminAuthService(auth!, authDb!, {
        readDocumentFromServer: async () => {
          documentReadCount += 1;
          throw new Error("Unverified users must not reach Firestore reads.");
        },
      });
      const observer = observeAuthSession(guardedService);
      try {
        const blockedSession = await observer.waitFor(
          (state) => state.status === "signed_out",
          "unverified session sign-out"
        );
        assert.equal(blockedSession.status, "signed_out");
        assert.equal(documentReadCount, 0);
        assert.equal(auth!.currentUser, null);
        assert.equal(credential.user.emailVerified, false);
      } finally {
        observer.unsubscribe();
        await signOut(auth!);
      }
    });

    await t.test("Firebase Auth rejects mismatched mappings and non-active profiles", async () => {
      const teacher = byInternalId("fake-teacher-b");
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), {
          internalAccountId: "fake-teacher-a",
        })
      );
      try {
        await assert.rejects(firebaseAdminAuth.signIn(teacher.email, FAKE_PASSWORD));
        assert.equal(auth!.currentUser, null);
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
        );
      }

      for (const status of ["locked", "pending"] as const) {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { status });
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status });
        });
        try {
          await assert.rejects(firebaseAdminAuth.signIn(teacher.email, FAKE_PASSWORD));
          assert.equal(auth!.currentUser, null);
        } finally {
          await environment!.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
            await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "active" });
          });
        }
      }

      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), {
          contactEmail: "mismatch@example.test",
        })
      );
      try {
        await assert.rejects(firebaseAdminAuth.signIn(teacher.email, FAKE_PASSWORD));
        assert.equal(auth!.currentUser, null);
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), {
            contactEmail: teacher.email,
          })
        );
      }

      let savedProfile: DocumentData | undefined;
      await environment!.withSecurityRulesDisabled(async (context) => {
        const snapshot = await getDoc(doc(context.firestore(), "users", teacher.internalAccountId));
        if (!snapshot.exists()) throw new Error("Missing isolated teacher profile fixture.");
        savedProfile = snapshot.data();
      });
      const profileToRestore = savedProfile;
      if (!profileToRestore) throw new Error("Missing saved isolated teacher profile.");
      await environment!.withSecurityRulesDisabled((context) =>
        deleteDoc(doc(context.firestore(), "users", teacher.internalAccountId))
      );
      try {
        await assert.rejects(firebaseAdminAuth.signIn(teacher.email, FAKE_PASSWORD));
        assert.equal(auth!.currentUser, null);
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "users", teacher.internalAccountId), profileToRestore)
        );
      }
    });

    await t.test("Firebase Auth rejects a non-root account claiming the Super Admin role", async () => {
      const teacher = byInternalId("fake-teacher-b");
      await environment!.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { role: "super_admin" });
        await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { role: "super_admin" });
      });
      try {
        await assert.rejects(firebaseAdminAuth.signIn(teacher.email, FAKE_PASSWORD));
        assert.equal(auth!.currentUser, null);
      } finally {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { role: "teacher" });
        });
      }
    });

    await t.test("active teacher has access only within the linked school", async () => {
      const teacher = byInternalId("fake-teacher-a");
      const firestore = scopedFirestore(teacher);
      await assertSucceeds(getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample")));
      await assertFails(getDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample")));
    });

    await t.test("unauthenticated access is denied", async () => {
      const firestore = environment!.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample")));
    });

    await t.test("authenticated UID without a mapping is denied", async () => {
      const teacher = byInternalId("fake-teacher-b");
      await environment!.withSecurityRulesDisabled((context) =>
        deleteDoc(doc(context.firestore(), "accountLinks", teacher.uid))
      );
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(teacher), "schoolData", teacher.schoolId, "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
        );
      }
    });

    await t.test("mapping to a wrong internal account ID is denied", async () => {
      const teacher = byInternalId("fake-teacher-a");
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), {
          internalAccountId: "missing-internal-account",
        })
      );
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(teacher), "schoolData", teacher.schoolId, "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
        );
      }
    });

    await t.test("inconsistent mapping is denied", async () => {
      const teacher = byInternalId("fake-teacher-a");
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { role: "admin" })
      );
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(teacher), "schoolData", teacher.schoolId, "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled((context) =>
          setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
        );
      }
    });

    await t.test("locked account mapping is denied", async () => {
      const teacher = byInternalId("fake-teacher-a");
      await environment!.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { status: "locked" });
        await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "locked" });
      });
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(teacher), "schoolData", teacher.schoolId, "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "active" });
        });
      }
    });

    await t.test("pending account mapping is denied", async () => {
      const teacher = byInternalId("fake-teacher-a");
      await environment!.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), { status: "pending" });
        await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "pending" });
      });
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(teacher), "schoolData", teacher.schoolId, "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher));
          await updateDoc(doc(context.firestore(), "users", teacher.internalAccountId), { status: "active" });
        });
      }
    });

    await t.test("teacher cannot elevate role or write a privileged mapping", async () => {
      const teacher = byInternalId("fake-teacher-a");
      const firestore = scopedFirestore(teacher);
      await assertFails(updateDoc(doc(firestore, "users", teacher.internalAccountId), { role: "super_admin" }));
      await assertFails(updateDoc(doc(firestore, "accountLinks", teacher.uid), { role: "super_admin" }));
    });

    await t.test("admin cannot elevate role or write a privileged mapping", async () => {
      const admin = byInternalId("fake-admin");
      const firestore = scopedFirestore(admin);
      await assertFails(updateDoc(doc(firestore, "users", admin.internalAccountId), { role: "super_admin" }));
      await assertFails(updateDoc(doc(firestore, "accountLinks", admin.uid), { role: "super_admin" }));
    });

    await t.test("clients cannot create, modify, or delete account mappings", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const firestore = scopedFirestore(superAdmin);
      await assertFails(
        setDoc(doc(firestore, "accountLinks", superAdmin.uid), fakeLink(superAdmin))
      );
      await assertFails(
        setDoc(doc(firestore, "accountLinks", "arbitrary-fake-uid"), {
          ...fakeLink(superAdmin),
          internalAccountId: "fake-admin",
        })
      );
      await assertFails(deleteDoc(doc(firestore, "accountLinks", superAdmin.uid)));
    });

    await t.test("clients cannot create a second Super Admin profile or change school assignment", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const teacher = byInternalId("fake-teacher-a");
      await assertFails(
        setDoc(doc(scopedFirestore(superAdmin), "users", "fake-second-super-admin"), {
          role: "super_admin",
          schoolId: "fake-school-a",
          status: "active",
        })
      );
      await assertFails(
        updateDoc(doc(scopedFirestore(teacher), "users", teacher.internalAccountId), {
          role: "super_admin",
        })
      );
      await assertFails(
        updateDoc(doc(scopedFirestore(teacher), "users", teacher.internalAccountId), {
          schoolId: "fake-school-b",
        })
      );
      await assertFails(
        updateDoc(doc(scopedFirestore(teacher), "users", teacher.internalAccountId), {
          authUid: "another-fake-uid",
        })
      );
      await assertFails(
        updateDoc(doc(scopedFirestore(teacher), "accountLinks", teacher.uid), {
          schoolId: "fake-school-b",
        })
      );
    });

    await t.test("access to another school's data is denied", async () => {
      const teacher = byInternalId("fake-teacher-b");
      const firestore = scopedFirestore(teacher);
      await assertFails(getDoc(doc(firestore, "schools", "fake-school-a")));
      await assertFails(getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample")));
      await assertSucceeds(getDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample")));
    });

    await t.test("Super Admin has system-wide read access when active", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const firestore = scopedFirestore(superAdmin);
      await assertSucceeds(getDoc(doc(firestore, "schools", "fake-school-a")));
      await assertSucceeds(getDoc(doc(firestore, "schools", "fake-school-b")));
      await assertSucceeds(getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample")));
      await assertSucceeds(getDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample")));
      const schools = await getDocs(collection(firestore, "schools"));
      assert.equal(schools.size, 2);
      const schoolARecords = await getDocs(
        collection(firestore, "schoolData", "fake-school-a", "records")
      );
      const schoolBRecords = await getDocs(
        collection(firestore, "schoolData", "fake-school-b", "records")
      );
      assert.equal(schoolARecords.size, 3);
      assert.equal(schoolBRecords.size, 2);
    });

    await t.test("Super Admin can administer records in multiple schools", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const firestore = scopedFirestore(superAdmin);
      await assertSucceeds(
        setDoc(doc(firestore, "schoolData", "fake-school-a", "records", "super-admin-write"), {
          schoolId: "fake-school-a",
          value: "fake admin write",
        })
      );
      await assertSucceeds(
        setDoc(doc(firestore, "schoolData", "fake-school-b", "records", "super-admin-write"), {
          schoolId: "fake-school-b",
          value: "fake admin write",
        })
      );
    });

    await t.test("cross-parent collection-group records query is denied by the current Rules paths", async () => {
      const superAdmin = byInternalId("super-admin-root");
      await assertFails(
        getDocs(collectionGroup(scopedFirestore(superAdmin), "records"))
      );
    });

    await t.test("active teacher school queries stay scoped and cross-school queries are denied", async () => {
      const teacher = byInternalId("fake-teacher-a");
      const firestore = scopedFirestore(teacher);
      await assertFails(getDocs(collection(firestore, "schools")));
      const ownSchool = await getDocs(
        query(collection(firestore, "schools"), where(documentId(), "==", teacher.schoolId))
      );
      assert.equal(ownSchool.size, 1);
      const ownRecords = await getDocs(
        collection(firestore, "schoolData", teacher.schoolId, "records")
      );
      assert.ok(ownRecords.size > 0      );
      await assertFails(
        getDocs(collection(firestore, "schoolData", "fake-school-b", "records"))
      );
    });

    await t.test("student queries must constrain school, class, and owner", async () => {
      const student = byInternalId("fake-student-9a");
      const firestore = scopedFirestore(student);
      const ownRecords = await getDocs(
        query(
          collection(firestore, "schoolData", student.schoolId, "records"),
          where("classId", "==", student.classId),
          where("ownerUid", "==", student.uid)
        )
      );
      assert.equal(ownRecords.size, 1);
      await assertFails(
        getDocs(collection(firestore, "schoolData", student.schoolId, "records"))
      );
      await assertFails(
        getDocs(
          query(
            collection(firestore, "schoolData", student.schoolId, "records"),
            where("classId", "==", "fake-class-9b"),
            where("ownerUid", "==", student.uid)
          )
        )
      );
      await assertFails(
        getDocs(collection(firestore, "schoolData", "fake-school-b", "records"))
      );
    });

    await t.test("Emulator Rules require the root ID, matching UID, and active profile but do not bind email", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const teacher = byInternalId("fake-teacher-a");
      const protectedData = (account: FakeAccount, schoolId: string) =>
        getDoc(doc(scopedFirestore(account), "schoolData", schoolId, "records", "sample"));
      const rootProfile = {
        role: "super_admin",
        schoolId: superAdmin.schoolId,
        status: "active",
        authUid: superAdmin.uid,
        contactEmail: superAdmin.email,
      };

      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "accountLinks", teacher.uid), {
          internalAccountId: "super-admin-root",
          role: "super_admin",
        })
      );
      await assertFails(protectedData(teacher, "fake-school-b"));
      await environment!.withSecurityRulesDisabled((context) =>
        setDoc(doc(context.firestore(), "accountLinks", teacher.uid), fakeLink(teacher))
      );

      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await updateDoc(doc(firestore, "users", teacher.internalAccountId), { role: "super_admin" });
        await updateDoc(doc(firestore, "accountLinks", teacher.uid), { role: "super_admin" });
      });
      await assertFails(protectedData(teacher, "fake-school-b"));
      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await updateDoc(doc(firestore, "users", teacher.internalAccountId), { role: "teacher" });
        await setDoc(doc(firestore, "accountLinks", teacher.uid), fakeLink(teacher));
      });

      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await deleteDoc(doc(firestore, "users", superAdmin.internalAccountId));
      });
      await assertFails(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled((context) =>
        setDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), rootProfile)
      );

      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await updateDoc(doc(firestore, "users", superAdmin.internalAccountId), { role: "teacher" });
        await updateDoc(doc(firestore, "accountLinks", superAdmin.uid), { role: "teacher" });
      });
      await assertSucceeds(protectedData(superAdmin, "fake-school-a"));
      await assertFails(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await updateDoc(doc(firestore, "users", superAdmin.internalAccountId), rootProfile);
        await setDoc(doc(firestore, "accountLinks", superAdmin.uid), fakeLink(superAdmin));
      });

      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), {
          authUid: teacher.uid,
        })
      );
      await assertFails(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), rootProfile)
      );

      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), {
          contactEmail: "different-contact@example.test",
        })
      );
      await assertSucceeds(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), {
          contactEmail: superAdmin.email,
        })
      );

      await environment!.withSecurityRulesDisabled((context) =>
        updateDoc(doc(context.firestore(), "accountLinks", superAdmin.uid), {
          schoolId: "fake-school-b",
        })
      );
      await assertFails(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled((context) =>
        setDoc(doc(context.firestore(), "accountLinks", superAdmin.uid), fakeLink(superAdmin))
      );

      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await updateDoc(doc(firestore, "accountLinks", superAdmin.uid), { status: "pending" });
        await updateDoc(doc(firestore, "users", superAdmin.internalAccountId), { status: "pending" });
      });
      await assertFails(protectedData(superAdmin, "fake-school-b"));
      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await setDoc(doc(firestore, "users", superAdmin.internalAccountId), rootProfile);
        await setDoc(doc(firestore, "accountLinks", superAdmin.uid), fakeLink(superAdmin));
      });

      await assertSucceeds(protectedData(superAdmin, "fake-school-b"));
    });

    await t.test("Super Admin loses system-wide access when locked", async () => {
      const superAdmin = byInternalId("super-admin-root");
      await environment!.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), "accountLinks", superAdmin.uid), { status: "locked" });
        await updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), { status: "locked" });
      });
      try {
        await assertFails(
          getDoc(doc(scopedFirestore(superAdmin), "schoolData", "fake-school-b", "records", "sample"))
        );
      } finally {
        await environment!.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), "accountLinks", superAdmin.uid), fakeLink(superAdmin));
          await updateDoc(doc(context.firestore(), "users", superAdmin.internalAccountId), { status: "active" });
        });
      }
    });

    await t.test("student cannot read another class or another school's records", async () => {
      const student = byInternalId("fake-student-9a");
      const firestore = scopedFirestore(student);
      await assertSucceeds(
        getDoc(doc(firestore, "schoolData", student.schoolId, "records", "student-9a"))
      );
      await assertFails(
        getDoc(doc(firestore, "schoolData", student.schoolId, "records", "student-9b"))
      );
      await assertFails(
        getDoc(doc(firestore, "schoolData", "fake-school-b", "records", "student-school-b"))
      );
    });

    await t.test("unverified email cannot read its mapping or protected school data", async () => {
      const teacher = byInternalId("fake-teacher-a");
      const firestore = scopedFirestore(teacher, false);
      await assertFails(getDoc(doc(firestore, "accountLinks", teacher.uid)));
      await assertFails(getDoc(doc(firestore, "schoolData", teacher.schoolId, "records", "sample")));
    });

    await t.test("verified fake account completes password reset in Auth Emulator", async () => {
      await signOut(auth!);
      const resetEmail = "password-reset@example.test";
      const resetAccount = await createUserWithEmailAndPassword(auth!, resetEmail, FAKE_PASSWORD);
      await verifyFakeEmail(auth!, resetAccount.user);
      await signOut(auth!);
      await sendPasswordResetEmail(auth!, resetEmail);
      const resetCode = await getOutOfBandCode(resetEmail, "PASSWORD_RESET");
      assert.ok(resetCode);
      await confirmPasswordReset(auth!, resetCode, FAKE_RESET_PASSWORD);

      await signOut(auth!);
      await assert.rejects(
        signInWithEmailAndPassword(auth!, resetEmail, FAKE_PASSWORD),
        (error: unknown) =>
          typeof error === "object"
          && error !== null
          && "code" in error
          && ["auth/invalid-credential", "auth/wrong-password"].includes(String(error.code))
      );
      const resetLogin = await signInWithEmailAndPassword(
        auth!,
        resetEmail,
        FAKE_RESET_PASSWORD
      );
      assert.equal(resetLogin.user.uid, resetAccount.user.uid);
      await signOut(auth!);
    });

    await t.test("duplicate Auth account creation is rejected", async () => {
      await assert.rejects(
        createUserWithEmailAndPassword(auth!, SUPER_ADMIN_EMAIL, FAKE_PASSWORD),
        (error: unknown) =>
          typeof error === "object"
          && error !== null
          && "code" in error
          && error.code === "auth/email-already-in-use"
      );
    });

    await t.test("fake provisioning links only super-admin-root and rolls back without deleting Auth or business data", async () => {
      const superAdmin = byInternalId("super-admin-root");
      const admin = byInternalId("fake-admin");
      let original!: {
        profile: Record<string, unknown>;
        link: Record<string, unknown>;
        record: Record<string, unknown>;
      };
      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        const profile = (await getDoc(doc(firestore, "users", superAdmin.internalAccountId))).data();
        const link = (await getDoc(doc(firestore, "accountLinks", superAdmin.uid))).data();
        const record = (await getDoc(
          doc(firestore, "schoolData", "fake-school-a", "records", "sample")
        )).data();
        if (!profile || !link || !record) throw new Error("Missing fake data for provisioning test.");
        original = { profile, link, record };
      });

      const provision = async (
        uid: string,
        email: string,
        internalAccountId: string,
        role: string,
        failAfterWrite = false
      ) => environment!.withSecurityRulesDisabled(async (context) => {
        const identity = accounts.find((item) => item.uid === uid && item.email === email);
        if (!identity) throw new Error("UID/email conflict");
        if (
          internalAccountId !== "super-admin-root"
          || identity.internalAccountId !== "super-admin-root"
          || role !== "super_admin"
        ) {
          throw new Error("Only the predesignated internal account can be provisioned as Super Admin");
        }

        const firestore = context.firestore();
        const profileRef = doc(firestore, "users", internalAccountId);
        const linkRef = doc(firestore, "accountLinks", uid);
        if ((await getDoc(profileRef)).exists() || (await getDoc(linkRef)).exists()) {
          throw new Error("UID or internal account is already linked");
        }

        let profileWritten = false;
        let linkWritten = false;
        try {
          await setDoc(profileRef, {
            role,
            schoolId: identity.schoolId,
            status: "active",
            authUid: identity.uid,
            contactEmail: identity.email,
          });
          profileWritten = true;
          await setDoc(linkRef, fakeLink(identity));
          linkWritten = true;
          if (failAfterWrite) throw new Error("simulated provisioning failure");
        } catch (error) {
          if (linkWritten) await deleteDoc(linkRef);
          if (profileWritten) await deleteDoc(profileRef);
          throw error;
        }
      });

      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await deleteDoc(doc(firestore, "accountLinks", superAdmin.uid));
        await deleteDoc(doc(firestore, "users", superAdmin.internalAccountId));
      });

      await assert.rejects(
        provision(superAdmin.uid, superAdmin.email, superAdmin.internalAccountId, "super_admin", true),
        /simulated provisioning failure/
      );
      await environment!.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        assert.equal((await getDoc(doc(firestore, "accountLinks", superAdmin.uid))).exists(), false);
        assert.equal(
          (await getDoc(doc(firestore, "users", superAdmin.internalAccountId))).exists(),
          false
        );
        assert.deepEqual(
          (await getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample"))).data(),
          original.record
        );
      });

      await assert.rejects(provision(admin.uid, admin.email, "super-admin-root", "super_admin"), /UID\/email conflict|Only the predesignated/);
      await assert.rejects(
        provision(superAdmin.uid, admin.email, "super-admin-root", "super_admin"),
        /UID\/email conflict/
      );
      await assert.rejects(
        provision(superAdmin.uid, superAdmin.email, "fake-second-super-admin", "super_admin"),
        /Only the predesignated/
      );

      try {
        await provision(
          superAdmin.uid,
          superAdmin.email,
          superAdmin.internalAccountId,
          "super_admin"
        );
        await assert.rejects(
          provision(
            superAdmin.uid,
            superAdmin.email,
            superAdmin.internalAccountId,
            "super_admin"
          ),
          /already linked/
        );
        let createdInternalAccountId: unknown;
        await environment!.withSecurityRulesDisabled(async (context) => {
          const createdLink = await getDoc(doc(context.firestore(), "accountLinks", superAdmin.uid));
          createdInternalAccountId = createdLink.data()?.internalAccountId;
        });
        assert.equal(createdInternalAccountId, "super-admin-root");
      } finally {
        await environment!.withSecurityRulesDisabled(async (context) => {
          const firestore = context.firestore();
          await deleteDoc(doc(firestore, "accountLinks", superAdmin.uid));
          await deleteDoc(doc(firestore, "users", superAdmin.internalAccountId));
          await setDoc(doc(firestore, "users", superAdmin.internalAccountId), original.profile);
          await setDoc(doc(firestore, "accountLinks", superAdmin.uid), original.link);
        });
      }

      await signOut(auth!);
      const identityStillExists = await signInWithEmailAndPassword(
        auth!,
        superAdmin.email,
        FAKE_RESET_PASSWORD
      );
      assert.equal(identityStillExists.user.uid, superAdmin.uid);
    });
  } finally {
    if (auth) await signOut(auth).catch(() => undefined);
    await environment?.cleanup();
    if (authApp) await deleteApp(authApp);
    if (adminApp) await deleteAdminApp(adminApp);
  }
});

test.todo("unverified-email password reset must be denied by a trusted recovery backend; Firebase Auth client API does not enforce this policy");
