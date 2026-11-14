import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type Persistence,
  type User,
  type UserCredential,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  enableNetwork,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { AdminPermission, UserAccount, UserRole } from "../types/adminTypes";

export type AdminAuthSession =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "authenticated"; user: UserAccount }
  | { status: "error"; message: string };

const PROJECT_ID = "demo-c38-emulator";
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
const FIRESTORE_EMULATOR_PORT = 8080;
const SUPER_ADMIN_UID = "m7cPasleY9VECYBCEvaauVdEF6Mq";
const SUPER_ADMIN_EMAIL = "tangngocdien@gmail.com";
const SUPER_ADMIN_ID = "super-admin-root";
const SUPER_ADMIN_SCHOOL_ID = "school-thcs-quang-chau";
const ALLOWED_ROLES: UserRole[] = ["super_admin", "admin", "teacher"];
export const ALLOWED_PERMISSIONS: AdminPermission[] = [
  "manage_classes",
  "manage_students",
  "manage_teachers",
  "manage_questions",
  "manage_posts",
  "manage_videos",
  "manage_images",
  "view_reports",
  "manage_campaigns",
];

interface AccountLink {
  authUid: string;
  internalAccountId: string;
  role: UserRole;
  status: UserAccount["status"];
  schoolId: string;
}

interface AccountProfile {
  authUid: string;
  contactEmail: string;
  fullName: string;
  role: UserRole;
  status: UserAccount["status"];
  schoolId: string;
  permissions?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdBy?: unknown;
  phone?: unknown;
}

export interface FirebaseAdminAuthService {
  signIn(email: string, password: string): Promise<UserAccount>;
  signOut(): Promise<void>;
  subscribe(listener: (state: AdminAuthSession) => void): Unsubscribe;
}

interface FirebaseAdminAuthDependencies {
  setPersistence?: (auth: Auth, persistence: Persistence) => Promise<void>;
  signInWithEmailAndPassword?: (
    auth: Auth,
    email: string,
    password: string
  ) => Promise<UserCredential>;
  signOut?: (auth: Auth) => Promise<void>;
  reload?: (user: User) => Promise<void>;
  getIdTokenResult?: (
    user: User,
    forceRefresh?: boolean
  ) => Promise<{ claims: Record<string, unknown> }>;
  sendEmailVerification?: (user: User) => Promise<void>;
  onAuthStateChanged?: (
    auth: Auth,
    next: (user: User | null) => void,
    error?: (error: Error) => void
  ) => Unsubscribe;
  enableFirestoreNetwork?: (firestore: Firestore) => Promise<void>;
  readDocumentFromServer?: (
    reference: DocumentReference<DocumentData>
  ) => Promise<DocumentSnapshot<DocumentData>>;
  watchDocument?: (
    reference: DocumentReference<DocumentData>,
    onNext: (snapshot: DocumentSnapshot<DocumentData>) => void,
    onError: (error: Error) => void
  ) => Unsubscribe;
}

class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Email chưa được xác minh. Firebase đã gửi liên kết xác minh; hãy xác minh email rồi đăng nhập lại.");
    this.name = "EmailVerificationRequiredError";
  }
}

function firebaseErrorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string" ? error.code : undefined;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isTransientFirestoreError(error: unknown): boolean {
  return [
    "unavailable",
    "deadline-exceeded",
    "network-request-failed",
    "cancelled",
  ].includes(firebaseErrorCode(error) ?? "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAccountLink(value: unknown): AccountLink {
  if (
    !isRecord(value)
    || typeof value.authUid !== "string"
    || typeof value.internalAccountId !== "string"
    || !ALLOWED_ROLES.includes(value.role as UserRole)
    || !["active", "locked", "pending"].includes(String(value.status))
    || typeof value.schoolId !== "string"
  ) {
    throw new Error("Tài khoản không có mapping hợp lệ. Vui lòng liên hệ quản trị viên.");
  }
  return value as unknown as AccountLink;
}

function parseAccountProfile(value: unknown, uid: string): AccountProfile {
  if (
    !isRecord(value)
    || value.authUid !== uid
    || typeof value.contactEmail !== "string"
    || typeof value.fullName !== "string"
    || typeof value.schoolId !== "string"
    || !ALLOWED_ROLES.includes(value.role as UserRole)
    || !["active", "locked", "pending"].includes(String(value.status))
  ) {
    throw new Error("Hồ sơ quyền không hợp lệ hoặc không khớp với Firebase UID.");
  }
  return value as unknown as AccountProfile;
}

function toUserAccount(
  id: string,
  profile: AccountProfile,
  link: AccountLink,
  firebaseUser: User
): UserAccount {
  if (
    link.internalAccountId !== id
    || link.role !== profile.role
    || link.status !== profile.status
    || link.schoolId !== profile.schoolId
  ) {
    throw new Error("Mapping và hồ sơ quyền không nhất quán.");
  }
  const authEmail = firebaseUser.email ? normalizeEmail(firebaseUser.email) : "";
  if (!authEmail || normalizeEmail(profile.contactEmail) !== authEmail) {
    throw new Error("Email Firebase Auth không khớp email trong hồ sơ nội bộ.");
  }
  if (
    firebaseUser.uid === SUPER_ADMIN_UID
    || id === SUPER_ADMIN_ID
    || profile.role === "super_admin"
    || link.role === "super_admin"
  ) {
    if (
      firebaseUser.uid !== SUPER_ADMIN_UID
      || authEmail !== SUPER_ADMIN_EMAIL
      || id !== SUPER_ADMIN_ID
      || profile.role !== "super_admin"
      || link.role !== "super_admin"
      || profile.status !== "active"
      || link.status !== "active"
      || profile.schoolId !== SUPER_ADMIN_SCHOOL_ID
      || link.schoolId !== SUPER_ADMIN_SCHOOL_ID
    ) {
      throw new Error("Danh tính Super Admin không khớp tài khoản gốc đã được chỉ định.");
    }
  }
  if (profile.status === "locked") throw new Error("Tài khoản đã bị khóa.");
  if (profile.status === "pending") throw new Error("Tài khoản đang chờ phê duyệt.");
  if (!profile.schoolId || !profile.fullName.trim()) {
    throw new Error("Hồ sơ quyền thiếu trường hoặc tên hiển thị.");
  }

  const permissions = Array.isArray(profile.permissions)
    ? profile.permissions.filter(
      (permission): permission is AdminPermission =>
        typeof permission === "string"
        && ALLOWED_PERMISSIONS.includes(permission as AdminPermission)
    )
    : [];
  const createdAt = typeof profile.createdAt === "string" ? profile.createdAt : "";
  const updatedAt = typeof profile.updatedAt === "string" ? profile.updatedAt : createdAt;
  const createdBy = typeof profile.createdBy === "string" ? profile.createdBy : "firebase-provisioning";

  return {
    id,
    schoolId: profile.schoolId,
    email: profile.contactEmail,
    fullName: profile.fullName,
    role: profile.role,
    status: profile.status,
    permissions,
    createdAt,
    updatedAt,
    createdBy,
    ...(typeof profile.phone === "string" ? { phone: profile.phone } : {}),
  };
}

export function createFirebaseAdminAuthService(
  auth: Auth,
  firestore: Firestore,
  dependencies: FirebaseAdminAuthDependencies = {}
): FirebaseAdminAuthService {
  const setAuthPersistence = dependencies.setPersistence ?? setPersistence;
  const authenticateWithPassword = dependencies.signInWithEmailAndPassword
    ?? signInWithEmailAndPassword;
  const signOutAuth = dependencies.signOut ?? signOut;
  const reloadAuthUser = dependencies.reload ?? reload;
  const getAuthIdTokenResult = dependencies.getIdTokenResult
    ?? ((user: User, forceRefresh?: boolean) => user.getIdTokenResult(forceRefresh));
  const sendVerificationEmail = dependencies.sendEmailVerification ?? sendEmailVerification;
  const observeAuthState = dependencies.onAuthStateChanged ?? onAuthStateChanged;
  const enableFirestoreNetwork = dependencies.enableFirestoreNetwork ?? enableNetwork;
  const readDocumentFromServer = dependencies.readDocumentFromServer ?? getDocFromServer;
  const watchDocument = dependencies.watchDocument ?? (
    (
      reference: DocumentReference<DocumentData>,
      onNext: (snapshot: DocumentSnapshot<DocumentData>) => void,
      onError: (error: Error) => void
    ) => onSnapshot(reference, { includeMetadataChanges: true }, onNext, onError)
  );

  const verifyEmail = async (firebaseUser: User): Promise<void> => {
    await reloadAuthUser(firebaseUser);
    const token = await getAuthIdTokenResult(firebaseUser, true);
    if (firebaseUser.emailVerified !== true || token.claims.email_verified !== true) {
      throw new EmailVerificationRequiredError();
    }
    if (!firebaseUser.email || !normalizeEmail(firebaseUser.email)) {
      throw new Error("Tài khoản Firebase Auth không có email hợp lệ.");
    }
  };

  const resolveUser = async (firebaseUser: User): Promise<UserAccount> => {
    const linkSnapshot = await readDocumentFromServer(doc(firestore, "accountLinks", firebaseUser.uid));
    if (!linkSnapshot.exists() || linkSnapshot.id !== firebaseUser.uid) {
      throw new Error("Tài khoản không có mapping được cấp. Vui lòng liên hệ quản trị viên.");
    }
    const link = parseAccountLink(linkSnapshot.data());
    if (link.authUid !== firebaseUser.uid) {
      throw new Error("Mapping tài khoản không khớp với Firebase UID.");
    }
    const accountSnapshot = await readDocumentFromServer(doc(firestore, "users", link.internalAccountId));
    if (!accountSnapshot.exists() || accountSnapshot.id !== link.internalAccountId) {
      throw new Error("Không tìm thấy hồ sơ quyền nội bộ được liên kết.");
    }
    const profile = parseAccountProfile(accountSnapshot.data(), firebaseUser.uid);
    return toUserAccount(link.internalAccountId, profile, link, firebaseUser);
  };

  return {
    async signIn(email, password) {
      await setAuthPersistence(auth, browserSessionPersistence);
      const credential = await authenticateWithPassword(auth, email.trim(), password);
      try {
        await verifyEmail(credential.user);
        return await resolveUser(credential.user);
      } catch (error) {
        if (error instanceof EmailVerificationRequiredError) {
          let sendError: unknown;
          try {
            await sendVerificationEmail(credential.user);
          } catch (caughtSendError) {
            sendError = caughtSendError;
          }
          let signOutError: unknown;
          try {
            await signOutAuth(auth);
          } catch (caughtSignOutError) {
            signOutError = caughtSignOutError;
          }
          if (sendError || signOutError) {
            const sendDetails = sendError instanceof Error ? ` ${sendError.message}` : "";
            const signOutDetails = signOutError instanceof Error
              ? ` ${signOutError.message}`
              : "";
            throw new Error(
              `${sendError ? "Chưa gửi được email xác minh." : "Email chưa được xác minh."}${
                sendError ? ` Vui lòng thử lại sau.${sendDetails}` : ""
              }${
                signOutError
                  ? ` Không thể thu hồi Auth session; truy cập ứng dụng vẫn bị từ chối.${signOutDetails}`
                  : ""
              }`
            );
          }
          throw error;
        }
        try {
          await signOutAuth(auth);
        } catch (signOutError) {
          const details = signOutError instanceof Error ? ` ${signOutError.message}` : "";
          throw new Error(
            `Đăng nhập bị từ chối. Không thể thu hồi Auth session; truy cập ứng dụng vẫn bị từ chối.${details}`
          );
        }
        throw error;
      }
    },

    async signOut() {
      await signOutAuth(auth);
    },

    subscribe(listener) {
      let disposed = false;
      let generation = 0;
      let validationGeneration = 0;
      let firebaseUser: User | null = null;
      let lastAuthorizedUser: UserAccount | null = null;
      let revocationMessage: string | null = null;
      let serverConfirmedDocuments = new Set<string>();
      let authorizationWatchStartedGeneration = -1;
      let unsubscribeDocuments: Unsubscribe[] = [];

      const clearDocumentListeners = () => {
        unsubscribeDocuments.forEach((unsubscribe) => unsubscribe());
        unsubscribeDocuments = [];
      };

      const blockSession = (message: string) => {
        if (disposed) return;
        validationGeneration += 1;
        listener({ status: "error", message });
      };

      const revokeSession = async (message: string) => {
        if (disposed) return;
        generation += 1;
        firebaseUser = null;
        lastAuthorizedUser = null;
        revocationMessage = message;
        serverConfirmedDocuments.clear();
        clearDocumentListeners();
        try {
          await signOutAuth(auth);
        } catch (error) {
          revocationMessage = null;
          listener({
            status: "error",
            message: `${message} Không thể kết thúc phiên Firebase Auth: ${
              error instanceof Error ? error.message : "lỗi không xác định"
            }`,
          });
        }
      };

      const revokeUnverifiedSession = async (message: string) => {
        if (disposed) return;
        generation += 1;
        firebaseUser = null;
        lastAuthorizedUser = null;
        revocationMessage = null;
        serverConfirmedDocuments.clear();
        clearDocumentListeners();
        try {
          await signOutAuth(auth);
          listener({ status: "signed_out" });
        } catch (error) {
          listener({
            status: "error",
            message: `${message} Không thể thu hồi Auth session; truy cập ứng dụng vẫn bị từ chối: ${
              error instanceof Error ? error.message : "lỗi không xác định"
            }`,
          });
        }
      };

      const validateFromServer = async (
        expectedGeneration: number,
        startWatchAfterValidation = false
      ) => {
        if (!firebaseUser || disposed || generation !== expectedGeneration) return;
        const currentValidation = ++validationGeneration;
        try {
          const currentUser = firebaseUser;
          await verifyEmail(currentUser);
          if (
            startWatchAfterValidation
            && authorizationWatchStartedGeneration !== expectedGeneration
          ) {
            authorizationWatchStartedGeneration = expectedGeneration;
            watchAuthorizationDocuments(currentUser, expectedGeneration);
          }
          const user = await resolveUser(currentUser);
          if (
            !disposed
            && generation === expectedGeneration
            && validationGeneration === currentValidation
          ) {
            if (
              lastAuthorizedUser
              && (
                lastAuthorizedUser.id !== user.id
                || lastAuthorizedUser.role !== user.role
                || lastAuthorizedUser.schoolId !== user.schoolId
                || JSON.stringify(lastAuthorizedUser.permissions) !== JSON.stringify(user.permissions)
              )
            ) {
              await revokeSession("Quyền tài khoản đã thay đổi. Hãy đăng nhập lại để xác minh quyền mới.");
              return;
            }
            lastAuthorizedUser = user;
            listener({ status: "authenticated", user });
          }
        } catch (error) {
          if (
            disposed
            || generation !== expectedGeneration
            || validationGeneration !== currentValidation
          ) return;
          if (error instanceof EmailVerificationRequiredError) {
            await revokeUnverifiedSession(error.message);
          } else if (isTransientFirestoreError(error)) {
            blockSession("Không thể xác minh quyền trên Firestore. Truy cập quản trị đang tạm khóa.");
          } else {
            await revokeSession(
              error instanceof Error ? error.message : "Không thể xác minh tài khoản."
            );
          }
        }
      };

      const watchAuthorizationDocuments = (user: User, expectedGeneration: number) => {
        clearDocumentListeners();
        serverConfirmedDocuments = new Set<string>();
        let profileReferenceId: string | null = null;
        const mappingReference = doc(firestore, "accountLinks", user.uid);
        unsubscribeDocuments = [watchDocument(
          mappingReference,
          (snapshot) => {
            handleAuthorizationSnapshot("mapping", snapshot, expectedGeneration);
            if (snapshot.metadata.fromCache || !snapshot.exists()) return;

            try {
              const link = parseAccountLink(snapshot.data());
              if (profileReferenceId === link.internalAccountId) return;
              unsubscribeDocuments[1]?.();
              serverConfirmedDocuments.delete("profile");
              profileReferenceId = link.internalAccountId;
              unsubscribeDocuments[1] = watchDocument(
                doc(firestore, "users", link.internalAccountId),
                (profileSnapshot) =>
                  handleAuthorizationSnapshot("profile", profileSnapshot, expectedGeneration),
                (error) => handleAuthorizationListenerError(error, expectedGeneration)
              );
            } catch (error) {
              void revokeSession(
                error instanceof Error ? error.message : "Mapping tài khoản không hợp lệ."
              );
            }
          },
          (error) => handleAuthorizationListenerError(error, expectedGeneration)
        )];
      };

      const handleAuthorizationSnapshot = (
        documentName: string,
        snapshot: DocumentSnapshot<DocumentData>,
        expectedGeneration: number
      ) => {
        if (disposed || generation !== expectedGeneration) return;
        if (snapshot.metadata.fromCache) {
          serverConfirmedDocuments.delete(documentName);
          blockSession("Firestore đang ngoại tuyến hoặc chỉ có dữ liệu cache. Truy cập quản trị đã tạm khóa.");
          return;
        }
        if (!snapshot.exists()) {
          void revokeSession("Mapping hoặc hồ sơ quyền không còn tồn tại.");
          return;
        }
        const data = snapshot.data();
        if (!isRecord(data) || data.status !== "active") {
          void revokeSession("Tài khoản không còn ở trạng thái active.");
          return;
        }

        serverConfirmedDocuments.add(documentName);
        if (serverConfirmedDocuments.size === 2) {
          void validateFromServer(expectedGeneration);
        }
      };

      const handleAuthorizationListenerError = (error: Error, expectedGeneration: number) => {
        if (disposed || generation !== expectedGeneration) return;
        serverConfirmedDocuments.clear();
        clearDocumentListeners();
        if (isTransientFirestoreError(error)) {
          blockSession("Không thể kết nối Firestore. Truy cập quản trị đang tạm khóa đến khi xác minh lại.");
        } else {
          void revokeSession(`Không thể xác minh lại quyền truy cập: ${error.message}`);
        }
      };

      const beginSessionValidation = (user: User) => {
        const currentGeneration = ++generation;
        if (firebaseUser?.uid !== user.uid) lastAuthorizedUser = null;
        firebaseUser = user;
        authorizationWatchStartedGeneration = -1;
        listener({ status: "loading" });
        void validateFromServer(currentGeneration, true);
      };

      const unsubscribeAuth = observeAuthState(
        auth,
        (user) => {
          validationGeneration += 1;
          clearDocumentListeners();
          serverConfirmedDocuments.clear();
          if (!user) {
            firebaseUser = null;
            lastAuthorizedUser = null;
            generation += 1;
            if (revocationMessage) {
              listener({ status: "error", message: revocationMessage });
              revocationMessage = null;
            } else {
              listener({ status: "signed_out" });
            }
            return;
          }
          beginSessionValidation(user);
        },
        (error) => blockSession(`Không thể khôi phục phiên Firebase Auth: ${error.message}`)
      );

      const retryWhenOnline = () => {
        if (!firebaseUser || disposed) return;
        const user = firebaseUser;
        const currentGeneration = generation;
        void enableFirestoreNetwork(firestore).then(() => {
          if (disposed || generation !== currentGeneration) return;
          beginSessionValidation(user);
        }).catch((error: unknown) => {
          blockSession(
            `Firestore vẫn chưa khả dụng: ${
              error instanceof Error ? error.message : "lỗi kết nối không xác định"
            }`
          );
        });
      };
      const blockWhenOffline = () => {
        if (firebaseUser) {
          blockSession("Thiết bị mất kết nối. Truy cập quản trị đang tạm khóa đến khi xác minh lại.");
        }
      };
      if (typeof window !== "undefined") {
        window.addEventListener("online", retryWhenOnline);
        window.addEventListener("offline", blockWhenOffline);
      }

      return () => {
        disposed = true;
        generation += 1;
        clearDocumentListeners();
        unsubscribeAuth();
        if (typeof window !== "undefined") {
          window.removeEventListener("online", retryWhenOnline);
          window.removeEventListener("offline", blockWhenOffline);
        }
      };
    },
  };
}

let emulatorService: FirebaseAdminAuthService | undefined;
let productionService: FirebaseAdminAuthService | undefined;

export function getEmulatorAdminAuthService(): FirebaseAdminAuthService {
  if (!import.meta.env?.DEV) {
    throw new Error("Đăng nhập quản trị chỉ được bật trong môi trường Firebase Emulator local.");
  }
  if (emulatorService) return emulatorService;

  const appName = "demo-c38-emulator-app";
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp({
      apiKey: "emulator-only-api-key",
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
      projectId: PROJECT_ID,
      appId: "emulator-only-app",
    }, appName);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(firestore, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  emulatorService = createFirebaseAdminAuthService(auth, firestore);
  return emulatorService;
}

export function getAdminAuthService(): FirebaseAdminAuthService {
  if (import.meta.env?.DEV) return getEmulatorAdminAuthService();
  if (productionService) return productionService;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      "Thiếu cấu hình Firebase Production. Cần cung cấp VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID và VITE_FIREBASE_APP_ID."
    );
  }

  const appName = "gender-equality-production-app";
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp({ apiKey, authDomain, projectId, appId }, appName);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  productionService = createFirebaseAdminAuthService(auth, firestore);
  return productionService;
}
