import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface Settings {
  precioIndividual: number;
  precioCompartida: number;
  emailAdmin: string;
}

const AdminSettings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({
    precioIndividual: 2500,
    precioCompartida: 1800,
    emailAdmin: "admin@sicpes.com",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message, showError, showSuccess, clear } = useTimedMessage();

  useEffect(() => {
    document.title = "Configuración | Panel administrativo";
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings", { credentials: "include" });
        if (response.status === 401) {
          navigate("/login");
          return;
        }
        if (!response.ok) throw new Error("No se pudieron cargar las configuraciones.");
        const data = await response.json();
        setSettings({
          precioIndividual: Number(data.precioIndividual) || 2500,
          precioCompartida: Number(data.precioCompartida) || 1800,
          emailAdmin: String(data.emailAdmin || ""),
        });
      } catch (error) {
        showError(error instanceof Error ? error.message : "No se pudieron cargar las configuraciones.");
      } finally {
        setLoading(false);
      }
    };
    void fetchSettings();
  }, [navigate, showError]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (settings.precioIndividual <= 0 || settings.precioCompartida <= 0) {
      showError("Los precios deben ser mayores a cero.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.emailAdmin.trim())) {
      showError("Ingresa un correo de administrador válido.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...settings, emailAdmin: settings.emailAdmin.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar las configuraciones.");
      if (result.settings) {
        setSettings({
          precioIndividual: Number(result.settings.precioIndividual),
          precioCompartida: Number(result.settings.precioCompartida),
          emailAdmin: String(result.settings.emailAdmin),
        });
      }
      showSuccess(result.message || "Configuraciones guardadas.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron guardar las configuraciones.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminNavbar active="settings">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} onClose={clear}>{message.text}</Alert></div>}

        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Configuración</h1>
            <p>Administra los precios y los datos de contacto de SICPES.</p>
          </div>
          <span className="admin-settings-badge"><Icon name="shield" size={14} /> Ajustes del sistema</span>
        </header>

        <section className="admin-panel admin-link-card" style={{ marginBottom: 12 }}>
          <div>
            <span className="admin-eyebrow">HABITACIONES Y FOTOS</span>
            <h2 style={{ margin: "4px 0" }}>Fotos, tipo y capacidad de cada habitación</h2>
            <p style={{ margin: 0 }}>Las fotos de cada habitación se editan en Pisos; las de la galería de "La residencia", en su propio apartado.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/admin/floors" className="admin-btn"><Icon name="building" size={14} /> Ir a Pisos</Link>
            <Link to="/admin/residence" className="admin-btn ghost"><Icon name="image" size={14} /> Fotos de la residencia</Link>
          </div>
        </section>

        {loading ? (
          <div className="admin-list"><div className="admin-empty">Cargando configuraciones...</div></div>
        ) : (
          <form className="admin-settings-grid" onSubmit={saveSettings}>
            <section className="admin-panel admin-settings-panel">
              <span className="admin-eyebrow">PRECIOS DE ALOJAMIENTO</span>
              <h2>Tarifas mensuales</h2>
              <p>Se muestran en las nuevas reservaciones y en la información de pagos.</p>
              <label className="admin-field">
                <span>Habitación individual (MXN)</span>
                <div className="admin-input-prefix"><span>$</span><input type="number" min="1" step="1" value={settings.precioIndividual} onChange={(event) => setSettings({ ...settings, precioIndividual: Number(event.target.value) })} /></div>
              </label>
              <label className="admin-field">
                <span>Habitación compartida (MXN)</span>
                <div className="admin-input-prefix"><span>$</span><input type="number" min="1" step="1" value={settings.precioCompartida} onChange={(event) => setSettings({ ...settings, precioCompartida: Number(event.target.value) })} /></div>
              </label>
              <div className="admin-settings-note"><Icon name="sparkles" size={15} /> Los precios se aplican a las solicitudes nuevas.</div>
            </section>

            <div className="admin-settings-side">
              <section className="admin-panel admin-settings-panel">
                <span className="admin-eyebrow">CONTACTO</span>
                <h2>Correo de administración</h2>
                <p>Dirección para contacto y consultas relacionadas con el alojamiento.</p>
                <label className="admin-field">
                  <span>Correo electrónico</span>
                  <input type="email" autoComplete="email" value={settings.emailAdmin} onChange={(event) => setSettings({ ...settings, emailAdmin: event.target.value })} required />
                </label>
              </section>
              <section className="admin-panel admin-settings-info">
                <span className="admin-settings-info-icon"><Icon name="bell" size={16} /></span>
                <div><strong>Notificaciones del sistema</strong><p>Los avisos de reservaciones y pagos se envían automáticamente. No hay opciones de notificación manual en esta configuración.</p></div>
              </section>
            </div>

            <div className="admin-settings-actions">
              <button type="submit" className="admin-btn" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </form>
        )}
      </div>
    </AdminNavbar>
  );
};

export default AdminSettings;
