import { NavLink } from "react-router-dom";
import "./NavBar.css";

export function NavBar() {
  return (
    <nav className="nav-bar">
      <span className="nav-bar__brand">Project Zero</span>
      <div className="nav-bar__links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Home
        </NavLink>
        <NavLink to="/project-zero" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Project Zero
        </NavLink>
      </div>
    </nav>
  );
}
