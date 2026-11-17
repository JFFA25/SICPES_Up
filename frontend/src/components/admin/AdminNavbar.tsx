import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NotificationBell from "../NotificationBell";
import Icon from "../ui/Icon";
import { disablePush } from "../../utils/push";
import "../../styles/admin.css";

type AdminSection = "reservations" | "payments" | "floors" | "reports" | "settings";

const MAIN_LINKS: { key: AdminSection; to: string; label: string; icon: "calendar" | "card" | "building" | "settings" }[] = [
  { key: "reservations", to: "/admin/reservations", label: "Reservaciones", icon: "calendar" },
  { key: "payments", to: "/admin/payments", label: "Pagos", icon: "card" },
  { key: "floors", to: "/admin/floors", label: "Pisos", icon: "building" },
  { key: "settings", to: "/admin/settings", label: "Configuración", icon: "settings" },
];

interface AdminNavbarProps {
  active: AdminSection;
  children: React.ReactNode;
}

const AdminNavbar = ({ active, children }: AdminNavbarProps) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await disablePush().catch(() => {});
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  };

  const navLink = ({ key, to, label, icon: iconName }: (typeof MAIN_LINKS)[number]) => (
    <Link
      key={key}
      to={to}
      className={`admin-nav-link${active === key ? " active" : ""}`}
      aria-current={active === key ? "page" : undefined}
    >
      <Icon name={iconName} size={16} />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="sicpes-admin">
      <header className="admin-topbar">
        <div className="admin-brand-group">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
            aria-controls="admin-navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <Icon name={sidebarOpen ? "close" : "menu"} size={18} />
          </button>
          <Link to="/admin/reservations" className="admin-brand">
            <span>SICPES<small>RESIDENCIAL</small></span>
          </Link>
        </div>

        <nav className="admin-top-links" aria-label="Navegación principal">
          {MAIN_LINKS.map(navLink)}
        </nav>

        <div className="admin-user">
          <span className="admin-user-avatar" aria-hidden="true">AS</span>
          <span className="admin-user-name">Admin SICPES</span>
          <span className="admin-notifications"><NotificationBell /></span>
          <button type="button" className="admin-logout" onClick={handleLogout} aria-label="Cerrar sesión">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </header>

      <div className={`admin-workspace${sidebarOpen ? "" : " sidebar-closed"}`}>
        <aside id="admin-navigation" className="admin-sidebar">
          <span className="admin-side-label">ADMINISTRACIÓN</span>
          <nav aria-label="Administración">
            {MAIN_LINKS.map(navLink)}
            <Link
              to="/admin/reports"
              className={`admin-nav-link${active === "reports" ? " active" : ""}`}
              aria-current={active === "reports" ? "page" : undefined}
            >
              <Icon name="chart" size={16} />
              <span>Reportes</span>
            </Link>
          </nav>
          <div className="admin-side-help">
            <span className="admin-side-label">AYUDA</span>
            <Link to="/contact" className="admin-nav-link">
              <Icon name="shield" size={16} />
              <span>Soporte SICPES</span>
            </Link>
          </div>
        </aside>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
};

export default AdminNavbar;
