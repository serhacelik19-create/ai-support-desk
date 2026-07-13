"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  GitPullRequest,
  Users,
  Palette,
  Save,
  Loader2,
  CheckCircle,
  HelpCircle,
  BookOpen,
  Trash2,
  Plus,
  Search,
  UserPlus,
  Pencil
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/components/ui/Toast";

interface SystemSettings {
  defaultTone: string;
  systemInstruction: string;
  autoAssignment: boolean;
  routingAlgorithm: string;
  slaTargetMinutes: number;
}

interface KBEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface UserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"ai" | "kb" | "routing" | "team" | "appearance">("ai");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    defaultTone: "friendly",
    systemInstruction: "",
    autoAssignment: true,
    routingAlgorithm: "round-robin",
    slaTargetMinutes: 15,
  });

  // Knowledge Base State
  const [kbEntries, setKbEntries] = useState<KBEntry[]>([]);
  const [kbSearch, setKbSearch] = useState("");
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");
  const [kbLoading, setKbLoading] = useState(false);

  // Team management State
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("agent");
  const [usersLoading, setUsersLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5002";

  // Fetch data on mount using stored JWT token
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token") || "";
      try {
        const [settingsRes, kbRes, usersRes] = await Promise.all([
          fetch(`${backendUrl}/api/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${backendUrl}/api/knowledge`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${backendUrl}/api/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        } else {
          addToast("System settings could not be loaded from the server.", "error");
        }

        if (kbRes.ok) {
          const kbData = await kbRes.json();
          setKbEntries(kbData);
        } else {
          addToast("Knowledge Base documents could not be loaded.", "error");
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        } else {
          addToast("User and agent list could not be loaded.", "error");
        }
      } catch (error) {
        console.error("Data fetching error:", error);
        addToast("Could not connect to the API server.", "error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [backendUrl]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`${backendUrl}/api/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        addToast("Settings saved successfully.", "success");
      } else {
        addToast("An error occurred while saving settings.", "error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      addToast("Could not be saved due to network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Add KB Entry
  const handleAddKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbTitle.trim() || !newKbContent.trim()) {
      addToast("Title and document content cannot be left blank.", "error");
      return;
    }
    setKbLoading(true);
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`${backendUrl}/api/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newKbTitle, content: newKbContent }),
      });

      if (res.ok) {
        const entry = await res.json();
        setKbEntries([entry, ...kbEntries]);
        setNewKbTitle("");
        setNewKbContent("");
        addToast("Document successfully added to the knowledge base.", "success");
      } else {
        addToast("Document could not be added.", "error");
      }
    } catch (error) {
      console.error("Error adding document:", error);
      addToast("A connection error occurred.", "error");
    } finally {
      setKbLoading(false);
    }
  };

  // Delete KB Entry
  const handleDeleteKb = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`${backendUrl}/api/knowledge/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setKbEntries(kbEntries.filter((entry) => entry.id !== id));
        addToast("Document deleted.", "success");
      } else {
        addToast("An error occurred while deleting the document.", "error");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      addToast("A connection error occurred.", "error");
    }
  };

  // Add / Edit Team User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast("Please fill in the name and email fields.", "error");
      return;
    }
    if (!editingUserId && !newUserPassword.trim()) {
      addToast("Password is required for new users.", "error");
      return;
    }

    setUsersLoading(true);
    const token = localStorage.getItem("token") || "";
    
    const url = editingUserId 
      ? `${backendUrl}/api/users/${editingUserId}`
      : `${backendUrl}/api/users`;
    
    const method = editingUserId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingUserId) {
          setUsers(users.map((u) => (u.id === editingUserId ? data : u)));
          addToast("Agent information updated successfully.", "success");
        } else {
          setUsers([data, ...users]);
          addToast("New team member added successfully.", "success");
        }
        
        // Reset form & states
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("agent");
        setEditingUserId(null);
      } else {
        const err = await res.json();
        addToast(err.error || "User could not be saved.", "error");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      addToast("A connection error occurred.", "error");
    } finally {
      setUsersLoading(false);
    }
  };

  // Delete Team User
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(`${backendUrl}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers(users.filter((u) => u.id !== id));
        addToast("User deleted.", "success");
        if (editingUserId === id) {
          cancelEditUser();
        }
      } else {
        const err = await res.json();
        addToast(err.error || "An error occurred while deleting user.", "error");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      addToast("A connection error occurred.", "error");
    }
  };

  const startEditUser = (u: UserEntry) => {
    setEditingUserId(u.id);
    setNewUserName(u.name);
    setNewUserEmail(u.email);
    setNewUserPassword(""); // Keep password empty unless they explicitly write a new one
    setNewUserRole(u.role);
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("agent");
  };

  const filteredKb = kbEntries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
      entry.content.toLowerCase().includes(kbSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="settings-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Workspace Settings</h1>
        <p className="settings-subtitle">Manage the AI assistant, company knowledge base, team members, and SLA rules.</p>
      </div>

      <div className="settings-layout">
        {/* Sol Menü (Sekmeler) */}
        <aside className="settings-sidebar">
          <button
            onClick={() => setActiveTab("ai")}
            className={`settings-tab-btn ${activeTab === "ai" ? "active" : ""}`}
            type="button"
          >
            <Sparkles className="w-4 h-4" />
            AI Copilot Rules
          </button>
          <button
            onClick={() => setActiveTab("kb")}
            className={`settings-tab-btn ${activeTab === "kb" ? "active" : ""}`}
            type="button"
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base (RAG)
          </button>
          <button
            onClick={() => setActiveTab("routing")}
            className={`settings-tab-btn ${activeTab === "routing" ? "active" : ""}`}
            type="button"
          >
            <GitPullRequest className="w-4 h-4" />
            Routing & SLA Rules
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`settings-tab-btn ${activeTab === "team" ? "active" : ""}`}
            type="button"
          >
            <Users className="w-4 h-4" />
            Team & Agents
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`settings-tab-btn ${activeTab === "appearance" ? "active" : ""}`}
            type="button"
          >
            <Palette className="w-4 h-4" />
            Theme & Appearance
          </button>
        </aside>

        {/* Sağ İçerik Paneli */}
        <main className="settings-card" style={{ flex: 1 }}>
          {/* AI Copilot Kuralları */}
          {activeTab === "ai" && (
            <form onSubmit={handleSaveSettings}>
              <div className="settings-card-header">
                <Sparkles className="w-5 h-5" />
                <h3>AI Copilot Instructions</h3>
              </div>
              <div className="settings-card-body">
                <div className="settings-field">
                  <label>Default Draft Tone</label>
                  <select
                    value={settings.defaultTone}
                    onChange={(e) => setSettings({ ...settings, defaultTone: e.target.value })}
                    className="settings-select"
                  >
                    <option value="friendly">Friendly & Warm</option>
                    <option value="professional">Professional & Technical</option>
                    <option value="empathetic">Empathetic & Caring</option>
                    <option value="persuasive">Persuasive (Sales Oriented)</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    System Instructions (AI Prompt)
                    <span style={{ cursor: "help", display: "flex", alignItems: "center" }} title="You can use the {customerName} variable to insert the customer's name.">
                      <HelpCircle className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                    </span>
                  </label>
                  <textarea
                    value={settings.systemInstruction}
                    onChange={(e) => setSettings({ ...settings, systemInstruction: e.target.value })}
                    className="settings-input settings-textarea"
                    placeholder="Write behavioral guidelines for the AI..."
                  />
                  <span className="settings-hint">Determines the general persona of the AI. Use <code>{`{customerName}`}</code> where the customer's name should go.</span>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", marginTop: "8px" }}>
                  <button type="submit" className="settings-save-btn" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Bilgi Bankası (RAG) Sekmesi */}
          {activeTab === "kb" && (
            <div>
              <div className="settings-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <BookOpen className="w-5 h-5" />
                  <h3>Company Knowledge Base (RAG)</h3>
                </div>
                <div style={{ position: "relative", width: "200px" }}>
                  <Search className="w-4 h-4" style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-tertiary)" }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    className="settings-input"
                    style={{ paddingLeft: "32px", width: "100%", height: "34px" }}
                  />
                </div>
              </div>

              <div className="settings-card-body" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
                  
                  {/* Sol: Yeni Ekleme Formu */}
                  <form onSubmit={handleAddKb} className="settings-card" style={{ background: "var(--bg-tertiary)", padding: "16px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Plus className="w-4 h-4" /> Add Document or Rule
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="settings-field">
                        <label>Document Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Return Policy, API Link"
                          value={newKbTitle}
                          onChange={(e) => setNewKbTitle(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="settings-field">
                        <label>Document Content / Rules</label>
                        <textarea
                          placeholder="Write rules or details you want the AI to know here..."
                          value={newKbContent}
                          onChange={(e) => setNewKbContent(e.target.value)}
                          className="settings-input"
                          style={{ minHeight: "120px" }}
                        />
                      </div>
                      <button type="submit" className="settings-save-btn" style={{ width: "100%", justifyContent: "center" }} disabled={kbLoading}>
                        {kbLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Add Document</>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Sağ: Mevcut Dökümanlar Listesi */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Registered Resources ({filteredKb.length})
                    </h4>
                    
                    {filteredKb.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-tertiary)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-sm)" }}>
                        No documents found.
                      </div>
                    ) : (
                      filteredKb.map((entry) => (
                        <div key={entry.id} className="settings-card" style={{ padding: "12px", position: "relative" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                            <h5 style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{entry.title}</h5>
                            <button
                              type="button"
                              onClick={() => handleDeleteKb(entry.id)}
                              style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                            </button>
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
                            {entry.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Dağıtım & SLA Kuralları */}
          {activeTab === "routing" && (
            <form onSubmit={handleSaveSettings}>
              <div className="settings-card-header">
                <GitPullRequest className="w-5 h-5" />
                <h3>Ticket Routing & SLA Settings</h3>
              </div>
              <div className="settings-card-body">
                <div className="settings-toggle-row">
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Automatic Ticket Assignment</span>
                    <span className="settings-hint">Automatically distributes incoming tickets to active agents.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, autoAssignment: !settings.autoAssignment })}
                    className={`settings-toggle ${settings.autoAssignment ? "active" : ""}`}
                  >
                    <div className="settings-toggle-thumb" />
                  </button>
                </div>

                <div className="settings-field">
                  <label>Routing Algorithm</label>
                  <select
                    value={settings.routingAlgorithm}
                    onChange={(e) => setSettings({ ...settings, routingAlgorithm: e.target.value })}
                    className="settings-select"
                    disabled={!settings.autoAssignment}
                    style={{ opacity: settings.autoAssignment ? 1 : 0.6 }}
                  >
                    <option value="round-robin">Round-Robin (Equal Distribution)</option>
                    <option value="least-busy">Least Busy Agent (To the most available agent)</option>
                    <option value="manual">Manual Pick (Keep in support pool)</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label>SLA Target Response Time (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.slaTargetMinutes}
                    onChange={(e) => setSettings({ ...settings, slaTargetMinutes: parseInt(e.target.value) || 15 })}
                    className="settings-input"
                  />
                  <span className="settings-hint">Time limit for marking delayed tickets as urgent.</span>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px", marginTop: "8px" }}>
                  <button type="submit" className="settings-save-btn" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Ekip & Temsilciler Sekmesi */}
          {activeTab === "team" && (
            <div>
              <div className="settings-card-header">
                <Users className="w-5 h-5" />
                <h3>Team Members & Agents</h3>
              </div>

              <div className="settings-card-body" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "20px", alignItems: "start" }}>
                  
                  {/* Sol: Yeni Temsilci/Admin Ekleme veya Düzenleme Formu */}
                  <form onSubmit={handleAddUser} className="settings-card" style={{ background: "var(--bg-tertiary)", padding: "16px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <UserPlus className="w-4 h-4" /> 
                      {editingUserId ? "Edit Team Member Info" : "Invite / Add New Team Member"}
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="settings-field">
                        <label>Full Name</label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="settings-field">
                        <label>Email Address</label>
                        <input
                          type="email"
                          placeholder="agent@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="settings-field">
                        <label>
                          Password {editingUserId && <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>(Leave blank to keep unchanged)</span>}
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="settings-field">
                        <label>System Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="settings-select"
                        >
                          <option value="agent">Customer Support Agent (Chat Console Only)</option>
                          <option value="admin">Administrator (All Settings & Analytics Enabled)</option>
                        </select>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                        <button type="submit" className="settings-save-btn" style={{ width: "100%", justifyContent: "center" }} disabled={usersLoading}>
                          {usersLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>{editingUserId ? "Save Changes" : "Save User"}</>
                          )}
                        </button>

                        {editingUserId && (
                          <button 
                            type="button" 
                            onClick={cancelEditUser} 
                            className="btn-secondary" 
                            style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "6px" }}
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Sağ: Kayıtlı Kullanıcılar Tablosu */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Registered Team Members ({users.length})
                    </h4>
                    
                    {users.length === 0 ? (
                      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-tertiary)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-sm)" }}>
                        No team members found.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {users.map((u) => (
                          <div key={u.id} className="settings-card" style={{ padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h5 style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{u.name}</h5>
                                <span style={{ fontSize: "10px", padding: "1px 5px", background: u.role === "admin" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)", color: u.role === "admin" ? "#10b981" : "#3b82f6", borderRadius: "4px", textTransform: "capitalize", fontWeight: 500 }}>
                                  {u.role === "admin" ? "Admin" : "Agent"}
                                </span>
                              </div>
                              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{u.email}</span>
                            </div>
                            
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => startEditUser(u)}
                                style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "4px" }}
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: "4px" }}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Tema & Görünüm */}
          {activeTab === "appearance" && (
            <div>
              <div className="settings-card-header">
                <Palette className="w-5 h-5" />
                <h3>Appearance & Theme Selection</h3>
              </div>
              <div className="settings-card-body">
                <div className="settings-theme-selector">
                  <button
                    type="button"
                    onClick={() => { if (theme !== "dark") toggleTheme(); }}
                    className={`settings-theme-option ${theme === "dark" ? "active" : ""}`}
                  >
                    <div className="theme-preview dark-preview">
                      <div className="theme-preview-bar" />
                      <div className="theme-preview-content">
                        <div className="theme-preview-sidebar" />
                        <div className="theme-preview-main" />
                      </div>
                    </div>
                    <span>Dark Theme (Dark Mode)</span>
                    {theme === "dark" && <CheckCircle className="w-4 h-4 theme-check" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { if (theme !== "light") toggleTheme(); }}
                    className={`settings-theme-option ${theme === "light" ? "active" : ""}`}
                  >
                    <div className="theme-preview light-preview">
                      <div className="theme-preview-bar" />
                      <div className="theme-preview-content">
                        <div className="theme-preview-sidebar" />
                        <div className="theme-preview-main" />
                      </div>
                    </div>
                    <span>Light Theme (Light Mode)</span>
                    {theme === "light" && <CheckCircle className="w-4 h-4 theme-check" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
