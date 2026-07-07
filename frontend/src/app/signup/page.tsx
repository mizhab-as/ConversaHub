"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.signup(email, password, role);
      // Auto-login after signup
      await authApi.login(email, password);
      if (role === "admin") router.push("/dashboard/admin");
      else if (role === "agent") router.push("/dashboard/agent");
      else router.push("/dashboard/customer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, var(--primary) 0%, #2d6b69 60%, var(--secondary) 100%)" }}
    >
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[480px] flex-shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div
              style={{ background: "var(--accent)", borderRadius: "10px" }}
              className="w-10 h-10 flex items-center justify-center font-bold text-base"
            >
              <span style={{ color: "var(--accent-fg)" }}>C</span>
            </div>
            <span className="text-white font-bold text-xl">ConversaHub</span>
          </div>
          <h1 className="text-white font-bold leading-tight mb-4" style={{ fontSize: "2.5rem" }}>
            Join the future of customer support
          </h1>
          <p style={{ color: "rgba(250,250,250,0.72)", lineHeight: 1.7, fontSize: "1rem" }}>
            Get instant AI-powered answers, smart ticket escalation, and seamless human handoff — all in one platform.
          </p>
        </div>
        {/* Testimonial */}
        <div
          style={{
            background: "rgba(250,250,250,0.1)",
            border: "1px solid rgba(250,250,250,0.18)",
            borderRadius: "var(--radius)",
            padding: "1.5rem",
          }}
        >
          <p className="text-white text-sm mb-3" style={{ lineHeight: 1.6 }}>
            "ConversaHub reduced our support ticket resolution time by 60%. The AI agent handles most requests instantly."
          </p>
          <div style={{ color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>— Enterprise SaaS Customer</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="card w-full animate-fade-in"
          style={{ maxWidth: "440px", padding: "2.5rem" }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              style={{ background: "var(--primary)", borderRadius: "8px" }}
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-sm"
            >
              C
            </div>
            <span className="font-bold" style={{ color: "var(--primary)" }}>ConversaHub</span>
          </div>

          <h2 className="font-bold mb-1" style={{ fontSize: "1.6rem", color: "var(--primary)" }}>
            Create an account
          </h2>
          <p className="mb-7" style={{ color: "var(--muted-fg)", fontSize: "0.88rem" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--secondary)", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>

          {error && (
            <div
              style={{
                background: "rgba(220, 80, 60, 0.08)",
                border: "1px solid rgba(220, 80, 60, 0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "0.75rem 1rem",
                color: "#b03020",
                fontSize: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="signup-email" className="input-label">Email Address</label>
              <input
                id="signup-email"
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="input-label">Password</label>
              <input
                id="signup-password"
                type="password"
                className="input"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="signup-role" className="input-label">Account Type</label>
              <select
                id="signup-role"
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ cursor: "pointer" }}
              >
                <option value="customer">Customer — Use the AI chat support</option>
                <option value="agent">Support Agent — Manage the ticket queue</option>
                <option value="admin">Admin — Full platform access</option>
              </select>
            </div>

            <button
              type="submit"
              id="signup-submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: "0.25rem", padding: "0.75rem" }}
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="text-center mt-6" style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
