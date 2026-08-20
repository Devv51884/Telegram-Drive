import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import DriveAPI from "../services/api.js";

const DriveContext = createContext(null);

export function DriveProvider({ children }) {
  // Authentication & Security State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation & Location
  const [section, setSection] = useState("my_drive"); // 'my_drive', 'starred', 'trash', 'recent', 'telegram_imports'
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: "root", name: "My Drive" }]);
  const [currentFolder, setCurrentFolder] = useState(null);

  // Content
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // Filters & View
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Selection
  const [selectedItem, setSelectedItem] = useState(null);

  // Modals & Drawers
  const [activeModal, setActiveModal] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [modalTargetItem, setModalTargetItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3500);
  };

  // Check Authentication Status
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("teledrive_auth_token");
    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const res = await DriveAPI.getCurrentUser();
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("teledrive_auth_token");
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (err) {
      localStorage.removeItem("teledrive_auth_token");
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auth Handlers
  const loginUser = async (email, password) => {
    const res = await DriveAPI.loginUser({ email, password });
    if (res.success && res.token) {
      localStorage.setItem("teledrive_auth_token", res.token);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      showToast(`Welcome back, ${res.user.name}!`);
      fetchContents();
      fetchMetadata();
      return true;
    }
    return false;
  };

  const signupUser = async (name, email, password) => {
    const res = await DriveAPI.signupUser({ name, email, password });
    if (res.success && res.token) {
      localStorage.setItem("teledrive_auth_token", res.token);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      showToast(`Account created! Welcome to TeleDrive, ${res.user.name}!`);
      fetchContents();
      fetchMetadata();
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    DriveAPI.logoutUser().catch(() => {});
    localStorage.removeItem("teledrive_auth_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setFolders([]);
    setFiles([]);
    showToast("Logged out successfully");
  };

  // Fetch Drive Contents
  const fetchContents = useCallback(async (silent = false) => {
    if (!localStorage.getItem("teledrive_auth_token")) {
      return;
    }
    if (!silent) setLoading(true);
    try {
      const params = {
        folderId: currentFolderId === "root" ? undefined : currentFolderId,
        section,
        search: searchQuery || undefined,
        type: typeFilter === "all" ? undefined : typeFilter,
        sort: sortBy,
        order: sortOrder
      };

      const data = await DriveAPI.getContents(params);
      if (data.success) {
        setFolders(data.folders || []);
        setFiles(data.files || []);
        setCurrentFolder(data.currentFolder || null);
        if (data.breadcrumbs && !searchQuery && section === "my_drive") {
          setBreadcrumbs(data.breadcrumbs);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
      } else {
        console.error("Failed to load contents:", err);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentFolderId, section, searchQuery, typeFilter, sortBy, sortOrder]);

  // Fetch Stats & Settings & Folder Tree
  const fetchMetadata = useCallback(async () => {
    if (!localStorage.getItem("teledrive_auth_token")) {
      return;
    }
    try {
      const [statsRes, treeRes, settingsRes] = await Promise.all([
        DriveAPI.getStats(),
        DriveAPI.getFolderTree(),
        DriveAPI.getSettings()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (treeRes.success) setFolderTree(treeRes.tree);
      if (settingsRes.success) setSettings(settingsRes.settings);
    } catch (err) {
      if (err.response?.status === 401) {
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContents();
      fetchMetadata();
    }
  }, [fetchContents, fetchMetadata, isAuthenticated]);

  // Navigation handlers
  const openFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setSelectedItem(null);
    setSearchQuery("");
  };

  const navigateToSection = (newSection) => {
    setSection(newSection);
    setCurrentFolderId("root");
    setSelectedItem(null);
    setSearchQuery("");
    if (newSection === "my_drive") {
      setBreadcrumbs([{ id: "root", name: "My Drive" }]);
    } else if (newSection === "starred") {
      setBreadcrumbs([{ id: "starred", name: "Starred Items" }]);
    } else if (newSection === "trash") {
      setBreadcrumbs([{ id: "trash", name: "Trash Bin" }]);
    } else if (newSection === "telegram_imports") {
      setBreadcrumbs([{ id: "telegram_imports", name: "Telegram Channel Imports" }]);
    }
  };

  // ==========================================
  // ULTRA-RESPONSIVE OPTIMISTIC CRUD ACTIONS (0ms Delay)
  // ==========================================

  const createFolder = async (name, color) => {
    try {
      const res = await DriveAPI.createFolder({
        name,
        color,
        parentId: currentFolderId === "root" ? null : currentFolderId
      });
      if (res.success) {
        showToast(`Folder "${name}" created successfully`);
        setFolders((prev) => [...prev, res.folder]);
        setActiveModal(null);
        fetchMetadata();
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create folder", "error");
      return false;
    }
  };

  const renameItem = async (item, newName) => {
    if (!item || !newName || item.name === newName) return;
    const oldName = item.name;

    if (item.isFolder) {
      setFolders((prev) => prev.map((f) => (f.id === item.id ? { ...f, name: newName } : f)));
    } else {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, name: newName } : f)));
    }
    showToast("Renamed successfully");
    setActiveModal(null);

    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { name: newName });
      } else {
        await DriveAPI.updateFile(item.id, { name: newName });
      }
      fetchMetadata();
    } catch (err) {
      if (item.isFolder) {
        setFolders((prev) => prev.map((f) => (f.id === item.id ? { ...f, name: oldName } : f)));
      } else {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, name: oldName } : f)));
      }
      showToast(err.response?.data?.error || "Failed to rename", "error");
    }
  };

  const moveItem = async (item, targetFolderId) => {
    if (!item) return;
    const folderId = targetFolderId === "root" ? null : targetFolderId;

    if (item.isFolder) {
      setFolders((prev) => prev.filter((f) => f.id !== item.id));
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== item.id));
    }
    showToast("Moved successfully");
    setActiveModal(null);

    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { parentId: folderId });
      } else {
        await DriveAPI.updateFile(item.id, { folderId });
      }
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast(err.response?.data?.error || "Failed to move", "error");
    }
  };

  const toggleStar = async (item) => {
    if (!item) return;
    const newStarred = item.is_starred ? 0 : 1;

    if (item.isFolder) {
      setFolders((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_starred: newStarred } : f)));
    } else {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, is_starred: newStarred } : f)));
    }
    if (previewItem && previewItem.id === item.id) {
      setPreviewItem((prev) => ({ ...prev, is_starred: newStarred }));
    }
    showToast(newStarred ? "Added to Starred" : "Removed from Starred");

    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isStarred: newStarred });
      } else {
        await DriveAPI.updateFile(item.id, { isStarred: newStarred });
      }
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to update star", "error");
    }
  };

  const moveToTrash = async (item) => {
    if (!item) return;

    if (item.isFolder) {
      setFolders((prev) => prev.filter((f) => f.id !== item.id));
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== item.id));
    }
    setSelectedItem(null);
    showToast(`"${item.name}" moved to Trash`);

    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isTrash: 1 });
      } else {
        await DriveAPI.updateFile(item.id, { isTrash: 1 });
      }
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast(err.response?.data?.error || "Failed to move to trash", "error");
    }
  };

  const restoreFromTrash = async (item) => {
    if (!item) return;

    if (item.isFolder) {
      setFolders((prev) => prev.filter((f) => f.id !== item.id));
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== item.id));
    }
    setSelectedItem(null);
    showToast(`"${item.name}" restored from Trash`);

    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isTrash: 0 });
      } else {
        await DriveAPI.updateFile(item.id, { isTrash: 0 });
      }
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast(err.response?.data?.error || "Failed to restore", "error");
    }
  };

  const deletePermanently = async (item) => {
    if (!item) return;

    if (item.isFolder) {
      setFolders((prev) => prev.filter((f) => f.id !== item.id));
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== item.id));
    }
    setSelectedItem(null);
    showToast(`"${item.name}" deleted permanently`);

    try {
      if (item.isFolder) {
        await DriveAPI.deleteFolder(item.id);
      } else {
        await DriveAPI.deleteFile(item.id);
      }
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const emptyTrash = async () => {
    setFolders([]);
    setFiles([]);
    showToast("Trash emptied");
    try {
      await DriveAPI.emptyTrash();
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to empty trash", "error");
    }
  };

  const refresh = () => {
    fetchContents();
    fetchMetadata();
  };

  const value = {
    // Auth & User
    currentUser,
    isAuthenticated,
    authChecking,
    loginUser,
    signupUser,
    logoutUser,
    checkAuth,

    // Navigation
    section,
    setSection: navigateToSection,
    currentFolderId,
    openFolder,
    breadcrumbs,
    currentFolder,

    // Contents & Stats
    folders,
    files,
    folderTree,
    stats,
    loading,
    settings,
    refresh,

    // Filters
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Selection
    selectedItem,
    setSelectedItem,

    // Modals
    activeModal,
    setActiveModal,
    previewItem,
    setPreviewItem,
    modalTargetItem,
    setModalTargetItem,
    isDetailsOpen,
    setIsDetailsOpen,

    // Toast
    toast,
    showToast,

    // Actions
    createFolder,
    renameItem,
    moveItem,
    toggleStar,
    moveToTrash,
    restoreFromTrash,
    deletePermanently,
    emptyTrash,

    // Aliases
    trashItem: moveToTrash,
    restoreItem: restoreFromTrash,
    deletePermanent: deletePermanently
  };

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>;
}

export function useDrive() {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error("useDrive must be used within a DriveProvider");
  }
  return context;
}
