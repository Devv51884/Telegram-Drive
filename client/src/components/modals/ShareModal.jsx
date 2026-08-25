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
  Mail
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

  useEffect(() => {
    if (isOpen && modalTargetItem) {
      loadShareSettings();
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
            : "Link sharing restricted to private / collaborators."
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

    if (collaboratorEmail.trim().toLowerCase() === (currentUser?.email || "").toLowerCase()) {
      return showToast("You already own this item", "info");
    }

    setIsAddingCollaborator(true);
    const type = modalTargetItem.isFolder ? "folder" : "file";

    try {
      const res = await DriveAPI.addCollaborator(type, modalTargetItem.id, {
        email: collaboratorEmail.trim().toLowerCase(),
        permission: collaboratorRole,
        notify: true
      });

      if (res.success) {
        setCollaborators(res.collaborators || []);
        setCollaboratorEmail("");
        showToast(`Access granted to ${collaboratorEmail.trim()}`);
        refresh();
      }
    } catch (err) {
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
        showToast(`Removed access for ${email}`);
        refresh();
      }
    } catch (err) {
      showToast("Failed to remove collaborator", "error");
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    showToast("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const getItemIcon = () => {
    if (modalTargetItem.isFolder) return <Folder className="w-5 h-5 text-blue-500 fill-current" />;
    switch (modalTargetItem.type) {
      case "video":
        return <Film className="w-5 h-5 text-rose-500" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700/60 shadow-inner">
              {getItemIcon()}
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                Share "{modalTargetItem.name}"
              </h3>
              <p className="text-[11px] text-slate-400">
                Grant email access and manage public share links
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading share configuration...</p>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* 1. SHARE WITH PEOPLE BY EMAIL (GOOGLE DRIVE STYLE)           */}
              {/* ============================================================ */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Share with People & Groups
                </label>

                <form onSubmit={handleAddCollaborator} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={collaboratorEmail}
                      onChange={(e) => setCollaboratorEmail(e.target.value)}
                      placeholder="Add people by Gmail (e.g. friend@gmail.com)"
                      className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={collaboratorRole}
                      onChange={(e) => setCollaboratorRole(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isAddingCollaborator || !collaboratorEmail.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isAddingCollaborator ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      <span>Share</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* ============================================================ */}
              {/* 2. PEOPLE WITH ACCESS LIST                                   */}
              {/* ============================================================ */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  People with access
                </h4>

                {/* Owner Row */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                      {(currentUser?.name || "User").charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {currentUser?.name || "You"} (You)
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {currentUser?.email || "Account Owner"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                    Owner
                  </span>
                </div>

                {/* Collaborators Rows */}
                {collaborators.map((collab) => (
                  <div
                    key={collab.id || collab.shared_with_email}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
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

              {/* ============================================================ */}
              {/* 3. GENERAL ACCESS (LINK SHARING)                             */}
              {/* ============================================================ */}
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
                          : "bg-slate-800 text-slate-500"
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
                          🔒 Restricted — Only added collaborators
                        </option>
                        <option value="public" className="bg-slate-900 text-white">
                          🌐 Anyone with the link — Public (View, Stream, Download)
                        </option>
                      </select>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {access === "public"
                          ? "Anyone on the Internet with this link can view, stream videos, and explore subfolders."
                          : "Only people added above can access this item from their 'Shared with me' tab."}
                      </p>
                    </div>
                  </div>

                  {/* Public Link Box */}
                  {access === "public" && (
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
            disabled={access !== "public" || !shareUrl}
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
