interface SkeletonProps {
  variant?: "text" | "avatar" | "card" | "message";
  width?: string;
  height?: string;
  count?: number;
}

export default function Skeleton({ variant = "text", width, height, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "avatar") {
    return <div className="skeleton skeleton-avatar" style={{ width: width || "40px", height: height || "40px" }} />;
  }

  if (variant === "card") {
    return (
      <div className="skeleton skeleton-card" style={{ width: width || "100%", height: height || "120px" }} />
    );
  }

  if (variant === "message") {
    return (
      <div className="skeleton-message-group">
        {items.map((_, i) => (
          <div key={i} className={`skeleton-message-row ${i % 2 === 0 ? "left" : "right"}`}>
            {i % 2 === 0 && <div className="skeleton skeleton-avatar" style={{ width: "32px", height: "32px" }} />}
            <div className="skeleton skeleton-bubble" style={{ width: `${50 + Math.random() * 30}%`, height: "48px" }} />
            {i % 2 !== 0 && <div className="skeleton skeleton-avatar" style={{ width: "32px", height: "32px" }} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {items.map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: width || `${70 + Math.random() * 30}%`, height: height || "14px" }} />
      ))}
    </>
  );
}
