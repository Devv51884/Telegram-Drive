import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  X,
  Link2,
  Lock,
  Globe,
  Copy,
  Check,
  Loader2,
  Folder,
  Film,
  Image as ImageIcon,
  FileText,
  File,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Users,
  ChevronDown,
  Mail,
  Inbox,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

export default function ShareModal() {
  const {
    activeModal,
    setActiveModal,
    modalTargetItem,
    currentUser,
    showToast,
    refresh
  } = useDrive();

  const [activeTab, setActiveTab] = useState("share"); // 'share' | 'requests'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState("private"); // 'private' | 'public'
  const [shareUrl, setShareUrl] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Collaborator Email Sharing State
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaboratorRole, setCollaboratorRole] = useState("viewer"); // 'viewer' | 'editor'
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  // Pending Share Access Requests State
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const isOpen = activeModal === "share" && modalTargetItem;

  const loadShareSettings = async () => {
    if (!modalTargetItem) return;
    setLoading(true);
    setCopied(false);
    const type = modalTargetItem.isFolder ? "folder" : "file";

    try {
      const [shareData, collabData] = await Promise.all([
        DriveAPI.getShareSettings(type, modalTargetItem.id),
        DriveAPI.getCollaborators(type, modalTargetItem.id).catch(() => ({ success: true, collaborators: [] }))
      ]);

      if (shareData.success) {
        setAccess(shareData.share_access || "private");
        setShareUrl(shareData.share_url || "");
        setShareToken(shareData.share_token || "");
      }

      if (collabData.success) {
        setCollaborators(collabData.collaborators || []);
      }
    } catch (err) {
      console.error("Failed to load share settings:", err);
      showToast("Could not load share settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await DriveAPI.getShareRequests();
      if (res.success) {
        // Filter requests for the current item if available
        const reqs = (res.requests || []).filter(
          (r) => String(r.item_id) === String(modalTargetItem?.id) || !modalTargetItem?.id
        );
        setPendingRequests(reqs);
      }
    } catch (err) {
      console.warn("Failed to load share requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen && modalTargetItem) {
      loadShareSettings();
      loadPendingRequests();
    }
  }, [isOpen, modalTargetItem]);

  if (!isOpen) return null;

  // Update General Public / Restricted Link Access
  const handleAccessChange = async (newAccess) => {
    setAccess(newAccess);
    setSaving(true);
    const type = modalTargetItem.isFolder ? "folder" : "file";

    try {
      const res = await DriveAPI.updateShareSettings(type, modalTargetItem.id, {
        share_access: newAccess
      });
      if (res.success) {
        setShareUrl(res.share_url);
        setShareToken(res.share_token);
        showToast(
          newAccess === "public"
            ? "Link sharing activated! Anyone with the link can view."
            : "Restricted link mode enabled. Unauthorized visitors can request access."
        );
        refresh();
      }
    } catch (err) {
      console.error("Update share failed:", err);
      showToast("Failed to update share permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add Collaborator by Email
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collaboratorEmail.trim() || !collaboratorEmail.includes("@")) {
      return showToast("Please enter a valid Gmail / Email address", "error");
    }

    setIsAddingCollaborator(true);
    const type = modalTargetItem.isFolder ? "folder" : "file";

    try {
      const res = await DriveAPI.addCollaborator(type, modalTargetItem.id, {
        email: collaboratorEmail.trim(),
        permission: collaboratorRole
      });

      if (res.success) {
        setCollaborators(res.collaborators || []);
        setCollaboratorEmail("");
        showToast(`Collaborator ${collaboratorEmail} added successfully!`);
        refresh();
      }
    } catch (err) {
      console.error("Add collaborator failed:", err);
      showToast(err.response?.data?.error || "Failed to add collaborator", "error");
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  // Remove Collaborator
  const handleRemoveCollaborator = async (email) => {
    const type = modalTargetItem.isFolder ? "folder" : "file";
    try {
      const res = await DriveAPI.removeCollaborator(type, modalTargetItem.id, email);
      if (res.success) {
        setCollaborators(res.collaborators || []);
        showToast(`Access revoked for ${email}`);
        refresh();
      }
    } catch (err) {
      console.error("Remove collaborator failed:", err);
      showToast("Failed to remove collaborator", "error");
    }
  };

  // Respond to Access Request (Approve / Reject)
  const handleRespondRequest = async (requestId, action, permission = "viewer") => {
    setRespondingId(requestId);
    try {
      const res = await DriveAPI.respondShareRequest(requestId, { action, permission });
      if (res.success) {
        showToast(res.message || `Request ${action}ed`);
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        loadShareSettings();
        refresh();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update request", "error");
    } finally {
      setRespondingId(null);
    }
  };

  // Copy Link to Clipboard
  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const isFolder = modalTargetItem.isFolder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: isFolder
                  ? `${modalTargetItem.color || "#4285f4"}20`
                  : "rgba(59, 130, 246, 0.15)",
                color: isFolder ? modalTargetItem.color || "#4285f4" : "#3b82f6"
              }}
            >
              {isFolder ? <Folder className="w-5 h-5 fill-current" /> : <File className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">
                Share "{modalTargetItem.name}"
              </h3>
              <p className="text-[11px] text-slate-400">
                {isFolder ? "Folder & subfolder contents" : "Cloud file"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800/80 px-5 pt-2 bg-slate-900/60">
          <button
            onClick={() => setActiveTab("share")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "share"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Sharing & People</span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 relative ${
              activeTab === "requests"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Access Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading sharing permissions...</p>
            </div>
          ) : activeTab === "requests" ? (
            /* ============================================================ */
            /* ACCESS REQUESTS TAB                                          */
            /* ============================================================ */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pending Access Requests ({pendingRequests.length})
                </h4>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 bg-slate-850/50 rounded-2xl border border-slate-800 p-6 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                  <p className="text-xs font-bold text-slate-200">No pending access requests</p>
                  <p className="text-[11px] text-slate-400">
                    When someone visits your restricted link and asks for permission, their request will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {req.requester_name ? req.requester_name.charAt(0).toUpperCase() : req.requester_email.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-white truncate">
                              {req.requester_name || req.requester_email}
                            </h5>
                            <p className="text-[10px] text-slate-400 truncate">{req.requester_email}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {req.message && (
                        <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 italic">
                          "{req.message}"
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleRespondRequest(req.id, "reject")}
                          disabled={respondingId === req.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-400 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Deny</span>
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, "approve", "viewer")}
                          disabled={respondingId === req.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-md shadow-blue-600/20 flex items-center gap-1"
                        >
                          {respondingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Access</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* SHARING & PEOPLE TAB                                         */
            /* ============================================================ */
            <>
              {/* 1. Add Collaborators Form */}
              <form onSubmit={handleAddCollaborator} className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Add People & Groups
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="Add Gmail or email address..."
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <select
                    value={collaboratorRole}
                    onChange={(e) => setCollaboratorRole(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isAddingCollaborator || !collaboratorEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex-shrink-0"
                  >
                    {isAddingCollaborator ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                  </button>
                </div>
              </form>

              {/* 2. People with Access List */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  People with access
                </h4>

                {/* Owner Row */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-850 border border-slate-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{currentUser?.name || "You"}</span>
                        <span className="text-[10px] text-slate-400 font-normal">(you)</span>
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Owner
                  </span>
                </div>

                {/* Collaborators Rows */}
                {collaborators.map((collab) => (
                  <div
                    key={collab.shared_with_email}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-850 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {collab.shared_with_email.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {collab.user_name || collab.shared_with_email}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {collab.shared_with_email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 capitalize">
                        {collab.permission}
                      </span>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.shared_with_email)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. General Link Access (Supports Restricted Link Generation!) */}
              <div className="pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  General Link Access
                </h4>

                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-850/80 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl mt-0.5 flex-shrink-0 ${
                        access === "public"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {access === "public" ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <select
                        value={access}
                        onChange={(e) => handleAccessChange(e.target.value)}
                        disabled={saving}
                        className="w-full text-xs font-bold text-white bg-transparent border-none focus:outline-none cursor-pointer p-0"
                      >
                        <option value="private" className="bg-slate-900 text-white">
                          🔒 Restricted — Only authorized users (shows Request Access prompt to others)
                        </option>
                        <option value="public" className="bg-slate-900 text-white">
                          🌐 Anyone with the link — Public (Instant View, Stream, Download)
                        </option>
                      </select>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {access === "public"
                          ? "Anyone on the Internet with this link can view, stream videos, and explore files."
                          : "Restricted link is generated. Unauthorized users will see a Google Drive-style 'Request Access' screen and you'll get an email notification."}
                      </p>
                    </div>
                  </div>

                  {/* Share Link Box (Always visible and copyable for both Restricted & Public!) */}
                  {shareUrl && (
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 text-xs font-mono text-slate-300 truncate border border-slate-800 select-all">
                        {shareUrl}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all flex-shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-850 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleCopy}
            disabled={!shareUrl}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Link2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <button
            onClick={() => setActiveModal(null)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-md shadow-blue-600/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
