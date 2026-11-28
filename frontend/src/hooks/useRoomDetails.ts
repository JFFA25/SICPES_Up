import { useCallback, useEffect, useState } from "react";
import roomIndividual from "../assets/images/room_individual.jpg";
import roomShared from "../assets/images/room_shared.jpg";

export interface RoomPhoto {
  id: number;
  url: string;
}

export interface RoomDetail {
  id: number;
  piso: string;
  habitacion: string;
  tipo: "individual" | "compartida";
  capacidad: number;
  descripcion: string | null;
  activa: boolean;
  precio: number;
  ocupantes: number;
  cupos: number;
  disponible: boolean;
  fotos: RoomPhoto[];
}

/** Foto de respaldo cuando una habitación todavía no tiene fotos en Cloudinary. */
export const fallbackPhoto = (tipo: string) => (tipo === "compartida" ? roomShared : roomIndividual);

/** Lista de URLs a mostrar para una habitación (sus fotos o la de respaldo). */
export const photosOf = (room: Pick<RoomDetail, "fotos" | "tipo"> | undefined | null): string[] => {
  if (!room) return [];
  return room.fotos.length ? room.fotos.map((photo) => photo.url) : [fallbackPhoto(room.tipo)];
};

export const roomCover = (room: Pick<RoomDetail, "fotos" | "tipo">) => photosOf(room)[0];

export const sortRooms = (rooms: RoomDetail[]) =>
  [...rooms].sort(
    (a, b) =>
      a.piso.localeCompare(b.piso, "es", { numeric: true }) ||
      a.habitacion.localeCompare(b.habitacion, "es", { numeric: true })
  );

/**
 * Carga las habitaciones con tipo, precio, cupos y fotos.
 * `admin` incluye también las habitaciones desactivadas.
 */
export const useRoomDetails = (admin = false) => {
  const [rooms, setRooms] = useState<RoomDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await fetch(admin ? "/api/rooms/admin/details" : "/api/rooms/details", {
        credentials: "include",
      });
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok) throw new Error("No se pudieron cargar las habitaciones.");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("La respuesta de habitaciones no es válida.");
      setRooms(sortRooms(data as RoomDetail[]));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rooms, loading, error, unauthorized, reload };
};

export const money = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value || 0);
