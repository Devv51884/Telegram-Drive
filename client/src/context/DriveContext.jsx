import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import DriveAPI from "../services/api.js";

const DriveContext = createContext(null);

export function DriveProvider({ children }) {
  // Authentication & Security State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  // Helper to persist navigation across page reloads
  const getInitialFolder = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("folder") || localStorage.getItem("teledrive_last_folder") || "root";
    } catch {
      return "root";
    }
  };

  const getInitialSection = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("section") || localStorage.getItem("teledrive_last_section") || "my_drive";
    } catch {
      return "my_drive";
    }
  };

  // Navigation & Location
  const [section, setSection] = useState(getInitialSection); // 'my_drive', 'starred', 'trash', 'recent', 'telegram_imports'
  const [currentFolderId, setCurrentFolderId] = useState(getInitialFolder);
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

  // Selection & Multi-Select
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]); // Array of items: [{ id, isFolder, name, is_starred, is_trash }]
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Modals & Drawers
  const [activeModal, setActiveModal] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [modalTargetItem, setModalTargetItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Link Share State
  const [shareToken, setShareToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("share") || null;
    } catch {
      return null;
    }
  });

  const openShareModal = (item) => {
    setModalTargetItem(item);
    setActiveModal("share");
  };

  const handleSetPreviewItem = (item) => {
    setPreviewItem(item);
    setSelectedItem(null);
    setSelectedItems([]);
    setIsMultiSelectMode(false);
    try {
      const url = new URL(window.location);
      if (item && item.id) {
        url.searchParams.set("file", item.id);
      } else {
        url.searchParams.delete("file");
      }
      window.history.replaceState({}, "", url);
    } catch {}
  };

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
  const loginUser = async (email, password, pin = "") => {
    const res = await DriveAPI.loginUser({ email, password, pin });
    if (res.requires2FAPin) {
      return { requires2FAPin: true, message: res.message };
    }
    if (res.success && res.token) {
      localStorage.setItem("teledrive_auth_token", res.token);
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      showToast(`Welcome back, ${res.user.name}!`);
      fetchContents();
      fetchMetadata();
      return { success: true };
    }
    return { success: false, error: res.error || "Login failed" };
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

  const updateProfile = async (name, email) => {
    try {
      const res = await DriveAPI.updateProfile({ name, email });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        showToast("Profile details updated successfully!");
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update profile", "error");
      return false;
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const res = await DriveAPI.updatePassword({ currentPassword, newPassword });
      if (res.success) {
        showToast("Account password changed successfully!");
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to change password", "error");
      return false;
    }
  };

  const update2FAPin = async (pin, isEnabled, currentPassword) => {
    try {
      const res = await DriveAPI.update2FAPin({ pin, isEnabled, currentPassword });
      if (res.success) {
        setCurrentUser((prev) => ({ ...prev, is2FAEnabled: res.is2FAEnabled }));
        showToast(res.message || "2FA PIN updated successfully!");
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update 2FA PIN", "error");
      return false;
    }
  };

  const deleteAccount = async (password) => {
    try {
      const res = await DriveAPI.deleteAccount(password);
      if (res.success) {
        localStorage.removeItem("teledrive_auth_token");
        setCurrentUser(null);
        setIsAuthenticated(false);
        showToast("Account and files permanently deleted");
        return true;
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete account", "error");
      return false;
    }
  };

  const logoutUser = () => {
    DriveAPI.logoutUser().catch(() => {});
    localStorage.removeItem("teledrive_auth_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setFolders([]);
    setFiles([]);
    setSelectedItems([]);
    setSelectedItem(null);
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
        // Auto-restore preview modal on page refresh if ?file=file_id in URL
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const fileParam = urlParams.get("file");
          if (fileParam && (data.files || []).length > 0) {
            const matchedFile = data.files.find((f) => f.id === fileParam);
            if (matchedFile) {
              setPreviewItem(matchedFile);
            }
          }
        } catch {}
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
    setSelectedItems([]);
    setSearchQuery("");
    try {
      localStorage.setItem("teledrive_last_folder", folderId);
      const url = new URL(window.location);
      url.searchParams.set("folder", folderId);
      window.history.replaceState({}, "", url);
    } catch {}
  };

  const navigateToSection = (newSection) => {
    setSection(newSection);
    setCurrentFolderId("root");
    setSelectedItem(null);
    setSelectedItems([]);
    setSearchQuery("");
    try {
      localStorage.setItem("teledrive_last_section", newSection);
      localStorage.setItem("teledrive_last_folder", "root");
      const url = new URL(window.location);
      url.searchParams.set("section", newSection);
      url.searchParams.set("folder", "root");
      window.history.replaceState({}, "", url);
    } catch {}
    if (newSection === "my_drive") {
      setBreadcrumbs([{ id: "root", name: "My Drive" }]);
    } else if (newSection === "starred") {
      setBreadcrumbs([{ id: "starred", name: "Starred Items" }]);
    } else if (newSection === "trash") {
      setBreadcrumbs([{ id: "trash", name: "Trash Bin" }]);
    } else if (newSection === "telegram_imports") {
      setBreadcrumbs([{ id: "telegram_imports", name: "Telegram Channel Imports" }]);
    } else if (newSection === "admin") {
      setBreadcrumbs([{ id: "admin", name: "Admin Control Center" }]);
    }
  };

  // ==========================================
  // MULTI-SELECTION & BULK ACTIONS
  // ==========================================

  const isItemSelected = (id) => selectedItems.some((item) => item.id === id);

  const enterMultiSelectMode = (item) => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(40);
      } catch {}
    }
    setIsMultiSelectMode(true);
    if (item) {
      const itemObj = {
        id: item.id,
        name: item.name,
        isFolder: Boolean(item.isFolder || item.color),
        is_starred: item.is_starred || 0,
        is_trash: item.is_trash || 0
      };
      setSelectedItems((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        return [...prev, itemObj];
      });
      setSelectedItem(item);
    }
  };

  const toggleSelectItem = (item, isMulti = false) => {
    if (!item) return;
    const itemObj = {
      id: item.id,
      name: item.name,
      isFolder: Boolean(item.isFolder || item.color),
      is_starred: item.is_starred || 0,
      is_trash: item.is_trash || 0
    };

    if (isMulti || isMultiSelectMode) {
      setSelectedItems((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        let next;
        if (exists) {
          next = prev.filter((i) => i.id !== item.id);
        } else {
          next = [...prev, itemObj];
        }
        if (next.length === 0) {
          setIsMultiSelectMode(false);
          setSelectedItem(null);
        } else {
          setIsMultiSelectMode(true);
          setSelectedItem(next[next.length - 1] || null);
        }
        return next;
      });
    } else {
      setSelectedItems([itemObj]);
      setSelectedItem(item);
      setIsMultiSelectMode(false);
    }
  };

  const selectAll = () => {
    const allFolderItems = folders.map((f) => ({
      id: f.id,
      name: f.name,
      isFolder: true,
      is_starred: f.is_starred,
      is_trash: f.is_trash
    }));
    const allFileItems = files.map((f) => ({
      id: f.id,
      name: f.name,
      isFolder: false,
      is_starred: f.is_starred,
      is_trash: f.is_trash
    }));
    setSelectedItems([...allFolderItems, ...allFileItems]);
    setIsMultiSelectMode(true);
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setSelectedItem(null);
    setIsMultiSelectMode(false);
  };

  const bulkTrash = async () => {
    if (selectedItems.length === 0) return;
    const fileIds = selectedItems.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = selectedItems.filter((i) => i.isFolder).map((i) => i.id);
    const count = selectedItems.length;

    // Optimistic UI
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setFolders((prev) => prev.filter((f) => !folderIds.includes(f.id)));
    clearSelection();
    showToast(`Moved ${count} items to Trash`);

    try {
      await DriveAPI.bulkTrash(fileIds, folderIds);
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to move items to trash", "error");
    }
  };

  const bulkRestore = async () => {
    if (selectedItems.length === 0) return;
    const fileIds = selectedItems.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = selectedItems.filter((i) => i.isFolder).map((i) => i.id);
    const count = selectedItems.length;

    // Optimistic UI
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setFolders((prev) => prev.filter((f) => !folderIds.includes(f.id)));
    clearSelection();
    showToast(`Restored ${count} items from Trash`);

    try {
      await DriveAPI.bulkRestore(fileIds, folderIds);
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to restore items", "error");
    }
  };

  const bulkDeletePermanently = async () => {
    if (selectedItems.length === 0) return;
    const fileIds = selectedItems.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = selectedItems.filter((i) => i.isFolder).map((i) => i.id);
    const count = selectedItems.length;

    // Optimistic UI
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setFolders((prev) => prev.filter((f) => !folderIds.includes(f.id)));
    clearSelection();
    showToast(`Deleted ${count} items permanently`);

    try {
      await DriveAPI.bulkDelete(fileIds, folderIds);
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to delete items permanently", "error");
    }
  };

  const bulkMove = async (targetFolderId) => {
    if (selectedItems.length === 0) return;
    const fileIds = selectedItems.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = selectedItems.filter((i) => i.isFolder).map((i) => i.id);
    const count = selectedItems.length;

    // Optimistic UI
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setFolders((prev) => prev.filter((f) => !folderIds.includes(f.id)));
    clearSelection();
    setActiveModal(null);
    showToast(`Moved ${count} items successfully`);

    try {
      await DriveAPI.bulkMove(fileIds, folderIds, targetFolderId);
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to move items", "error");
    }
  };

  const bulkToggleStar = async () => {
    if (selectedItems.length === 0) return;
    const fileIds = selectedItems.filter((i) => !i.isFolder).map((i) => i.id);
    const folderIds = selectedItems.filter((i) => i.isFolder).map((i) => i.id);
    const anyUnstarred = selectedItems.some((i) => !i.is_starred);
    const newStar = anyUnstarred ? 1 : 0;
    const count = selectedItems.length;

    // Optimistic UI
    setFiles((prev) =>
      prev.map((f) => (fileIds.includes(f.id) ? { ...f, is_starred: newStar } : f))
    );
    setFolders((prev) =>
      prev.map((f) => (folderIds.includes(f.id) ? { ...f, is_starred: newStar } : f))
    );
    setSelectedItems((prev) => prev.map((i) => ({ ...i, is_starred: newStar })));
    showToast(newStar ? `Starred ${count} items` : `Unstarred ${count} items`);

    try {
      await DriveAPI.bulkStar(fileIds, folderIds, newStar);
      fetchMetadata();
    } catch (err) {
      fetchContents(true);
      showToast("Failed to update stars", "error");
    }
  };

  // ==========================================
  // SINGLE ITEM ACTIONS
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
    setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
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
    setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
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
    setSelectedItems((prev) => prev.filter((i) => i.id !== item.id));
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
    // Auth & User Profile
    currentUser,
    isAuthenticated,
    authChecking,
    loginUser,
    signupUser,
    updateProfile,
    updatePassword,
    update2FAPin,
    deleteAccount,
    logoutUser,
    checkAuth,

    // Location & Navigation
    section,
    setSection: navigateToSection,
    navigateToSection,
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

    // Selection & Multi-Select
    selectedItem,
    setSelectedItem,
    selectedItems,
    setSelectedItems,
    isMultiSelectMode,
    setIsMultiSelectMode,
    enterMultiSelectMode,
    toggleSelectItem,
    selectAll,
    clearSelection,
    isItemSelected,

    // Bulk Operations
    bulkTrash,
    bulkRestore,
    bulkDeletePermanently,
    bulkMove,
    bulkToggleStar,

    // Modals
    activeModal,
    setActiveModal,
    previewItem,
    setPreviewItem: handleSetPreviewItem,
    modalTargetItem,
    setModalTargetItem,
    isDetailsOpen,
    setIsDetailsOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,

    // Toast
    toast,
    showToast,

    // Single Actions
    createFolder,
    renameItem,
    moveItem,
    toggleStar,
    moveToTrash,
    restoreFromTrash,
    deletePermanently,
    emptyTrash,

    // Link Sharing
    openShareModal,
    shareToken,
    setShareToken,

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
