import "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__message">{message}</div>
    </div>
  );
}
