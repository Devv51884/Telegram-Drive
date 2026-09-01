import React, { useState, useEffect } from "react";
import { DriveProvider, useDrive } from "./context/DriveContext.jsx";
import DriveAPI from "./services/api.js";
import Header from "./components/layout/Header.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Breadcrumbs from "./components/layout/Breadcrumbs.jsx";
import FileGrid from "./components/drive/FileGrid.jsx";
import FileList from "./components/drive/FileList.jsx";
import EmptyState from "./components/drive/EmptyState.jsx";
import BulkActionBar from "./components/drive/BulkActionBar.jsx";
import DragSelectContainer from "./components/drive/DragSelectContainer.jsx";
import NewFolderModal from "./components/modals/NewFolderModal.jsx";
import UploadModal from "./components/modals/UploadModal.jsx";
import ImportLinkModal from "./components/modals/ImportLinkModal.jsx";
import MoveModal from "./components/modals/MoveModal.jsx";
import RenameModal from "./components/modals/RenameModal.jsx";
import FilePreviewModal from "./components/modals/FilePreviewModal.jsx";
import SettingsModal from "./components/modals/SettingsModal.jsx";
import ShareModal from "./components/modals/ShareModal.jsx";
import PublicShareView from "./components/share/PublicShareView.jsx";
import AdminPage from "./components/admin/AdminPage.jsx";
import SettingsPage from "./components/settings/SettingsPage.jsx";
import DetailsDrawer from "./components/modals/DetailsDrawer.jsx";
import AuthScreen from "./components/auth/AuthScreen.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import LandingPage from "./components/landing/LandingPage.jsx";
import PrivacyPolicyPage from "./components/legal/PrivacyPolicyPage.jsx";
import TermsPage from "./components/legal/TermsPage.jsx";
import ContactPage from "./components/contact/ContactPage.jsx";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";

function DriveMain() {
  const {
    folders,
    files,
    viewMode,
    loading,
    toast,
    setSelectedItem,
    isAuthenticated,
    authChecking,
    section,
    shareToken
  } = useDrive();

  const [siteSettings, setSiteSettings] = useState(null);

  // Initialize public page state from URL query parameters
  const [publicPage, setPublicPage] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      const view = params.get("view");
      const tab = params.get("tab");
      if (page === "privacy" || page === "terms" || page === "contact") return page;
      if (
        view === "auth" ||
        tab === "signup" ||
        tab === "login" ||
        params.get("verify_email") ||
        params.get("reset_password")
      ) {
        return "auth";
      }
      return "landing";
    } catch {
      return "landing";
    }
  });

  const [authTab, setAuthTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") === "signup" ? "signup" : "signin";
    } catch {
      return "signin";
    }
  });

  useEffect(() => {
    DriveAPI.getPublicSiteSettings()
      .then((res) => {
        if (res.success && res.settings) setSiteSettings(res.settings);
      })
      .catch(() => {});

    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const page = params.get("page");
        const view = params.get("view");
        const tab = params.get("tab");
        if (page === "privacy" || page === "terms" || page === "contact") {
          setPublicPage(page);
        } else if (
          view === "auth" ||
          tab === "signup" ||
          tab === "login" ||
          params.get("verify_email") ||
          params.get("reset_password")
        ) {
          setAuthTab(tab === "signup" ? "signup" : "signin");
          setPublicPage("auth");
        } else {
          setPublicPage("landing");
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (target) => {
    if (target === "landing") {
      window.history.pushState({}, "", "/");
      setPublicPage("landing");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "privacy") {
      window.history.pushState({}, "", "/?page=privacy");
      setPublicPage("privacy");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "terms") {
      window.history.pushState({}, "", "/?page=terms");
      setPublicPage("terms");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "contact") {
      window.history.pushState({}, "", "/?page=contact");
      setPublicPage("contact");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === "auth_login") {
      setAuthTab("signin");
      window.history.pushState({}, "", "/?view=auth&tab=login");
      setPublicPage("auth");
    } else if (target === "auth_signup") {
      setAuthTab("signup");
      window.history.pushState({}, "", "/?view=auth&tab=signup");
      setPublicPage("auth");
    }
  };

  // 1. Direct Public Share Link View (No login required for public files)
  if (shareToken) {
    return <PublicShareView shareToken={shareToken} />;
  }

  // Display security check loading screen
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Connecting to TeleDrive...</p>
      </div>
    );
  }

  // Display Landing Page, Legal Pages, Contact, or Auth Screen if not authenticated
  if (!isAuthenticated) {
    if (publicPage === "privacy") {
      return <PrivacyPolicyPage onNavigate={handleNavigate} siteSettings={siteSettings} />;
    }
    if (publicPage === "terms") {
      return <TermsPage onNavigate={handleNavigate} siteSettings={siteSettings} />;
    }
    if (publicPage === "contact") {
      return <ContactPage onNavigate={handleNavigate} siteSettings={siteSettings} />;
    }
    if (publicPage === "auth") {
      return <AuthScreen initialTab={authTab} onBack={() => handleNavigate("landing")} />;
    }
    return <LandingPage onNavigate={handleNavigate} siteSettings={siteSettings} />;
  }

  // Dedicated Full-Page View for Account Settings
  if (section === "settings") {
    return (
      <div className="min-h-screen overflow-x-hidden font-sans">
        <SettingsPage />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
                toast.type === "error"
                  ? "bg-rose-50/95 dark:bg-rose-950/90 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                  : toast.type === "info"
                  ? "bg-blue-50/95 dark:bg-blue-950/90 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                  : "bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              ) : toast.type === "info" ? (
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              )}
              <span className="truncate max-w-sm">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dedicated Full-Page View for Admin Portal
  if (section === "admin") {
    return (
      <div className="h-screen overflow-hidden font-sans">
        <AdminPage />
        <FilePreviewModal />
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
            <div
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
                toast.type === "error"
                  ? "bg-rose-50/95 dark:bg-rose-950/90 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                  : toast.type === "info"
                  ? "bg-blue-50/95 dark:bg-blue-950/90 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                  : "bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              ) : toast.type === "info" ? (
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              )}
              <span className="truncate max-w-sm">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 dark:bg-[#131314] text-slate-900 dark:text-slate-100 overflow-hidden font-sans"
      onClick={() => setSelectedItem(null)}
    >
      {/* Top Navigation Header */}
      <Header />

      {/* Main App Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Google Drive Sidebar */}
        <Sidebar />

        {/* Center Main Drive View */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191a1b] overflow-hidden pb-14 lg:pb-0">
          <Breadcrumbs />

          <DragSelectContainer>
            {loading && isEmpty ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Loading your cloud files...</p>
              </div>
            ) : isEmpty ? (
              <EmptyState />
            ) : viewMode === "grid" ? (
              <FileGrid />
            ) : (
              <FileList />
            )}
          </DragSelectContainer>
        </main>

        {/* Right Info / Details Drawer */}
        <DetailsDrawer />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Floating Multi-Select Bulk Actions Bar */}
      <BulkActionBar />

      {/* Modals & Dialogs */}
      <NewFolderModal />
      <UploadModal />
      <ImportLinkModal />
      <MoveModal />
      <RenameModal />
      <FilePreviewModal />
      <SettingsModal />
      <ShareModal />

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
              toast.type === "error"
                ? "bg-rose-50/95 dark:bg-rose-950/90 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800"
                : toast.type === "info"
                ? "bg-blue-50/95 dark:bg-blue-950/90 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800"
                : "bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            ) : toast.type === "info" ? (
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DriveProvider>
      <DriveMain />
    </DriveProvider>
  );
}
