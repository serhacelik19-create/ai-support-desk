"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Smartphone,
  Globe,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/constants";

interface AnalyticsStats {
  totalConversations: number;
  openCount: number;
  resolvedCount: number;
  totalMessages: number;
  avgResponseTime: number;
  channelDistribution: { whatsapp: number; web: number };
  dailyActivity?: { day: string; count: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    setLoading(true);
    setErrorMsg(null);

    const token =
      (typeof window !== "undefined" && localStorage.getItem("token")) ||
      process.env.NEXT_PUBLIC_API_AUTH_TOKEN ||
      "demo-auth-token-123";
    fetch(`${BACKEND_URL}/api/analytics`, {
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setStats(data);
        setErrorMsg(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err.name === "AbortError") {
          setErrorMsg("Request timed out");
        } else {
          setErrorMsg("Failed to connect to backend analytics server");
        }
        console.error("Analytics fetch error:", err);
        setLoading(false);
      })
      .finally(() => {
        if (isMounted) {
          clearTimeout(timeoutId);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="analytics-page">
        <div className="analytics-page-header">
          <h1><BarChart3 className="w-6 h-6" /> Analytics</h1>
        </div>
        <div className="analytics-loading">Loading analytics data...</div>
      </div>
    );
  }

  const resolutionRate = stats.totalConversations > 0
    ? Math.round((stats.resolvedCount / stats.totalConversations) * 100)
    : 0;

  const whatsappPercent = stats.totalConversations > 0
    ? Math.round((stats.channelDistribution.whatsapp / stats.totalConversations) * 100)
    : 0;
  const webPercent = 100 - whatsappPercent;

  return (
    <div className="analytics-page">
      <div className="analytics-page-header">
        <div>
          <h1>Analytics Overview</h1>
          <p className="analytics-page-subtitle">Real-time performance metrics from your support operations</p>
        </div>
      </div>

      {errorMsg && (
        <div className="analytics-error-banner" style={{
          padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          borderRadius: "0.5rem",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "#ef4444",
          fontSize: "0.875rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-icon-wrapper blue">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.totalConversations}</span>
            <span className="kpi-label">Total Tickets</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-wrapper green">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{resolutionRate}%</span>
            <span className="kpi-label">Resolution Rate</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <Clock className="w-5 h-5" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.avgResponseTime}s</span>
            <span className="kpi-label">Avg Response</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-wrapper purple">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.totalMessages}</span>
            <span className="kpi-label">Total Messages</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="analytics-charts-grid">
        {/* Ticket Status Breakdown */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">
            <Users className="w-4 h-4" /> Ticket Status
          </h3>
          <div className="chart-bars">
            <div className="chart-bar-item">
              <div className="chart-bar-header">
                <span>Open</span>
                <span className="chart-bar-value">{stats.openCount}</span>
              </div>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill open"
                  style={{ width: `${stats.totalConversations > 0 ? (stats.openCount / stats.totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="chart-bar-item">
              <div className="chart-bar-header">
                <span>Resolved</span>
                <span className="chart-bar-value">{stats.resolvedCount}</span>
              </div>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill resolved"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">
            <Smartphone className="w-4 h-4" /> Channel Distribution
          </h3>
          <div className="channel-distribution">
            <div className="channel-ring-container">
              <svg viewBox="0 0 120 120" className="channel-ring">
                <circle cx="60" cy="60" r="50" className="channel-ring-bg" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="channel-ring-whatsapp"
                  strokeDasharray={`${whatsappPercent * 3.14} ${314 - whatsappPercent * 3.14}`}
                  strokeDashoffset="0"
                />
              </svg>
              <div className="channel-ring-center">
                <span className="channel-ring-total">{stats.totalConversations}</span>
                <span className="channel-ring-label">Total</span>
              </div>
            </div>
            <div className="channel-legend">
              <div className="channel-legend-item">
                <div className="channel-dot whatsapp" />
                <span>WhatsApp</span>
                <span className="channel-count">{stats.channelDistribution.whatsapp}</span>
              </div>
              <div className="channel-legend-item">
                <div className="channel-dot web" />
                <span>Web Chat</span>
                <span className="channel-count">{stats.channelDistribution.web}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Response Time Trend (Visual Bars) */}
        <div className="analytics-chart-card wide">
          <h3 className="chart-title">
            <BarChart3 className="w-4 h-4" /> Daily Activity (Last 7 Days)
          </h3>
          <div className="mini-bar-chart">
            {(stats.dailyActivity && stats.dailyActivity.length > 0
              ? stats.dailyActivity
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ day, count: 0 }))
            ).map((item, i, arr) => {
              const maxCount = Math.max(1, ...arr.map((d) => d.count));
              const percent = item.count > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={i} className="mini-bar-col">
                  <div className="mini-bar" style={{ height: `${Math.max(item.count > 0 ? percent : 6, 6)}%` }}>
                    <span className="mini-bar-value">{item.count}</span>
                  </div>
                  <span className="mini-bar-label">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
