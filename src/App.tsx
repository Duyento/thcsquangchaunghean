import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomeSection from "./components/HomeSection";
import KnowledgeSection from "./components/KnowledgeSection";
import SituationsSection from "./components/SituationsSection";
import QuizSection from "./components/QuizSection";
import MediaSection from "./components/MediaSection";
import CommitmentSection from "./components/CommitmentSection";
import AdminPortal from "./components/admin/AdminPortal";
import AdminLogin from "./components/admin/AdminLogin";
import StudentPortal from "./components/student/StudentPortal";
import StudentLogin from "./components/student/StudentLogin";
import TeacherPortal from "./components/teacher/TeacherPortal";
import Dot3TestRunnerModal from "./components/testing/Dot3TestRunnerModal";
import { studentService } from "./services/studentService";
import { adminService } from "./services/adminService";
import { StudentSession, UserAccount } from "./types/adminTypes";
import { ArrowUp } from "lucide-react";

type PortalMode = "public" | "student" | "teacher" | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [portalMode, setPortalMode] = useState<PortalMode>("public");
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState<boolean>(false);

  // Active Sessions
  const [studentSession, setStudentSession] = useState<StudentSession | null>(() => {
    return studentService.getCurrentSession();
  });

  const [teacherUser, setTeacherUser] = useState<UserAccount | null>(() => {
    const user = adminService.getCurrentSessionUser();
    return user && user.role === "teacher" ? user : null;
  });

  // Monitor session validity
  useEffect(() => {
    const interval = setInterval(() => {
      // Check student session validity
      const currStudent = studentService.getCurrentSession();
      if (!currStudent && studentSession) {
        setStudentSession(null);
      }

      // Check teacher session validity
      const currAdmin = adminService.getCurrentSessionUser();
      if ((!currAdmin || currAdmin.role !== "teacher") && teacherUser) {
        setTeacherUser(null);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [studentSession, teacherUser]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 1. CỔNG QUẢN TRỊ NHÀ TRƯỜNG (Admin Portal)
  if (portalMode === "admin") {
    return (
      <AdminPortal
        onBackToPublic={() => {
          setPortalMode("public");
          scrollToTop();
        }}
      />
    );
  }

  // 2. CỔNG HỌC SINH (Student Portal & Login)
  if (portalMode === "student") {
    if (studentSession) {
      return (
        <StudentPortal
          session={studentSession}
          onLogout={() => {
            studentService.logout();
            setStudentSession(null);
          }}
          onBackToPublic={() => {
            setPortalMode("public");
            scrollToTop();
          }}
        />
      );
    }
    return (
      <StudentLogin
        onLoginSuccess={(session) => {
          setStudentSession(session);
          scrollToTop();
        }}
        onBackToPublic={() => {
          setPortalMode("public");
          scrollToTop();
        }}
      />
    );
  }

  // 3. CỔNG GIÁO VIÊN (Teacher Portal & Login)
  if (portalMode === "teacher") {
    if (teacherUser && teacherUser.role === "teacher") {
      return (
        <TeacherPortal
          currentUser={teacherUser}
          onLogout={() => {
            try {
              adminService.logout();
              setTeacherUser(null);
            } catch (error) {
              alert(error instanceof Error ? error.message : "Không thể xác minh đã đăng xuất an toàn.");
            }
          }}
          onBackToPublic={() => {
            setPortalMode("public");
            scrollToTop();
          }}
        />
      );
    }
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          if (user.role === "teacher") {
            setTeacherUser(user);
          } else {
            // If logged in as super_admin, switch to admin portal
            setPortalMode("admin");
          }
          scrollToTop();
        }}
        onBackToPublic={() => {
          setPortalMode("public");
          scrollToTop();
        }}
      />
    );
  }

  // 4. TRANG CHỦ CỘNG ĐỒNG (Public Educational Portal)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAdmin={() => setPortalMode("admin")}
        onOpenStudent={() => setPortalMode("student")}
        onOpenTeacher={() => setPortalMode("teacher")}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
      />

      {/* Main Content Body - All 6 educational sections intact */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === "home" && <HomeSection setActiveTab={setActiveTab} />}
        {activeTab === "knowledge" && <KnowledgeSection setActiveTab={setActiveTab} />}
        {activeTab === "situations" && <SituationsSection setActiveTab={setActiveTab} />}
        {activeTab === "quiz" && <QuizSection setActiveTab={setActiveTab} />}
        {activeTab === "media" && <MediaSection setActiveTab={setActiveTab} />}
        {activeTab === "commitment" && <CommitmentSection />}
      </main>

      {/* Footer */}
      <Footer
        setActiveTab={setActiveTab}
        onOpenAdmin={() => setPortalMode("admin")}
        onOpenStudent={() => setPortalMode("student")}
        onOpenTeacher={() => setPortalMode("teacher")}
        onOpenTestRunner={() => setIsTestRunnerOpen(true)}
      />

      {/* 10 Test Scenarios Automated Verification Modal (Requirement F) */}
      <Dot3TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />

      {/* Back to top floating button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Về đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
