import { readFile } from "node:fs/promises";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
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
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

const PROJECT_ID = "demo-c38-emulator";
const API_KEY = "emulator-only-api-key";
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
const FAKE_PASSWORD = "EmulatorOnly-Password-123!";
const FAKE_RESET_PASSWORD = "EmulatorOnly-Reset-456!";

interface FakeAccount {
  internalAccountId: string;
  email: string;
  role: "super_admin" | "admin" | "teacher";
  schoolId: string;
  uid: string;
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
    internalAccountId: account.internalAccountId,
    role: account.role,
    schoolId: account.schoolId,
    status: "active",
    createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
    linkedBy: "emulator-fixture",
  };
}

test("Firebase Authentication and Firestore Emulator authorization", async (t) => {
  let environment: RulesTestEnvironment | undefined;
  let authApp: FirebaseApp | undefined;
  let auth: Auth | undefined;
  let authDb: Firestore | undefined;

  try {
    const rules = await readFile(new URL("../firestore.emulator.rules", import.meta.url), "utf8");
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    });

    authApp = initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID }, "auth-emulator-tests");
    auth = getAuth(authApp);
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    authDb = getFirestore(authApp);
    connectFirestoreEmulator(authDb, "127.0.0.1", 8080);

    await environment.clearFirestore();
    const fixtures: Array<Omit<FakeAccount, "uid">> = [
      {
        internalAccountId: "fake-super-admin",
        email: "super-admin@example.test",
        role: "super_admin",
        schoolId: "fake-school-a",
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
    ];

    const accounts: FakeAccount[] = [];
    for (const fixture of fixtures) {
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
          });
          await setDoc(doc(firestore, "accountLinks", account.uid), fakeLink(account));
        })
      );
      await Promise.all(
        ["fake-school-a", "fake-school-b"].map((schoolId) =>
          setDoc(doc(firestore, "schools", schoolId), { schoolId, name: "Fake school" })
        )
      );
      await setDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample"), {
        schoolId: "fake-school-a",
        value: "fake",
      });
      await setDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample"), {
        schoolId: "fake-school-b",
        value: "fake",
      });
    });

    const byInternalId = (id: string) => accounts.find((item) => item.internalAccountId === id)!;
    const scopedFirestore = (account: FakeAccount, emailVerified = true) =>
      environment!.authenticatedContext(account.uid, {
        email: account.email,
        email_verified: emailVerified,
      }).firestore();

    await t.test("fake user can sign in and access its own mapped account", async () => {
      await signOut(auth!);
      const result = await signInWithEmailAndPassword(auth!, "super-admin@example.test", FAKE_PASSWORD);
      await reload(result.user);
      assert.equal(result.user.uid, byInternalId("fake-super-admin").uid);
      assert.equal(result.user.emailVerified, true);

      const mapping = await getDoc(doc(authDb!, "accountLinks", result.user.uid));
      assert.equal(mapping.exists(), true);
      assert.equal(mapping.data()?.internalAccountId, "fake-super-admin");
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
      const superAdmin = byInternalId("fake-super-admin");
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

    await t.test("access to another school's data is denied", async () => {
      const teacher = byInternalId("fake-teacher-b");
      const firestore = scopedFirestore(teacher);
      await assertFails(getDoc(doc(firestore, "schools", "fake-school-a")));
      await assertFails(getDoc(doc(firestore, "schoolData", "fake-school-a", "records", "sample")));
      await assertSucceeds(getDoc(doc(firestore, "schoolData", "fake-school-b", "records", "sample")));
    });

    await t.test("unverified email cannot read its mapping or protected school data", async () => {
      const teacher = byInternalId("fake-teacher-a");
      const firestore = scopedFirestore(teacher, false);
      await assertFails(getDoc(doc(firestore, "accountLinks", teacher.uid)));
      await assertFails(getDoc(doc(firestore, "schoolData", teacher.schoolId, "records", "sample")));
    });

    await t.test("verified fake account completes password reset in Auth Emulator", async () => {
      await signOut(auth!);
      await signInWithEmailAndPassword(auth!, "super-admin@example.test", FAKE_PASSWORD);
      await sendPasswordResetEmail(auth!, "super-admin@example.test");
      const resetCode = await getOutOfBandCode("super-admin@example.test", "PASSWORD_RESET");
      assert.ok(resetCode);
      await confirmPasswordReset(auth!, resetCode, FAKE_RESET_PASSWORD);

      await signOut(auth!);
      await assert.rejects(
        signInWithEmailAndPassword(auth!, "super-admin@example.test", FAKE_PASSWORD),
        (error: unknown) =>
          typeof error === "object"
          && error !== null
          && "code" in error
          && ["auth/invalid-credential", "auth/wrong-password"].includes(String(error.code))
      );
      const resetLogin = await signInWithEmailAndPassword(
        auth!,
        "super-admin@example.test",
        FAKE_RESET_PASSWORD
      );
      assert.equal(resetLogin.user.uid, byInternalId("fake-super-admin").uid);
    });

    await t.test("duplicate Auth account creation is rejected", async () => {
      await assert.rejects(
        createUserWithEmailAndPassword(auth!, "super-admin@example.test", FAKE_PASSWORD),
        (error: unknown) =>
          typeof error === "object"
          && error !== null
          && "code" in error
          && error.code === "auth/email-already-in-use"
      );
    });
  } finally {
    if (auth) await signOut(auth).catch(() => undefined);
    await environment?.cleanup();
    if (authApp) await deleteApp(authApp);
  }
});

test.todo("unverified-email password reset must be denied by a trusted recovery backend; Firebase Auth client API does not enforce this policy");
