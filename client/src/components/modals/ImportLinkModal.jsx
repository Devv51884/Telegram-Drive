import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import { X, Link2, Send, CheckCircle2, Film, Image as ImageIcon, FileText, Music, File, Sparkles } from "lucide-react";

export default function ImportLinkModal() {
  const { activeModal, setActiveModal, currentFolderId, refresh, showToast, settings } = useDrive();
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);

  if (activeModal !== "import_link") return null;

  const handleImport = async (e) => {
    e.preventDefault();
    if (!postUrl.trim()) return;

    if (!settings?.telegramUser?.connected) {
      showToast("Please connect your Cloud Sync node in Settings to enable direct stream imports!", "error");
      setActiveModal("settings");
      return;
    }

    setLoading(true);
    try {
      const res = await DriveAPI.importLink(postUrl.trim(), currentFolderId);
      if (res.success) {
        showToast(`Imported "${res.file.name}" from ${res.file.telegram_channel_title || "Linked Channel"}`);
        refresh();
        setActiveModal(null);
        setPostUrl("");
        setPreviewMedia(null);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to import media stream link";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Import via Cloud Stream Link
              </h3>
              <p className="text-xs text-slate-400">
                Add high-speed videos, PDFs, and files from linked channels
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Stream / Channel Post Link
            </label>
            <div className="relative flex items-center">
              <Send className="w-4 h-4 text-sky-500 absolute left-3.5 pointer-events-none -rotate-12" />
              <input
                type="url"
                required
                autoFocus
                placeholder="https://t.me/channel_name/123 or https://t.me/c/1234567890/45"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-800 dark:text-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              💡 Tip: Copy post link from your channel or feed & paste here to link directly.
            </p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/80 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Zero-Wait Instant Streaming
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              The media will be added to your current Drive folder instantly without downloading or re-uploading. You can play videos with seeking, view PDFs, and view photos directly inside the website!
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#323437] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !postUrl.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-xl shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Fetching Media...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                  <span>Import & Add to Drive</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
