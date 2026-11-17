import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import LogoLockup from "./ui/LogoLockup";

interface Props {
  tone: "success" | "error" | "neutral";
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  code?: string;
  children: ReactNode;
}

const AuthStatus = ({ tone, eyebrow, title, description, icon: StatusIcon, code, children }: Props) => (
  <div className="sicpes-ui">
    <main className="mk-status-app">
      <section className="mk-status-card">
        <Link to="/" className="mk-status-brand" aria-label="SICPES, ir al inicio">
          <LogoLockup />
        </Link>
        <div className={`mk-auth-status ${tone}`}>
          {code ? (
            <strong className="mk-auth-status-code">{code}</strong>
          ) : StatusIcon ? (
            <span className={`mk-auth-status-icon ${tone}`}>
              <StatusIcon size={27} strokeWidth={2} />
            </span>
          ) : null}
          <span className="mk-eyebrow">{eyebrow}</span>
          <h2 className="mk-auth-title">{title}</h2>
          <p className="mk-lead">{description}</p>
          <div className="mk-auth-status-actions">{children}</div>
        </div>
        <p className="mk-auth-p-foot">© 2025 SICPES · Residencias estudiantiles</p>
      </section>
    </main>
  </div>
);

export default AuthStatus;
