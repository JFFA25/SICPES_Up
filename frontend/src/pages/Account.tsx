import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cropper, { type Area, type Point } from "react-easy-crop";
import ResidentLayout from "../components/ResidentLayout";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import "../styles/account.css";

interface Profile {
  id: number;
  nombre: string | null;
  email: string | null;
  telefono?: string | null;
  foto_perfil_url?: string | null;
}

interface ReservationSummary {
  habitacion?: string;
  piso?: string;
  tipo?: string;
  estado?: string;
  fecha_ingreso?: string;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const createCroppedImage = (imageSrc: string, area: Area) =>
  new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("No se pudo preparar el recorte de la imagen."));
        return;
      }

      canvas.width = 512;
      canvas.height = 512;
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen recortada."))),
        "image/webp",
        0.9
      );
    };
    image.onerror = () => reject(new Error("No se pudo abrir la imagen seleccionada."));
    image.src = imageSrc;
  });

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const Account = () => {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    document.title = "Mi cuenta";
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile/me", { credentials: "include" });
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          navigate("/login");
          return;
        }
        if (!response.ok) {
          throw new Error(result.error || "No se pudo cargar tu perfil.");
        }
        if (active) setProfile(result.user);

        try {
          const reservationResponse = await fetch("/api/reservation/me", { credentials: "include" });
          if (reservationResponse.ok) {
            const reservationData = await reservationResponse.json();
            if (active) setReservation(reservationData);
          }
        } catch (error) {
          console.error("Error cargando la reservación del perfil:", error);
        }
      } catch (error) {
        if (active) {
          setNotice({
            type: "error",
            text: error instanceof Error ? error.message : "No se pudo cargar tu perfil.",
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    if (!croppedBlob) {
      setCroppedPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(croppedBlob);
    setCroppedPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  const handleFileSelection = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setCroppedBlob(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice({ type: "error", text: "Elige una imagen JPG, PNG o WebP." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setCroppedBlob(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice({ type: "error", text: "La imagen debe pesar 3 MB o menos." });
      return;
    }

    setSelectedFile(file);
    setCroppedBlob(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropModalOpen(true);
    setNotice(null);
  };

  const handleApplyCrop = async () => {
    if (!previewUrl || !croppedAreaPixels) return;

    setIsCropping(true);
    try {
      setCroppedBlob(await createCroppedImage(previewUrl, croppedAreaPixels));
      setCropModalOpen(false);
      setNotice(null);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo recortar la imagen.",
      });
    } finally {
      setIsCropping(false);
    }
  };

  const handleCancelCrop = () => {
    setCropModalOpen(false);
    if (!croppedBlob) {
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setCroppedBlob(null);
    setCropModalOpen(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !croppedBlob) return;

    const formData = new FormData();
    formData.append("avatar", new File([croppedBlob], "avatar.webp", { type: "image/webp" }));
    setIsUploading(true);
    setNotice(null);

    try {
      const response = await fetch("/api/profile/me/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        navigate("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "No se pudo actualizar tu foto.");
      }

      setProfile(result.user);
      setSelectedFile(null);
      setCroppedBlob(null);
      if (fileInput.current) fileInput.current.value = "";
      setNotice({ type: "success", text: "Tu foto de perfil se actualizó correctamente." });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "No se pudo actualizar tu foto.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const avatar = croppedPreviewUrl || previewUrl || profile?.foto_perfil_url;
  const dateParts = reservation?.fecha_ingreso?.split("T")[0].split("-").map(Number);
  const formattedDate = dateParts?.length === 3 && dateParts.every(Number.isFinite)
    ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ResidentLayout active="account" userName={profile?.nombre ?? undefined} userPhoto={profile?.foto_perfil_url}>
      <div className="mk-page-head">
        <div>
          <span className="mk-eyebrow">TU ESPACIO PERSONAL</span>
          <h1 className="mk-page-title">Mi cuenta</h1>
          <p className="mk-lead">Consulta tus datos y mantén actualizado tu perfil.</p>
        </div>
      </div>

      {notice && (
        <Notice type={notice.type} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      {isLoading ? (
        <article className="mk-card mk-account-loading" role="status">Cargando tu perfil…</article>
      ) : profile ? (
        <div className="mk-account-grid">
          <article className="mk-card mk-account-identity">
            <div className="mk-account-cover" aria-hidden="true">
              <span className="mk-account-cover-mark"><Icon name="sparkles" size={22} /></span>
            </div>
            <div className="mk-account-identity-body">
              <span className="mk-avatar mk-account-avatar">
                {avatar ? <img src={avatar} alt={`Foto de ${profile.nombre || "usuario"}`} /> : initials(profile.nombre || "SICPES")}
              </span>
              <h2>{profile.nombre || "Usuario SICPES"}</h2>
              <p>{profile.email || "Correo no disponible"}</p>
              <div className="mk-account-photo-actions">
                <input
                  ref={fileInput}
                  className="mk-account-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Seleccionar foto de perfil"
                  onChange={(event) => handleFileSelection(event.target.files?.[0])}
                />
                <button
                  className="mk-btn mk-secondary"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={isUploading}
                >
                  <Icon name="upload" size={15} />
                  Elegir foto
                </button>
                {selectedFile && croppedBlob && (
                  <>
                    <button className="mk-btn mk-primary" type="button" onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? "Subiendo…" : "Guardar foto"}
                    </button>
                    <button
                      className="mk-account-cancel"
                      type="button"
                      onClick={() => setCropModalOpen(true)}
                      disabled={isUploading}
                    >
                      Ajustar
                    </button>
                    <button
                      className="mk-account-cancel"
                      type="button"
                      onClick={clearSelection}
                      disabled={isUploading}
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              <small className="mk-account-hint">JPG, PNG o WebP · máximo 3 MB</small>
            </div>
          </article>

          <article className="mk-card mk-account-details">
            <div className="mk-card-head">
              <div>
                <span className="mk-eyebrow">INFORMACIÓN</span>
                <h2 className="mk-card-title">Datos personales</h2>
              </div>
              <span className="mk-account-detail-icon"><Icon name="user" size={17} /></span>
            </div>
            <dl className="mk-account-detail-list">
              <div>
                <dt>Nombre completo</dt>
                <dd>{profile.nombre || "No disponible"}</dd>
              </div>
              <div>
                <dt>Correo electrónico</dt>
                <dd><Icon name="mail" size={14} />{profile.email || "No disponible"}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd><Icon name="phone" size={14} />{profile.telefono || "No registrado"}</dd>
              </div>
            </dl>
            <p className="mk-account-readonly">Si necesitas cambiar tus datos, contacta al equipo de soporte.</p>
          </article>

          <article className="mk-card mk-account-residence">
            <div className="mk-card-head">
              <div>
                <span className="mk-eyebrow">ESTANCIA</span>
                <h2 className="mk-card-title">Mi residencia</h2>
              </div>
              <span className="mk-account-detail-icon"><Icon name="building" size={17} /></span>
            </div>
            {reservation ? (
              <dl className="mk-account-residence-grid">
                <div><dt>Habitación</dt><dd>{reservation.habitacion || "En asignación"}</dd></div>
                <div><dt>Piso</dt><dd>{reservation.piso || "—"}</dd></div>
                <div><dt>Tipo</dt><dd>{reservation.tipo || "—"}</dd></div>
                <div><dt>Estado</dt><dd>{reservation.estado || "—"}</dd></div>
                {formattedDate && <div className="mk-account-residence-date"><dt>Fecha de ingreso</dt><dd>{formattedDate}</dd></div>}
              </dl>
            ) : (
              <p className="mk-empty-note">Aún no tienes una reservación registrada.</p>
            )}
            <Link to="/reservation" className="mk-btn mk-secondary mk-account-residence-link">
              Ver reservación <Icon name="arrowRight" size={15} />
            </Link>
          </article>

          <article className="mk-card mk-account-shortcuts">
            <span className="mk-eyebrow">ACCESOS RÁPIDOS</span>
            <Link to="/dashboard"><Icon name="home" size={16} /><span>Mi inicio</span><Icon name="chevronRight" size={15} /></Link>
            <Link to="/payments"><Icon name="card" size={16} /><span>Mis pagos</span><Icon name="chevronRight" size={15} /></Link>
            <Link to="/contact"><Icon name="shield" size={16} /><span>Contactar soporte</span><Icon name="chevronRight" size={15} /></Link>
          </article>
        </div>
      ) : null}

      {cropModalOpen && previewUrl && (
        <div className="mk-account-crop-backdrop" role="presentation">
          <section className="mk-account-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <header>
              <div>
                <span className="mk-eyebrow">AJUSTAR FOTO</span>
                <h2 id="crop-title">Centra tu imagen</h2>
                <p>Arrastra la foto y ajusta el zoom para elegir cómo se verá tu avatar.</p>
              </div>
              <button type="button" className="mk-account-crop-close" onClick={handleCancelCrop} aria-label="Cerrar recorte">
                ×
              </button>
            </header>
            <div className="mk-account-crop-stage">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>
            <label className="mk-account-zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                aria-label="Ajustar zoom de la foto"
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
            <footer>
              <button type="button" className="mk-btn mk-ghost" onClick={handleCancelCrop} disabled={isCropping}>
                Cancelar
              </button>
              <button type="button" className="mk-btn mk-primary" onClick={handleApplyCrop} disabled={isCropping}>
                {isCropping ? "Preparando…" : "Aplicar recorte"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </ResidentLayout>
  );
};

export default Account;
