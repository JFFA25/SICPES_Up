import logo from "../../assets/images/SICPES_Producto.png";

interface Props {
  compact?: boolean;
  showMark?: boolean;
}

const LogoLockup = ({ compact = false, showMark = true }: Props) => (
  <span className={`mk-logo-lockup${compact ? " mk-logo-compact" : ""}`}>
    {showMark && <img className="mk-logo-img" src={logo} alt="" />}
    <span className="mk-logo-word">
      SICPES<small>Residencial</small>
    </span>
  </span>
);

export default LogoLockup;
