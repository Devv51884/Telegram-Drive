import axios from "axios";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000 // 2 minutes for standard requests
});

// Automatic Authorization Header Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("teledrive_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const DriveAPI = {
  // User Authentication & Profile CRUD
  signupUser: (data) => api.post("/auth/signup", data).then((r) => r.data),
  signupSendOtp: (data) => api.post("/auth/signup/send-otp", data).then((r) => r.data),
  signupVerifyOtp: (data) => api.post("/auth/signup/verify-otp", data).then((r) => r.data),
  forgotPasswordSendOtp: (email) => api.post("/auth/forgot-password/send-otp", { email }).then((r) => r.data),
  forgotPasswordVerifyOtp: (data) => api.post("/auth/forgot-password/verify-otp", data).then((r) => r.data),
  loginUser: (data) => api.post("/auth/login", data).then((r) => r.data),
  getCurrentUser: () => api.get("/auth/me").then((r) => r.data),
  updateProfile: (data) => api.put("/auth/profile", data).then((r) => r.data),
  updatePassword: (data) => api.put("/auth/password", data).then((r) => r.data),
  update2FAPin: (data) => api.put("/auth/2fa-pin", data).then((r) => r.data),
  verify2FAPin: (pin) => api.post("/auth/verify-pin", { pin }).then((r) => r.data),
  deleteAccount: (password) => api.delete("/auth/account", { data: { password } }).then((r) => r.data),
  logoutUser: () => api.post("/auth/logout").then((r) => r.data),

  // Contents & Stats
  getContents: (params = {}) => api.get("/drive/contents", { params }).then((r) => r.data),
  getStats: () => api.get("/drive/stats").then((r) => r.data),
  emptyTrash: () => api.post("/drive/empty-trash").then((r) => r.data),

  // Bulk Operations
  bulkTrash: (fileIds = [], folderIds = []) =>
    api.post("/drive/bulk-trash", { fileIds, folderIds }).then((r) => r.data),
  bulkRestore: (fileIds = [], folderIds = []) =>
    api.post("/drive/bulk-restore", { fileIds, folderIds }).then((r) => r.data),
  bulkDelete: (fileIds = [], folderIds = []) =>
    api.post("/drive/bulk-delete", { fileIds, folderIds }).then((r) => r.data),
  bulkMove: (fileIds = [], folderIds = [], targetFolderId = "root") =>
    api.post("/drive/bulk-move", { fileIds, folderIds, targetFolderId }).then((r) => r.data),
  bulkStar: (fileIds = [], folderIds = [], isStarred = 1) =>
    api.post("/drive/bulk-star", { fileIds, folderIds, isStarred }).then((r) => r.data),

  // Folders
  getFolders: (params = {}) => api.get("/folders", { params }).then((r) => r.data),
  getFolderTree: () => api.get("/folders/tree").then((r) => r.data),
  createFolder: (data) => api.post("/folders", data).then((r) => r.data),
  updateFolder: (id, data) => api.patch(`/folders/${id}`, data).then((r) => r.data),
  deleteFolder: (id) => api.delete(`/folders/${id}`).then((r) => r.data),

  // Files
  uploadFile: (file, folderId, onProgress, signal, uploadId) => {
    const formData = new FormData();
    if (uploadId) {
      formData.append("uploadId", uploadId);
    }
    if (folderId && folderId !== "root") {
      formData.append("folderId", folderId);
    }
    formData.append("file", file);
    return api
      .post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0, // Infinite timeout for large file streams up to 2GB
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        signal, // AbortSignal for instant upload cancellation
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percent,
              stage: "browser"
            });
          }
        }
      })
      .then((r) => r.data);
  },
  getUploadProgress: (uploadId) =>
    api.get(`/files/upload-progress/${uploadId}`).then((r) => r.data),
  importLink: (postUrl, folderId, customName) =>
    api.post("/files/import-link", { postUrl, folderId, customName }).then((r) => r.data),
  updateFile: (id, data) => api.patch(`/files/${id}`, data).then((r) => r.data),
  deleteFile: (id) => api.delete(`/files/${id}`).then((r) => r.data),
  getStreamUrl: (id) => {
    const token = localStorage.getItem("teledrive_auth_token");
    return token ? `${API_BASE}/files/${id}/stream?token=${encodeURIComponent(token)}&_v=3` : `${API_BASE}/files/${id}/stream?_v=3`;
  },
  getDownloadUrl: (id) => {
    const token = localStorage.getItem("teledrive_auth_token");
    return token ? `${API_BASE}/files/${id}/download?token=${encodeURIComponent(token)}&_v=3` : `${API_BASE}/files/${id}/download?_v=3`;
  },

  // Link Sharing APIs
  getShareSettings: (type, id) => api.get(`/share/manage/${type}/${id}`).then((r) => r.data),
  updateShareSettings: (type, id, data) => api.post(`/share/manage/${type}/${id}`, data).then((r) => r.data),
  getCollaborators: (type, id) => api.get(`/share/collaborators/${type}/${id}`).then((r) => r.data),
  addCollaborator: (type, id, data) => api.post(`/share/collaborators/${type}/${id}`, data).then((r) => r.data),
  removeCollaborator: (type, id, email) =>
    api.delete(`/share/collaborators/${type}/${id}/${encodeURIComponent(email)}`).then((r) => r.data),
  getPublicShareInfo: (token, folderId = null) =>
    axios
      .get(`${API_BASE}/share/public/${token}`, {
        params: folderId && folderId !== "root" ? { folderId } : {}
      })
      .then((r) => r.data),
  getPublicShareStreamUrl: (token) => `${API_BASE}/share/public/${token}/stream?_v=3`,
  getPublicShareDownloadUrl: (token) => `${API_BASE}/share/public/${token}/download?_v=3`,
  getPublicFolderFileStreamUrl: (token, fileId) => `${API_BASE}/share/public/${token}/file/${fileId}/stream?_v=3`,
  getPublicFolderFileDownloadUrl: (token, fileId) => `${API_BASE}/share/public/${token}/file/${fileId}/download?_v=3`,

  // Settings & Telegram Auth
  getSettings: () => api.get("/settings").then((r) => r.data),
  sendTelegramCode: (data) => {
    const payload = typeof data === "string" ? { phoneNumber: data } : data;
    return api.post("/settings/telegram-auth/send-code", payload).then((r) => r.data);
  },
  loginTelegram: (data) => api.post("/settings/telegram-auth/login", data).then((r) => r.data),
  logoutTelegram: () => api.post("/settings/telegram-auth/logout").then((r) => r.data),

  // Admin Panel APIs
  getAdminOverview: () => api.get("/admin/overview").then((r) => r.data),
  getAdminUsers: () => api.get("/admin/users").then((r) => r.data),
  updateUserRole: (id, role) => api.post(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  updateUserStatus: (id, status) => api.post(`/admin/users/${id}/status`, { status }).then((r) => r.data),
  adminResetPassword: (id, newPassword) => api.post(`/admin/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
  deleteAdminUser: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
  getAdminFiles: (params) => api.get("/admin/files", { params }).then((r) => r.data),
  deleteAdminFile: (id) => api.delete(`/admin/files/${id}`).then((r) => r.data),
  pingTelegramSystem: () => api.post("/admin/system/ping").then((r) => r.data)
};

export default DriveAPI;
