import { Link } from "react-router-dom";
import "../styles/sicpes-ui.css";
import Icon from "./ui/Icon";
import LogoLockup from "./ui/LogoLockup";
import roomPhoto from "../assets/images/room_individual.jpg";

interface Props {
  children: React.ReactNode;
}

// Marco de login/registro del prototipo: panel verde a la izquierda y tarjeta del formulario a la derecha.
const AuthShell = ({ children }: Props) => (
  <div className="sicpes-ui">
    <div className="mk-app mk-auth-pwa">
      <aside className="mk-auth-art">
        <Link to="/" aria-label="Ir al inicio" className="mk-brand-btn">
          <LogoLockup />
        </Link>
        <span className="mk-eyebrow">PORTAL DEL RESIDENTE</span>
        <h2>Tu residencia, en un solo lugar.</h2>
        <p>
          Consulta tu habitación, sube comprobantes y mantente al día con los avisos de SICPES.
        </p>
        <div className="mk-auth-art-visual">
          <img className="mk-photo" src={roomPhoto} alt="Habitación individual SICPES" />
        </div>
        <ul className="mk-checklist">
          <li><Icon name="check" size={15} /> Reserva y consulta tu habitación</li>
          <li><Icon name="check" size={15} /> Pagos y comprobantes en línea</li>
          <li><Icon name="check" size={15} /> Avisos y evaluación del servicio</li>
        </ul>
      </aside>

      <main className="mk-auth-panel">
        <div className="mk-auth-p-card">{children}</div>
        <p className="mk-auth-p-foot">© 2025 SICPES · Residencias estudiantiles</p>
      </main>
    </div>
  </div>
);

export default AuthShell;
