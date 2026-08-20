import axios from "axios";

const API_BASE = "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 300000 // 5 minutes for large uploads
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
  // User Authentication (Signup & Login)
  signupUser: (data) => api.post("/auth/signup", data).then((r) => r.data),
  loginUser: (data) => api.post("/auth/login", data).then((r) => r.data),
  getCurrentUser: () => api.get("/auth/me").then((r) => r.data),
  logoutUser: () => api.post("/auth/logout").then((r) => r.data),

  // Master PIN / Password Security
  getAuthStatus: () => api.get("/settings/auth/status").then((r) => r.data),
  setupMasterPassword: (password) => api.post("/settings/auth/setup", { password }).then((r) => r.data),
  loginMasterPassword: (password) => api.post("/settings/auth/login", { password }).then((r) => r.data),
  changeMasterPassword: (currentPassword, newPassword) =>
    api.post("/settings/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),
  logoutMaster: () => api.post("/settings/auth/logout").then((r) => r.data),

  // Contents & Stats
  getContents: (params = {}) => api.get("/drive/contents", { params }).then((r) => r.data),
  getStats: () => api.get("/drive/stats").then((r) => r.data),
  emptyTrash: () => api.post("/drive/empty-trash").then((r) => r.data),

  // Folders
  getFolders: (params = {}) => api.get("/folders", { params }).then((r) => r.data),
  getFolderTree: () => api.get("/folders/tree").then((r) => r.data),
  createFolder: (data) => api.post("/folders", data).then((r) => r.data),
  updateFolder: (id, data) => api.patch(`/folders/${id}`, data).then((r) => r.data),
  deleteFolder: (id) => api.delete(`/folders/${id}`).then((r) => r.data),

  // Files
  uploadFile: (file, folderId, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId && folderId !== "root") {
      formData.append("folderId", folderId);
    }
    return api
      .post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      })
      .then((r) => r.data);
  },
  importLink: (postUrl, folderId, customName) =>
    api.post("/files/import-link", { postUrl, folderId, customName }).then((r) => r.data),
  updateFile: (id, data) => api.patch(`/files/${id}`, data).then((r) => r.data),
  deleteFile: (id) => api.delete(`/files/${id}`).then((r) => r.data),
  getStreamUrl: (id) => {
    const token = localStorage.getItem("teledrive_auth_token");
    return token ? `${API_BASE}/files/${id}/stream?token=${encodeURIComponent(token)}` : `${API_BASE}/files/${id}/stream`;
  },
  getDownloadUrl: (id) => {
    const token = localStorage.getItem("teledrive_auth_token");
    return token ? `${API_BASE}/files/${id}/download?token=${encodeURIComponent(token)}` : `${API_BASE}/files/${id}/download`;
  },

  // Settings & Telegram Auth
  getSettings: () => api.get("/settings").then((r) => r.data),
  sendTelegramCode: (data) => {
    const payload = typeof data === "string" ? { phoneNumber: data } : data;
    return api.post("/settings/telegram-auth/send-code", payload).then((r) => r.data);
  },
  loginTelegram: (data) => api.post("/settings/telegram-auth/login", data).then((r) => r.data),
  logoutTelegram: () => api.post("/settings/telegram-auth/logout").then((r) => r.data)
};

export default DriveAPI;
