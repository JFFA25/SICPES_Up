import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import "../styles/sicpes-ui.css";
import Icon, { type IconName } from "./ui/Icon";
import LogoLockup from "./ui/LogoLockup";
import NotificationBell from "./NotificationBell";
import { disablePush } from "../utils/push";

export type ResidentSection = "dashboard" | "reservation" | "payments" | "account";

const LINKS: { key: ResidentSection; to: string; icon: IconName; label: string }[] = [
  { key: "dashboard", to: "/dashboard", icon: "home", label: "Inicio" },
  { key: "reservation", to: "/reservation", icon: "calendar", label: "Reservar" },
  { key: "payments", to: "/payments", icon: "card", label: "Pagos" },
  { key: "account", to: "/account", icon: "user", label: "Mi cuenta" },
];

interface Props {
  active: ResidentSection;
  userName?: string;
  userPhoto?: string | null;
  children: React.ReactNode;
}

const initials = (name?: string) =>
  (name || "S")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

// Estructura del portal del residente (topbar + sidebar) tomada del prototipo.
const ResidentLayout = ({ active, userName, userPhoto, children }: Props) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await disablePush().catch(() => {});
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  };

  return (
    <div className="sicpes-ui">
      <div className="mk-app mk-pwa-app">
        <header className="mk-pwa-top">
          <div className="mk-pwa-brand-group">
            <button
              type="button"
              className="mk-menu-toggle"
              aria-label={sidebarOpen ? "Ocultar menú de navegación" : "Mostrar menú de navegación"}
              aria-controls="resident-navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <span key={sidebarOpen ? "open" : "closed"} className="mk-menu-toggle-icon" aria-hidden="true">
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </span>
            </button>
            <Link to="/dashboard" className="mk-brand-btn" aria-label="SICPES, ir al inicio">
              <LogoLockup showMark={false} />
            </Link>
          </div>

          <div className="mk-pwa-user">
            <span className="mk-avatar mk-avatar-sm">
              {userPhoto ? <img src={userPhoto} alt="" /> : initials(userName)}
            </span>
            <span className="mk-user-name">{userName}</span>
            <span className="mk-bell"><NotificationBell /></span>
            <button type="button" className="mk-logout" onClick={handleLogout}>
              <Icon name="logout" size={14} />
              <span>Salir</span>
            </button>
          </div>
        </header>

        <div className={`mk-pwa-body${sidebarOpen ? "" : " sidebar-closed"}`}>
          <aside id="resident-navigation" className="mk-pwa-side">
            <span className="mk-side-label">RESIDENTE</span>
            {LINKS.map((l) => (
              <Link key={l.key} to={l.to} className={`mk-side-item${active === l.key ? " active" : ""}`}>
                <Icon name={l.icon} size={17} />
                <span>{l.label}</span>
              </Link>
            ))}
            <div className="mk-side-help">
              <span className="mk-side-label">AYUDA</span>
              <Link to="/contact" className="mk-side-item">
                <Icon name="shield" size={17} />
                <span>Soporte SICPES</span>
              </Link>
            </div>
          </aside>

          <main className="mk-pwa-main">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default ResidentLayout;
