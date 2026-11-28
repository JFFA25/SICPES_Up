import buildingImg from "../assets/images/building.jpg";
import towerImg from "../assets/images/departament.webp";
import individualImg from "../assets/images/room_individual.jpg";
import sharedImg from "../assets/images/room_shared.jpg";

export interface GalleryPhoto {
  src: string;
  label: string;
}

/** Fotos que trae la página "La residencia" mientras el admin no suba las suyas. */
export const DEFAULT_GALLERY: GalleryPhoto[] = [
  { src: individualImg, label: "Habitación individual" },
  { src: sharedImg, label: "Habitación compartida" },
  { src: buildingImg, label: "Fachada" },
  { src: towerImg, label: "Edificio de la residencia" },
];
