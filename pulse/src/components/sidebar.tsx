export function Sidebar() {
  return (
    <aside className="pulse-sidebar" role="region" aria-label="Navigation">
      <div className="pulse-sidebar-brand">
        <span className="pulse-sidebar-mark">P</span> Pulse
      </div>
      <nav className="pulse-sidebar-nav">
        <a href="#" className="pulse-nav-item pulse-nav-item-active" aria-current="page">
          Dashboard
        </a>
      </nav>
    </aside>
  );
}
