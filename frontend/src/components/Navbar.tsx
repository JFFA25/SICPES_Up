import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import LogoLockup from "./ui/LogoLockup";

const Navbar = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/session`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.rol === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      }
    };

    fetchSession();
  }, []);

  return (
    <header className="mk-home-nav">
      <div className={`mk-home-nav-inner${menuOpen ? " menu-open" : ""}`}>
        <Link to="/" className="mk-home-brand" aria-label="SICPES, ir al inicio">
          <LogoLockup />
        </Link>

        <button
          type="button"
          className="mk-home-menu-toggle"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="home-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav id="home-navigation" className={`mk-home-nav-links${menuOpen ? " open" : ""}`} aria-label="Navegación principal">
          <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>Contacto</Link>
          {isAdmin && (
            <Link to="/admin/reservations" className="admin" onClick={() => setMenuOpen(false)}>
              Panel Admin
            </Link>
          )}
          <Link to="/register" onClick={() => setMenuOpen(false)}>Regístrate</Link>
          <Link to="/login" className="login" onClick={() => setMenuOpen(false)}>
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;