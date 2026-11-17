type Tone = "ok" | "rev" | "no" | "pend";

interface Props {
  tone: Tone;
  children: React.ReactNode;
}

// Pastilla de estado del prototipo (.mk-status)
const StatusPill = ({ tone, children }: Props) => (
  <span className={`mk-status mk-${tone}`}>
    <i />
    {children}
  </span>
);

export default StatusPill;
