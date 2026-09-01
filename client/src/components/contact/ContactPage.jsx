import React, { useState } from "react";
import DriveAPI from "../../services/api.js";
import {
  Mail,
  Send,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Sparkles,
  HelpCircle,
  Clock,
  MapPin
} from "lucide-react";

export default function ContactPage({ onNavigate, siteSettings }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Support");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedId, setSubmittedId] = useState("");

  const supportEmail = siteSettings?.supportEmail || "support@telegram-drive.in";
  const telegramSupport = siteSettings?.telegramSupport || "@TeleDriveSupport";
  const telegramChannel = siteSettings?.telegramChannel || "https://t.me/telegram_drive_in";
  const contactHeading = siteSettings?.contactHeading || "We'd love to hear from you";
  const contactSubheading =
    siteSettings?.contactSubheading ||
    "Have a question, technical issue, or feedback? Reach out and our team will get back to you promptly.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) return setErrorMsg("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setErrorMsg("Please enter a valid email address.");
    if (!message.trim() || message.trim().length < 10) {
      return setErrorMsg("Please write a message with at least 10 characters.");
    }

    setLoading(true);
    try {
      const res = await DriveAPI.submitContactForm({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim()
      });

      if (res.success) {
        setSuccessMsg(res.message || "Thank you! Your message has been received.");
        setSubmittedId(res.inquiryId || "");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setErrorMsg(res.error || "Failed to submit your message. Please try again.");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 selection:bg-blue-500 selection:text-white font-sans py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
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
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>TeleDrive Help & Support Desk</span>
          </div>
        </div>

        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
            Contact Support
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {contactHeading}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {contactSubheading}
          </p>
        </div>

        {/* Main Grid: Info Cards + Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pt-4">
          {/* Left Column: Direct Support Channels */}
          <div className="space-y-4">
            {/* Email Card */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Email Support</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send us an email anytime</p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-xs font-semibold text-blue-400 hover:underline mt-1 inline-block"
                >
                  {supportEmail}
                </a>
              </div>
            </div>

            {/* Telegram Support Card */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Telegram Community & Support</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Live updates & community help</p>
                {telegramChannel && (
                  <a
                    href={telegramChannel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-cyan-400 hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <span>{telegramSupport}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Response Time Card */}
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Fast Response Times</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Our technical team responds to all inquiries within 24 hours.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-2 rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            {successMsg ? (
              <div className="py-12 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Message Sent Successfully!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">{successMsg}</p>
                {submittedId && (
                  <p className="text-[11px] font-mono text-slate-500">Inquiry ID: {submittedId}</p>
                )}
                <button
                  type="button"
                  onClick={() => setSuccessMsg("")}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-base font-bold text-white mb-4">Send us a direct message</h2>

                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Your Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Subject Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Topic / Category *</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="General Support">General Support & Inquiries</option>
                    <option value="Bug Report">Technical Issue / Bug Report</option>
                    <option value="Feature Request">Feature Suggestion / Feedback</option>
                    <option value="Telegram Integration">Telegram MTProto Connection Help</option>
                    <option value="Business Partnership">API & Business Inquiries</option>
                  </select>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Your Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how we can help you in detail..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 pt-8 border-t border-slate-900">
          <p>© {new Date().getFullYear()} TeleDrive. Prompt, reliable support.</p>
        </div>
      </div>
    </div>
  );
}
