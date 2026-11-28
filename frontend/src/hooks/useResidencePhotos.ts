import { useCallback, useEffect, useState } from "react";

export interface ResidencePhoto {
  id: number;
  url: string;
  descripcion: string | null;
}

/** Galería de "La residencia" (fotos que sube el administrador). */
export const useResidencePhotos = () => {
  const [photos, setPhotos] = useState<ResidencePhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/residence/photos", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setPhotos(Array.isArray(data) ? data : []);
      }
    } catch {
      // sin conexión: se usan las fotos predeterminadas
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { photos, loading, reload };
};
