import { useCallback, useEffect, useState } from "react";
import { adminService } from "../services/adminService";
import {
  getAdminAuthService,
  type AdminAuthSession,
} from "../services/firebaseAdminAuthService";

const initialState: AdminAuthSession = { status: "loading" };

export function useAdminAuthSession() {
  const [session, setSession] = useState<AdminAuthSession>(initialState);

  useEffect(() => {
    adminService.enableFirebaseAuthMode();
    try {
      return getAdminAuthService().subscribe((nextSession) => {
        adminService.setFirebaseSessionUser(
          nextSession.status === "authenticated" ? nextSession.user : null
        );
        setSession(nextSession);
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Không thể khởi tạo Firebase Auth.";
      adminService.setFirebaseSessionUser(null);
      setSession({ status: "error", message });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await getAdminAuthService().signOut();
      adminService.setFirebaseSessionUser(null);
      setSession({ status: "signed_out" });
    } catch (error) {
      adminService.setFirebaseSessionUser(null);
      setSession({
        status: "error",
        message: error instanceof Error ? error.message : "Không thể kết thúc phiên Firebase Auth.",
      });
      throw error;
    }
  }, []);

  return { session, signOut };
}
