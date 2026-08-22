import "./HoldingState.css";

interface HoldingStateProps {
  title: string;
  message: string;
}

/** UC-1 edge case: no active Promotion / no data — a holding state, not a broken map. */
export function HoldingState({ title, message }: HoldingStateProps) {
  return (
    <div className="holding-state">
      <div className="holding-state__card">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
