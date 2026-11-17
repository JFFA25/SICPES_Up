import logo from "../../assets/images/SICPES_Producto.png";

interface Props {
  compact?: boolean;
}

const LogoLockup = ({ compact = false }: Props) => (
  <span className={`mk-logo-lockup${compact ? " mk-logo-compact" : ""}`}>
    <img className="mk-logo-img" src={logo} alt="SICPES" />
    <span className="mk-logo-word">
      SICPES<small>Residencial</small>
    </span>
  </span>
);

export default LogoLockup;
