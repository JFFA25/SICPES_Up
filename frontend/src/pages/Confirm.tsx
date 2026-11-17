import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import AuthStatus from "../components/AuthStatus";
import Icon from "../components/ui/Icon";

const Confirm = () => {
  useEffect(() => {
    document.title = "Cuenta confirmada";
  }, []);

  return (
    <AuthStatus
      tone="success"
      eyebrow="REGISTRO COMPLETADO"
      title="¡Bienvenido a SICPES!"
      description="Tu cuenta está lista. Ya puedes iniciar sesión para continuar con tu reservación."
      icon={CircleCheck}
    >
      <Link to="/login" className="mk-btn mk-primary mk-block">
        Iniciar sesión <Icon name="arrowRight" size={17} />
      </Link>
    </AuthStatus>
  );
};

export default Confirm;
