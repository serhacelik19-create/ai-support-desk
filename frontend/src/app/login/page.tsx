"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Shield, Zap, MessageSquare } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Save session credentials
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("Could not connect to the support desk server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />
      <div className="login-bg-grid" />

      <div className="login-container">
        {/* Sol Panel - Tanıtım */}
        <div className="login-branding">
          <div className="login-brand-logo">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="login-brand-title">AI Support Console</h1>
          <p className="login-brand-subtitle">
            AI-powered enterprise multi-channel customer contact center.
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4>Real-time Chat</h4>
                <p>Respond to tickets from WhatsApp and Web Chat channels instantly.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4>On-Demand AI Drafts</h4>
                <p>Generate Gemini-powered drafts in any tone with a single click (Cost-effective).</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4>GDPR Data Masking & RAG</h4>
                <p>Personal data is masked before reaching AI; rules are retrieved from the knowledge base.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Panel - Giriş Formu */}
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Log in to access the support console</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {errorMsg && (
              <div style={{ color: "var(--accent)", fontSize: "13px", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239, 68, 68, 0.2)", marginBottom: "10px" }}>
                {errorMsg}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="login-input"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
                autoComplete="current-password"
              />
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" defaultChecked />
                <span>Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              className={`login-submit ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-spinner" />
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="login-demo-note" style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start", marginTop: "16px", padding: "10px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                Demo Account Credentials:
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                <strong>Admin (Owner):</strong> admin@company.com / admin123
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                <strong>Agent 1:</strong> temsilci1@company.com / agent123
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                <strong>Agent 2:</strong> temsilci2@company.com / agent123
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
