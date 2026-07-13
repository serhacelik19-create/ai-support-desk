interface MetricsCardProps {
  totalMessages: number;
  resolvedCount: number;
  totalConversations: number;
}

export default function MetricsCard({ totalMessages, resolvedCount, totalConversations }: MetricsCardProps) {
  const resolutionRate = totalConversations > 0
    ? Math.round((resolvedCount / totalConversations) * 100)
    : 0;

  return (
    <div className="copilot-analytics-card">
      <span className="analytics-title">Copilot Metrics</span>
      <div className="analytics-grid">
        <div className="analytics-metric">
          <span className="metric-value notranslate">{resolutionRate}%</span>
          <span className="metric-label">Resolved</span>
        </div>
        <div className="analytics-metric">
          <span className="metric-value notranslate">{totalMessages}</span>
          <span className="metric-label">Messages</span>
        </div>
        <div className="analytics-metric">
          <span className="metric-value notranslate">{totalConversations}</span>
          <span className="metric-label">Tickets</span>
        </div>
      </div>
    </div>
  );
}
