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
  sendSignupVerificationLink: (data) => api.post("/auth/signup/send-verification", data).then((r) => r.data),
  verifyEmailToken: (token) => api.get("/auth/verify-email", { params: { token } }).then((r) => r.data),
  resendVerificationLink: (email) => api.post("/auth/resend-verification", { email }).then((r) => r.data),
  sendForgotPasswordLink: (email) => api.post("/auth/forgot-password/send-link", { email }).then((r) => r.data),
  resetPasswordWithToken: (data) => api.post("/auth/forgot-password/reset-with-token", data).then((r) => r.data),
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

  // Files (Direct + 8MB Chunked Engine for Large Files up to 2GB)
  uploadFile: async (file, folderId, onProgress, signal, uploadId = `up_${Date.now()}`) => {
    const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks (optimal balance: fast, low overhead, never timeouts)
    const fileSize = file.size;

    // 1. Direct Upload for Small Files <= 15MB
    if (fileSize <= 15 * 1024 * 1024) {
      const formData = new FormData();
      if (uploadId) formData.append("uploadId", uploadId);
      if (folderId && folderId !== "root") formData.append("folderId", folderId);
      formData.append("file", file);

      return api
        .post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 0,
          signal,
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
    }

    // 2. Resilient 8MB Chunked Upload Engine for Large Files > 15MB (up to 2GB)
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    let uploadedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (signal?.aborted) {
        api.post("/files/upload-chunk/cancel", { uploadId, totalChunks }).catch(() => {});
        throw new Error("canceled");
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(fileSize, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      const chunkForm = new FormData();
      chunkForm.append("uploadId", uploadId);
      chunkForm.append("chunkIndex", chunkIndex.toString());
      chunkForm.append("totalChunks", totalChunks.toString());
      chunkForm.append("chunk", chunkBlob, file.name);

      // Upload chunk with automatic retry
      let attempts = 0;
      let chunkSuccess = false;
      let lastErr = null;

      while (attempts < 5 && !chunkSuccess) {
        if (signal?.aborted) throw new Error("canceled");
        attempts++;
        try {
          await api.post(`/files/upload-chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}`, chunkForm, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120000, // 2 minutes per 8MB chunk is very safe
            signal,
            onUploadProgress: (e) => {
              if (onProgress && e.total) {
                const currentLoaded = uploadedBytes + e.loaded;
                const percent = Math.min(85, Math.max(1, Math.round((currentLoaded * 85) / fileSize)));
                onProgress({
                  loaded: currentLoaded,
                  total: fileSize,
                  percent,
                  stage: "browser"
                });
              }
            }
          });
          chunkSuccess = true;
          uploadedBytes += (end - start);
        } catch (err) {
          lastErr = err;
          if (signal?.aborted || err.message === "canceled") throw err;
          console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} attempt ${attempts} failed:`, err.message);
          // Exponential backoff
          await new Promise((res) => setTimeout(res, attempts * 1000));
        }
      }

      if (!chunkSuccess) {
        api.post("/files/upload-chunk/cancel", { uploadId, totalChunks }).catch(() => {});
        throw lastErr || new Error(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}`);
      }
    }

    if (onProgress) {
      onProgress({
        loaded: fileSize,
        total: fileSize,
        percent: 88,
        stage: "assembling"
      });
    }

    // 3. Complete Assembly & Telegram Upload on Server (Async Resilient Engine)
    const completeRes = await api.post("/files/upload-chunk/complete", {
      uploadId,
      totalChunks,
      fileName: file.name,
      folderId: folderId && folderId !== "root" ? folderId : null,
      mimeType: file.type,
      totalSize: fileSize
    }, {
      timeout: 30000,
      signal
    });

    // If server responded immediately with file, return directly
    if (completeRes.data?.file) {
      return completeRes.data;
    }

    // Server is processing in background; poll /files/upload-progress/:uploadId until done
    let pollCount = 0;
    const maxPolls = 600; // up to 10 minutes
    while (pollCount < maxPolls) {
      if (signal?.aborted) throw new Error("canceled");
      await new Promise((res) => setTimeout(res, 1000));
      pollCount++;

      try {
        const progressRes = await api.get(`/files/upload-progress/${encodeURIComponent(uploadId)}`);
        const prog = progressRes.data?.progress;
        if (prog) {
          if (prog.status === "done" && prog.file) {
            if (onProgress) {
              onProgress({
                loaded: fileSize,
                total: fileSize,
                percent: 100,
                stage: "done"
              });
            }
            return { success: true, file: prog.file };
          }
          if (prog.status === "error") {
            throw new Error(prog.error || "Telegram upload failed on server");
          }
          if (onProgress) {
            let telegramPercent = 90;
            if (prog.status === "assembling") {
              telegramPercent = 88;
            } else if (prog.percent !== undefined) {
              telegramPercent = Math.min(99, Math.max(90, Math.round(90 + (prog.percent || 0) * 0.09)));
            }
            onProgress({
              loaded: Math.round(fileSize * (telegramPercent / 100)),
              total: fileSize,
              percent: telegramPercent,
              telegramPercent: prog.percent || 0,
              stage: prog.status === "assembling" ? "assembling" : "telegram_cloud"
            });
          }
        }
      } catch (pollErr) {
        if (pollErr.message === "canceled" || signal?.aborted) throw pollErr;
        if (pollErr.message?.includes("Telegram upload failed")) throw pollErr;
      }
    }

    throw new Error("Upload processing took longer than expected. Please check your files list.");
  },
  getUploadProgress: (uploadId) =>
    api.get(`/files/upload-progress/${encodeURIComponent(uploadId)}`).then((r) => r.data),
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
  requestShareAccess: (token, data) => api.post(`/share/request-access/${token}`, data).then((r) => r.data),
  getShareRequests: () => api.get("/share/requests").then((r) => r.data),
  respondShareRequest: (id, data) => api.post(`/share/requests/${id}/respond`, data).then((r) => r.data),

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
  pingTelegramSystem: () => api.post("/admin/system/ping").then((r) => r.data),
  getEmailStatus: () => api.get("/admin/email/status").then((r) => r.data),
  updateEmailSettings: (data) => api.post("/admin/email/settings", data).then((r) => r.data),
  testEmailDelivery: (toEmail) => api.post("/admin/email/test", { toEmail }).then((r) => r.data)
};

export default DriveAPI;
