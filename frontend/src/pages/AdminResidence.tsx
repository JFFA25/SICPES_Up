import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { useResidencePhotos } from "../hooks/useResidencePhotos";
import type { ResidencePhoto } from "../hooks/useResidencePhotos";
import { DEFAULT_GALLERY } from "../data/residenceDefaults";
import "../styles/rooms.css";

const MAX_PHOTOS = 12;
const MAX_BYTES = 5 * 1024 * 1024;

const readError = async (response: Response, fallback: string) => {
  const result = await response.json().catch(() => ({}));
  return typeof result.error === "string" ? result.error : fallback;
};

const AdminResidence = () => {
  const { photos, loading, reload } = useResidencePhotos();
  const { message, showError, showSuccess, clear } = useTimedMessage();
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<ResidencePhoto | null>(null);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Fotos de la residencia | Panel administrativo";
  }, []);

  useEffect(() => {
    setCaptions(Object.fromEntries(photos.map((photo) => [photo.id, photo.descripcion ?? ""])));
  }, [photos]);

  const upload = async (file: File, descripcion = "") => {
    const body = new FormData();
    body.append("photo", file);
    if (descripcion) body.append("descripcion", descripcion);
    const response = await fetch("/api/residence/photos", { method: "POST", credentials: "include", body });
    if (!response.ok) throw new Error(await readError(response, "No se pudo subir la foto."));
  };

  const onFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    let done = 0;
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        showError(`"${file.name}" pesa más de 5 MB.`);
        continue;
      }
      try {
        await upload(file);
        done += 1;
      } catch (error) {
        showError(error instanceof Error ? error.message : "No se pudo subir la foto.");
        break;
      }
    }
    await reload();
    if (done) showSuccess(done === 1 ? "Foto subida." : `${done} fotos subidas.`);
    setBusy(false);
  };

  // Sube las fotos predeterminadas para poder editarlas / reemplazarlas.
  const importDefaults = async () => {
    setBusy(true);
    try {
      for (const item of DEFAULT_GALLERY) {
        const blob = await (await fetch(item.src)).blob();
        const extension = blob.type.split("/")[1] || "jpg";
        await upload(new File([blob], `${item.label}.${extension}`, { type: blob.type }), item.label);
      }
      showSuccess("Galería lista. Ahora puedes cambiar, quitar o agregar fotos.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo importar la galería.");
    } finally {
      await reload();
      setBusy(false);
    }
  };

  const request = async (url: string, init: RequestInit, fallback: string) => {
    setBusy(true);
    try {
      const response = await fetch(url, { credentials: "include", ...init });
      if (!response.ok) throw new Error(await readError(response, fallback));
      await reload();
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveCaption = async (photo: ResidencePhoto) => {
    const text = (captions[photo.id] ?? "").trim();
    if (text === (photo.descripcion ?? "")) return;
    const ok = await request(
      `/api/residence/photos/${photo.id}`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ descripcion: text }) },
      "No se pudo guardar la descripción."
    );
    if (ok) showSuccess("Descripción guardada.");
  };

  const makeMain = async (photo: ResidencePhoto) => {
    const ok = await request(`/api/residence/photos/${photo.id}/cover`, { method: "PUT" }, "No se pudo cambiar la foto principal.");
    if (ok) showSuccess("Ahora es la foto principal.");
  };

  const remove = async (photo: ResidencePhoto) => {
    const ok = await request(`/api/residence/photos/${photo.id}`, { method: "DELETE" }, "No se pudo eliminar la foto.");
    if (ok) showSuccess("Foto eliminada.");
  };

  const usingDefaults = !loading && photos.length === 0;

  return (
    <AdminNavbar active="residence">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} onClose={clear}>{message.text}</Alert></div>}
        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Fotos de la residencia</h1>
            <p>Estas son las fotos de la galería de "La residencia". Los cambios se ven al instante en el sitio.</p>
          </div>
          <span className="admin-settings-badge"><Icon name="image" size={14} /> {usingDefaults ? DEFAULT_GALLERY.length : photos.length} de {MAX_PHOTOS} fotos</span>
        </header>

        {usingDefaults ? (
          <section className="admin-panel">
            <span className="admin-eyebrow">GALERÍA ACTUAL</span>
            <h2>Fotos predeterminadas</h2>
            <p style={{ margin: "4px 0 12px" }}>
              Así se ve hoy la página. Para cambiarlas, primero conviértelas en tu galería editable y después sube, quita o reordena a tu gusto.
            </p>
            <div className="admin-photo-grid">
              {DEFAULT_GALLERY.map((item) => (
                <figure key={item.label} className="admin-photo" style={{ margin: 0 }}>
                  <img src={item.src} alt={item.label} loading="lazy" />
                  <span className="admin-photo-cover" style={{ background: "#fff", color: "#1D432D" }}>{item.label}</span>
                </figure>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="admin-btn" disabled={busy} onClick={() => void importDefaults()}>
                <Icon name="upload" size={14} /> {busy ? "Preparando..." : "Editar galería"}
              </button>
              <button type="button" className="admin-btn ghost" disabled={busy} onClick={() => fileInput.current?.click()}>
                Empezar con mis propias fotos
              </button>
            </div>
          </section>
        ) : (
          <section className="admin-panel">
            <span className="admin-eyebrow">GALERÍA</span>
            <h2>Fotos publicadas</h2>
            <p style={{ margin: "4px 0 12px" }}>La primera foto es la principal. Escribe una descripción corta para cada una.</p>
            {loading ? (
              <div className="admin-empty">Cargando fotos...</div>
            ) : (
              <div className="admin-photo-grid">
                {photos.map((photo, index) => (
                  <figure key={photo.id} className="admin-photo" style={{ margin: 0 }}>
                    <img src={photo.url} alt={photo.descripcion || `Foto ${index + 1}`} loading="lazy" />
                    {index === 0 && <span className="admin-photo-cover">PRINCIPAL</span>}
                    <div className="admin-photo-actions">
                      {index !== 0 && <button type="button" disabled={busy} onClick={() => void makeMain(photo)}>Principal</button>}
                      <button type="button" className="danger" disabled={busy} onClick={() => setDeleting(photo)}>Quitar</button>
                    </div>
                    <input
                      className="admin-photo-caption"
                      value={captions[photo.id] ?? ""}
                      maxLength={120}
                      placeholder="Descripción"
                      disabled={busy}
                      onChange={(event) => setCaptions((prev) => ({ ...prev, [photo.id]: event.target.value }))}
                      onBlur={() => void saveCaption(photo)}
                    />
                  </figure>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button type="button" className={`admin-photo-add${busy ? " busy" : ""}`} onClick={() => fileInput.current?.click()} disabled={busy}>
                    <Icon name="upload" size={18} />
                    <span>{busy ? "Subiendo..." : "Subir fotos"}</span>
                  </button>
                )}
              </div>
            )}
            <p style={{ margin: "10px 0 0", color: "#66766A", fontSize: 9 }}>JPG, PNG o WebP, máximo 5 MB cada una. Si quitas todas, el sitio vuelve a mostrar las fotos predeterminadas.</p>
          </section>
        )}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} />
      </div>

      <ConfirmModal
        open={deleting !== null}
        title="Quitar foto"
        description="La foto dejará de mostrarse en la galería de La residencia."
        confirmLabel="Quitar foto"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          if (deleting) void remove(deleting);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </AdminNavbar>
  );
};

export default AdminResidence;
