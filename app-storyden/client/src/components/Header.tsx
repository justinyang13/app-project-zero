import type { UpdateBookListState } from "./UpdateBookListButton";
import { UpdateBookListButton } from "./UpdateBookListButton";
import "./Header.css";

interface HeaderProps {
  updateState: UpdateBookListState;
  onUpdate: () => void;
}

export function Header({ updateState, onUpdate }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sd-accent)" strokeWidth="1.8">
          <path d="M3 5 C3 4 4 3 5 3 L11 3 L11 20 L5 20 C4 20 3 19 3 18 Z" />
          <path d="M21 5 C21 4 20 3 19 3 L13 3 L13 20 L19 20 C20 20 21 19 21 18 Z" />
        </svg>
        <div>
          <div className="header__title">StoryDen</div>
          <div className="header__tagline">100 stories worth curling up with</div>
        </div>
      </div>
      <UpdateBookListButton state={updateState} onUpdate={onUpdate} />
    </header>
  );
}
