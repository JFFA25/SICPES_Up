import { Link } from "react-router-dom";
import departamento from "../assets/images/departament.webp";
import { ArrowRight, BedDouble, CreditCard, ShieldCheck } from "lucide-react";

const Hero = () => {
  return (
    <main>
      <section className="mk-home-hero">
        <div className="mk-home-hero-inner">
          <div className="mk-home-copy">
            <span className="mk-home-eyebrow">RESIDENCIA ESTUDIANTIL SICPES</span>
            <h1>Encuentra tu espacio ideal para <span>vivir y estudiar.</span></h1>
            <p>
              Explora opciones de alojamiento, administra tu reservación y consulta tus pagos
              desde un solo lugar.
            </p>
            <div className="mk-home-actions">
              <Link to="/register" className="mk-home-primary">
                Comenzar ahora <ArrowRight size={17} />
              </Link>
              <Link to="/contact" className="mk-home-secondary">Conoce más</Link>
            </div>
            <div className="mk-home-caption">
              <span className="mk-home-caption-dot" />
              Un espacio pensado para acompañarte durante tus estudios
            </div>
          </div>

          <div className="mk-home-visual" aria-label="Edificio residencial SICPES">
            <div className="mk-home-visual-glow" />
            <img src={departamento} alt="Edificio de residencia estudiantil" />
            <div className="mk-home-visual-note">
              <span><BedDouble size={17} /></span>
              <div><small>Tu próximo capítulo</small><strong>comienza aquí</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mk-home-features" aria-label="Servicios de SICPES">
        <article className="mk-home-feature">
          <span><BedDouble size={18} /></span>
          <div><strong>Encuentra tu espacio</strong><small>Explora opciones de habitación.</small></div>
        </article>
        <article className="mk-home-feature">
          <span><ShieldCheck size={18} /></span>
          <div><strong>Da seguimiento</strong><small>Consulta el estado de tu reservación.</small></div>
        </article>
        <article className="mk-home-feature">
          <span><CreditCard size={18} /></span>
          <div><strong>Organiza tus pagos</strong><small>Revisa cuotas e historial desde tu cuenta.</small></div>
        </article>
      </section>
    </main>
  );
};

export default Hero;