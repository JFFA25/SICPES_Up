interface Props {
  type: "success" | "error" | "info";
  onClose?: () => void;
  children: React.ReactNode;
}

const Notice = ({ type, onClose, children }: Props) => (
  <div className={`mk-alert ${type}`} role={type === "error" ? "alert" : "status"}>
    <span>{children}</span>
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
    )}
  </div>
);

export default Notice;
