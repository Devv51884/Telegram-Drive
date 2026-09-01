import React from "react";
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, Cloud, Mail } from "lucide-react";

export default function PrivacyPolicyPage({ onNavigate, siteSettings }) {
  const supportEmail = siteSettings?.supportEmail || "support@telegram-drive.in";

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 selection:bg-blue-500 selection:text-white font-sans py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <button
            onClick={() => onNavigate("landing")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>TeleDrive Trust & Security Center</span>
          </div>
        </div>

        {/* Title Banner */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
            Legal & Privacy Transparency
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Last updated: September 1, 2026 • Effective immediately for all global users
          </p>
        </div>

        {/* Policy Content Body */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 space-y-8 text-xs sm:text-sm leading-relaxed text-slate-300">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              1. Overview & Commitment to Privacy
            </h2>
            <p>
              At <strong>TeleDrive</strong> ("we", "our", or "us"), your privacy and data autonomy are fundamental principles. This Privacy Policy explains how TeleDrive handles your data when you access our high-speed cloud storage and streaming web application at <a href="https://telegram-drive.in" className="text-blue-400 hover:underline">telegram-drive.in</a>.
            </p>
            <p>
              TeleDrive operates with distributed, encrypted high-speed cloud storage architecture. We do not sell your personal information, nor do we monetize your uploaded content or browsing habits.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>Account Credentials:</strong> When you register, we collect your Full Name, Email Address, and an argon2/bcrypt salted hash of your password. We never store raw passwords.
              </li>
              <li>
                <strong>Cloud Sync Session:</strong> If you connect your personal cloud node to sync media, an encrypted authorization token is stored in our protected database to allow seamless streaming on your behalf.
              </li>
              <li>
                <strong>File Metadata:</strong> We store file references (e.g., file names, size, MIME type, folder structure) necessary to display your drive hierarchy.
              </li>
              <li>
                <strong>Security Logs:</strong> Minimal IP and timestamp logs to prevent denial-of-service (DoS) attacks and enforce API rate limits.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              3. How Your Files Are Stored & Transferred
            </h2>
            <p>
              When you upload files using TeleDrive:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                Files are transferred directly over TLS 1.3 / SSL encrypted connections across our distributed cloud servers.
              </li>
              <li>
                TeleDrive acts as a high-speed encrypted streaming conduit with instant playback capabilities.
              </li>
              <li>
                Neither TeleDrive staff nor automated systems inspect or analyze the contents of your files for advertising or profiling.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              4. Cookies & Local Storage
            </h2>
            <p>
              TeleDrive uses browser <code>localStorage</code> strictly for:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>Persisting your signed JWT authentication session token (<code>teledrive_auth_token</code>).</li>
              <li>Storing user preferences (e.g., Grid view vs. List view, Dark mode theme).</li>
            </ul>
            <p>We do not use third-party tracking cookies or advertising pixels.</p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              5. User Rights & Data Deletion
            </h2>
            <p>
              You maintain 100% control over your data:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>Permanent Account Deletion:</strong> You can delete your TeleDrive account at any time from Settings. Deletion instantly wipes your user record, credentials, and file references.
              </li>
              <li>
                <strong>File Deletion:</strong> Deleting a file permanently purges its record from our database and cloud storage records.
              </li>
              <li>
                <strong>Disconnect Cloud Node:</strong> You can terminate your active Cloud Sync connection anytime in 1-click under Settings.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              6. Contact Information & Privacy Requests
            </h2>
            <p>
              If you have any questions or privacy concerns regarding this policy, please reach out to our team:
            </p>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">TeleDrive Support & Privacy Desk</p>
                <a href={`mailto:${supportEmail}`} className="text-blue-400 hover:underline">
                  {supportEmail}
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© {new Date().getFullYear()} TeleDrive. Designed with privacy at the core.</p>
        </div>
      </div>
    </div>
  );
}
