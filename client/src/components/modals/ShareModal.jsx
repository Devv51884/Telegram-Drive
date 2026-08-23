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
  UserCheck
} from "lucide-react";

export default function ShareModal() {
  const {
    activeModal,
    setActiveModal,
    modalTargetItem,
    currentUser,
    showToast,
    refreshContents
  } = useDrive();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState("private"); // 'private' | 'public'
  const [shareUrl, setShareUrl] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [copied, setCopied] = useState(false);

  const isOpen = activeModal === "share" && modalTargetItem;

  useEffect(() => {
    if (!isOpen || !modalTargetItem) return;

    setLoading(true);
    setCopied(false);
    const type = modalTargetItem.isFolder ? "folder" : "file";

    DriveAPI.getShareSettings(type, modalTargetItem.id)
      .then((data) => {
        if (data.success) {
          setAccess(data.share_access || "private");
          setShareUrl(data.share_url || "");
          setShareToken(data.share_token || "");
        }
      })
      .catch((err) => {
        console.error("Failed to load share settings:", err);
        showToast("Could not load share settings", "error");
      })
      .finally(() => setLoading(false));
  }, [isOpen, modalTargetItem]);

  if (!isOpen) return null;

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
            : "Link sharing restricted to private."
        );
        refreshContents();
      }
    } catch (err) {
      console.error("Update share failed:", err);
      showToast("Failed to update share permissions", "error");
    } finally {
      setSaving(false);
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
    if (modalTargetItem.isFolder) return <Folder className="w-5 h-5 text-blue-500" />;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
              {getItemIcon()}
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                Share "{modalTargetItem.name}"
              </h3>
              <p className="text-xs text-slate-400">
                Manage access and generate public links
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading share configuration...</p>
            </div>
          ) : (
            <>
              {/* Owner Info Row */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#252628] border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(currentUser?.name || "User").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {currentUser?.name || "You"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {currentUser?.email || "Account Owner"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                  Owner
                </span>
              </div>

              {/* General Access Box */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  General Access
                </h4>
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#252628] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      access === "public"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {access === "public" ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      {/* Access Dropdown / Toggle */}
                      <select
                        value={access}
                        onChange={(e) => handleAccessChange(e.target.value)}
                        disabled={saving}
                        className="w-full text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-none cursor-pointer p-0"
                      >
                        <option value="private" className="dark:bg-slate-900">
                          🔒 Restricted — Only you can access
                        </option>
                        <option value="public" className="dark:bg-slate-900">
                          🌐 Anyone with the link — Public (View, Stream, Download)
                        </option>
                      </select>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {access === "public"
                          ? "Anyone on the Internet with this link can view, stream videos, and download without signing in."
                          : "Only you and authorized owners can view or stream this item."}
                      </p>
                    </div>
                  </div>

                  {/* Shareable Link Box */}
                  {access === "public" && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1e1f20] text-xs font-mono text-slate-600 dark:text-slate-300 truncate border border-slate-200 dark:border-slate-700">
                        {shareUrl}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-sm transition-all"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
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
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#252628] border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleCopy}
            disabled={access !== "public" || !shareUrl}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Link2 className="w-3.5 h-3.5 text-blue-500" />
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <button
            onClick={() => setActiveModal(null)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
