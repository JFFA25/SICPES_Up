import { Link, useNavigate } from "react-router-dom";
import "../styles/sicpes-ui.css";
import Icon, { type IconName } from "./ui/Icon";
import LogoLockup from "./ui/LogoLockup";
import NotificationBell from "./NotificationBell";
import { disablePush } from "../utils/push";

export type ResidentSection = "dashboard" | "reservation" | "payments";

const LINKS: { key: ResidentSection; to: string; icon: IconName; label: string }[] = [
  { key: "dashboard", to: "/dashboard", icon: "home", label: "Inicio" },
  { key: "reservation", to: "/reservation", icon: "calendar", label: "Reservar" },
  { key: "payments", to: "/payments", icon: "card", label: "Pagos" },
];

interface Props {
  active: ResidentSection;
  userName?: string;
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
const ResidentLayout = ({ active, userName, children }: Props) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await disablePush().catch(() => {});
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    navigate("/login");
  };

  return (
    <div className="sicpes-ui">
      <div className="mk-app mk-pwa-app">
        <header className="mk-pwa-top">
          <Link to="/dashboard" className="mk-brand-btn" aria-label="SICPES, ir al inicio">
            <LogoLockup />
          </Link>

          <nav className="mk-pwa-links" aria-label="Navegación principal">
            {LINKS.map((l) => (
              <Link key={l.key} to={l.to} className={`mk-pwa-link${active === l.key ? " active" : ""}`}>
                <Icon name={l.icon} size={16} />
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mk-pwa-user">
            <span className="mk-avatar mk-avatar-sm">{initials(userName)}</span>
            <span className="mk-user-name">{userName}</span>
            <span className="mk-bell"><NotificationBell /></span>
            <button type="button" className="mk-logout" onClick={handleLogout}>
              <Icon name="logout" size={14} />
              <span>Salir</span>
            </button>
          </div>
        </header>

        <div className="mk-pwa-body">
          <aside className="mk-pwa-side">
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
