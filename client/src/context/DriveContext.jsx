import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import DriveAPI from "../services/api.js";

const DriveContext = createContext(null);

export function DriveProvider({ children }) {
  // Authentication & Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
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
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
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
    }, 4000);
  };

  // Check Authentication & Master Lock Status
  const checkAuth = useCallback(async () => {
    try {
      const res = await DriveAPI.getAuthStatus();
      if (res.success) {
        if (!res.isSetup) {
          setIsSetupRequired(true);
          setIsAuthenticated(false);
        } else if (res.isAuthenticated) {
          setIsAuthenticated(true);
          setIsSetupRequired(false);
        } else {
          setIsAuthenticated(false);
          setIsSetupRequired(false);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auth Handlers
  const loginMaster = async (password) => {
    const res = await DriveAPI.loginMasterPassword(password);
    if (res.success && res.token) {
      localStorage.setItem("teledrive_auth_token", res.token);
      setIsAuthenticated(true);
      setIsSetupRequired(false);
      showToast("Drive unlocked successfully!");
      fetchContents();
      fetchMetadata();
      return true;
    }
    return false;
  };

  const setupMaster = async (password) => {
    const res = await DriveAPI.setupMasterPassword(password);
    if (res.success && res.token) {
      localStorage.setItem("teledrive_auth_token", res.token);
      setIsAuthenticated(true);
      setIsSetupRequired(false);
      showToast("Master Password configured & Drive unlocked!");
      fetchContents();
      fetchMetadata();
      return true;
    }
    return false;
  };

  const lockMaster = () => {
    localStorage.removeItem("teledrive_auth_token");
    setIsAuthenticated(false);
    showToast("Drive locked");
  };

  // Fetch Drive Contents
  const fetchContents = useCallback(async () => {
    if (!isAuthenticated && !isSetupRequired && localStorage.getItem("teledrive_auth_token") === null) {
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  }, [currentFolderId, section, searchQuery, typeFilter, sortBy, sortOrder, isAuthenticated, isSetupRequired]);

  // Fetch Stats & Settings & Folder Tree
  const fetchMetadata = useCallback(async () => {
    if (!isAuthenticated && !isSetupRequired && localStorage.getItem("teledrive_auth_token") === null) {
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
      } else {
        console.error("Failed to load metadata:", err);
      }
    }
  }, [isAuthenticated, isSetupRequired]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContents();
    }
  }, [fetchContents, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetadata();
    }
  }, [fetchMetadata, isAuthenticated]);

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

  // CRUD Actions
  const createFolder = async (name, color) => {
    try {
      const res = await DriveAPI.createFolder({
        name,
        color,
        parentId: currentFolderId === "root" ? null : currentFolderId
      });
      if (res.success) {
        showToast(`Folder "${name}" created successfully`);
        fetchContents();
        fetchMetadata();
        setActiveModal(null);
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create folder", "error");
      return false;
    }
  };

  const renameItem = async (item, newName) => {
    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { name: newName });
      } else {
        await DriveAPI.updateFile(item.id, { name: newName });
      }
      showToast("Renamed successfully");
      fetchContents();
      fetchMetadata();
      setActiveModal(null);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to rename", "error");
    }
  };

  const moveItem = async (item, targetFolderId) => {
    try {
      const folderId = targetFolderId === "root" ? null : targetFolderId;
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { parentId: folderId });
      } else {
        await DriveAPI.updateFile(item.id, { folderId });
      }
      showToast("Moved successfully");
      fetchContents();
      fetchMetadata();
      setActiveModal(null);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to move", "error");
    }
  };

  const toggleStar = async (item) => {
    try {
      const newStarred = item.is_starred ? 0 : 1;
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isStarred: newStarred });
      } else {
        await DriveAPI.updateFile(item.id, { isStarred: newStarred });
      }
      showToast(newStarred ? "Added to Starred" : "Removed from Starred");
      fetchContents();
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem((prev) => ({ ...prev, is_starred: newStarred }));
      }
    } catch (err) {
      showToast("Failed to update star", "error");
    }
  };

  const moveToTrash = async (item) => {
    if (!item) return;
    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isTrash: 1 });
      } else {
        await DriveAPI.updateFile(item.id, { isTrash: 1 });
      }
      showToast(`"${item.name}" moved to Trash`);
      setSelectedItem(null);
      fetchContents();
      fetchMetadata();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to move to trash", "error");
    }
  };

  const restoreFromTrash = async (item) => {
    if (!item) return;
    try {
      if (item.isFolder) {
        await DriveAPI.updateFolder(item.id, { isTrash: 0 });
      } else {
        await DriveAPI.updateFile(item.id, { isTrash: 0 });
      }
      showToast(`"${item.name}" restored from Trash`);
      setSelectedItem(null);
      fetchContents();
      fetchMetadata();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to restore", "error");
    }
  };

  const deletePermanently = async (item) => {
    if (!item) return;
    try {
      if (item.isFolder) {
        await DriveAPI.deleteFolder(item.id);
      } else {
        await DriveAPI.deleteFile(item.id);
      }
      showToast(`"${item.name}" deleted permanently`);
      setSelectedItem(null);
      fetchContents();
      fetchMetadata();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete", "error");
    }
  };

  const emptyTrash = async () => {
    try {
      await DriveAPI.emptyTrash();
      showToast("Trash emptied");
      fetchContents();
      fetchMetadata();
    } catch (err) {
      showToast("Failed to empty trash", "error");
    }
  };

  const refresh = () => {
    fetchContents();
    fetchMetadata();
  };

  const value = {
    // Auth
    isAuthenticated,
    isSetupRequired,
    authChecking,
    loginMaster,
    setupMaster,
    lockMaster,
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

    // Aliases to guarantee all components work
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
