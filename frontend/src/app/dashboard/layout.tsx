"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BarChart3, Settings, LogOut, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr) as UserProfile;
      setUser(parsedUser);

      // Role Guard: agents cannot view settings or analytics
      if (parsedUser.role === "agent" && (pathname === "/settings" || pathname === "/analytics")) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      router.push("/login");
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getUserInitials = () => {
    if (!user) return "SA";
    const names = user.name.split(" ");
    return names.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Define navigation items based on user role
  const navItems = [
    { href: "/dashboard", label: "Console", icon: LayoutDashboard },
  ];

  if (user && user.role === "admin") {
    navItems.push(
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings }
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-primary)" }}>
        <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="dashboard-layout">
        {/* Top Navigation Bar */}
        <nav className="top-nav">
          <div className="top-nav-left">
            <div className="top-nav-brand">
              <Sparkles className="w-5 h-5 nav-brand-icon" />
              <span className="nav-brand-text notranslate">SupportDesk AI</span>
            </div>

            <div className="top-nav-links">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`top-nav-link ${isActive ? "active" : ""}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="top-nav-right">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <div className="nav-user-info" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{user?.name}</span>
              <span style={{ fontSize: "10px", color: "var(--text-tertiary)", textTransform: "capitalize" }}>
                {user?.role === "admin" ? "Admin" : "Support Agent"}
              </span>
            </div>
            <div className="nav-user-avatar notranslate" title={user?.name}>
              {getUserInitials()}
            </div>
            <button onClick={handleLogout} className="top-nav-link nav-logout" style={{ background: "transparent", border: "none", cursor: "pointer" }} title="Log Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>

        {/* Page Content */}
        <div className="dashboard-content">
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
