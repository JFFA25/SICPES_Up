import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    BedDouble,
    Building2,
    ChevronLeft,
    ChevronRight,
    Droplets,
    MapPin,
    ShieldCheck,
    Sofa,
    Sparkles,
    UsersRound,
    Wifi,
    Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import buildingImg from "../assets/images/building.jpg";
import towerImg from "../assets/images/departament.webp";
import individualImg from "../assets/images/room_individual.jpg";
import sharedImg from "../assets/images/room_shared.jpg";
import { fallbackPhoto, photosOf, useRoomDetails } from "../hooks/useRoomDetails";
import "../styles/sicpes-ui.css";

// ── Galería ──────────────────────────────────────────────────────────────────
// Las fotos vienen de las habitaciones (las sube el administrador a Cloudinary).
// Mientras no haya fotos cargadas se muestran estas de respaldo.
const FALLBACK_GALLERY = [
    { src: individualImg, label: "Habitación individual" },
    { src: sharedImg, label: "Habitación compartida" },
    { src: buildingImg, label: "Fachada" },
    { src: towerImg, label: "Edificio de la residencia" },
];

const SERVICES = [
    { icon: Wifi, title: "Internet Wi-Fi", text: "Conexión para estudiar y trabajar." },
    { icon: Droplets, title: "Agua", text: "Servicio incluido en tu renta." },
    { icon: Zap, title: "Luz", text: "Sin cargos aparte por electricidad." },
    { icon: Sofa, title: "Mobiliario completo", text: "Tu habitación llega equipada." },
    { icon: Sparkles, title: "Limpieza de áreas comunes", text: "Espacios compartidos siempre cuidados." },
    { icon: ShieldCheck, title: "Vigilancia", text: "Un entorno seguro para vivir." },
];

const STEPS = [
    { title: "Crea tu cuenta", text: "Regístrate y verifica tu cuenta con el código que te enviamos." },
    { title: "Elige tu habitación", text: "Revisa pisos y disponibilidad y envía tu solicitud." },
    { title: "Sube tu comprobante", text: "Paga tu renta y registra tu comprobante desde Pagos." },
];

const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);

const Residence = () => {
    const [selected, setSelected] = useState(0);
    const { rooms, loading, error } = useRoomDetails();
    const loadError = Boolean(error);

    useEffect(() => {
        document.title = "La residencia | SICPES";
    }, []);

    // Pisos: piso → habitaciones
    const floorEntries = useMemo(() => {
        const grouped = new Map<string, typeof rooms>();
        rooms.forEach((room) => grouped.set(room.piso, [...(grouped.get(room.piso) ?? []), room]));
        return Array.from(grouped.entries());
    }, [rooms]);
    const totalRooms = rooms.length;

    // Galería: todas las fotos reales (sin repetir); si no hay, las de respaldo.
    const gallery = useMemo(() => {
        const seen = new Set<string>();
        const photos: { src: string; label: string }[] = [];
        rooms.forEach((room) =>
            room.fotos.forEach((photo) => {
                if (seen.has(photo.url) || photos.length >= 12) return;
                seen.add(photo.url);
                photos.push({
                    src: photo.url,
                    label: `Habitación ${room.habitacion} · ${room.tipo === "compartida" ? "Compartida" : "Individual"}`,
                });
            })
        );
        return photos.length ? photos : FALLBACK_GALLERY;
    }, [rooms]);

    useEffect(() => {
        if (selected >= gallery.length) setSelected(0);
    }, [gallery.length, selected]);

    // Precio y foto de cada tipo, tomados de las habitaciones reales
    const typeInfo = (tipo: "individual" | "compartida") => {
        const ofType = rooms.filter((room) => room.tipo === tipo);
        const withPhoto = ofType.find((room) => room.fotos.length > 0);
        return {
            price: ofType[0]?.precio,
            img: withPhoto ? photosOf(withPhoto)[0] : fallbackPhoto(tipo),
            count: ofType.length,
        };
    };
    const individual = typeInfo("individual");
    const shared = typeInfo("compartida");
    const prices = [individual, shared].map((info) => info.price).filter((value): value is number => Boolean(value));
    const lowestPrice = prices.length ? Math.min(...prices) : null;

    const stats = [
        { icon: Building2, value: !loading ? String(floorEntries.length) : "—", label: "Pisos" },
        { icon: BedDouble, value: !loading ? String(totalRooms) : "—", label: "Habitaciones" },
        { icon: UsersRound, value: !loading ? String((individual.count ? 1 : 0) + (shared.count ? 1 : 0)) : "—", label: "Tipos de habitación" },
        { icon: Zap, value: lowestPrice ? formatMoney(lowestPrice) : "—", label: "Renta desde / mes" },
    ];

    const previous = () => setSelected((i) => (i - 1 + gallery.length) % gallery.length);
    const next = () => setSelected((i) => (i + 1) % gallery.length);

    return (
        <div className="mk-home">
            <Navbar />

            <main className="mx-auto w-full max-w-[1180px] px-6 pb-16">
                {/* ENCABEZADO */}
                <header className="pt-12 pb-8">
                    <span className="mk-home-eyebrow">LA RESIDENCIA</span>
                    <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-[#173D2A] md:text-5xl">
                        Conoce el lugar donde <span className="text-[#287A51]">vas a vivir.</span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-base text-[#66766A]">
                        Un espacio pensado para estudiantes: habitaciones equipadas, servicios incluidos y un
                        entorno tranquilo cerca de tu campus.
                    </p>
                </header>

                {/* GALERÍA */}
                <section aria-label="Galería de la residencia" className="grid gap-4 lg:grid-cols-[1fr_auto]">
                    <div className="relative overflow-hidden rounded-2xl border border-[#E9E4D7] bg-white shadow-sm">
                        <img
                            key={gallery[selected].src}
                            src={gallery[selected].src}
                            alt={gallery[selected].label}
                            className="h-[320px] w-full object-cover sm:h-[420px]"
                        />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent p-4 text-white">
                            <span className="text-sm font-semibold">{gallery[selected].label}</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={previous}
                                    aria-label="Foto anterior"
                                    className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#173D2A] transition hover:bg-white"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={next}
                                    aria-label="Foto siguiente"
                                    className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#173D2A] transition hover:bg-white"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto lg:w-40 lg:flex-col lg:overflow-visible">
                        {gallery.map((photo, index) => (
                            <button
                                key={photo.src}
                                type="button"
                                onClick={() => setSelected(index)}
                                aria-label={photo.label}
                                aria-current={index === selected}
                                className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition lg:h-24 lg:w-full ${
                                    index === selected ? "border-[#287A51]" : "border-transparent opacity-70 hover:opacity-100"
                                }`}
                            >
                                <img src={photo.src} alt="" className="h-full w-full object-cover" />
                            </button>
                        ))}
                    </div>
                </section>

                {/* CIFRAS */}
                <section aria-label="La residencia en cifras" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {stats.map(({ icon: Icon, value, label }) => (
                        <article
                            key={label}
                            className="flex items-center gap-3 rounded-2xl border border-[#E9E4D7] bg-white p-4 shadow-sm"
                        >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E6F3E9] text-[#287A51]">
                                <Icon size={20} />
                            </span>
                            <div className="min-w-0">
                                <strong className="block truncate text-xl text-[#173D2A]">{value}</strong>
                                <small className="text-xs text-[#66766A]">{label}</small>
                            </div>
                        </article>
                    ))}
                </section>
                {loadError && (
                    <p className="mt-3 text-sm text-[#A93830]">
                        No pudimos cargar los datos actualizados de pisos y precios. Intenta de nuevo más tarde.
                    </p>
                )}

                {/* TIPOS DE HABITACIÓN */}
                <section className="mt-14">
                    <span className="mk-home-eyebrow">HABITACIONES</span>
                    <h2 className="mt-3 text-2xl font-bold text-[#173D2A]">Elige cómo quieres vivir</h2>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        {[
                            {
                                title: "Individual",
                                img: individual.img,
                                price: individual.price,
                                text: "Tu propio espacio para concentrarte, con total privacidad.",
                                points: ["Una persona", "Mobiliario completo", "Servicios incluidos"],
                            },
                            {
                                title: "Compartida",
                                img: shared.img,
                                price: shared.price,
                                text: "Comparte habitación y reduce tu renta mensual.",
                                points: ["Convivencia entre estudiantes", "Mobiliario completo", "Servicios incluidos"],
                            },
                        ].map((room) => (
                            <article
                                key={room.title}
                                className="overflow-hidden rounded-2xl border border-[#E9E4D7] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <img src={room.img} alt={`Habitación ${room.title.toLowerCase()}`} className="h-48 w-full object-cover" />
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-lg font-bold text-[#173D2A]">{room.title}</h3>
                                        <div className="text-right">
                                            <strong className="block text-xl text-[#287A51]">
                                                {room.price ? formatMoney(room.price) : "—"}
                                            </strong>
                                            <small className="text-xs text-[#66766A]">por mes</small>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-[#66766A]">{room.text}</p>
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {room.points.map((point) => (
                                            <li
                                                key={point}
                                                className="rounded-full border border-[#E9E4D7] bg-[#FCFBF6] px-3 py-1 text-xs text-[#173D2A]"
                                            >
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* SERVICIOS */}
                <section className="mt-14">
                    <span className="mk-home-eyebrow">INCLUIDO EN TU RENTA</span>
                    <h2 className="mt-3 text-2xl font-bold text-[#173D2A]">Todo lo que necesitas, sin sorpresas</h2>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {SERVICES.map(({ icon: Icon, title, text }) => (
                            <article
                                key={title}
                                className="flex items-start gap-4 rounded-2xl border border-[#E9E4D7] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                            >
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#E6F3E9] text-[#287A51]">
                                    <Icon size={20} />
                                </span>
                                <div>
                                    <strong className="block text-[15px] text-[#173D2A]">{title}</strong>
                                    <small className="text-[13px] text-[#66766A]">{text}</small>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* PISOS */}
                <section className="mt-14">
                    <span className="mk-home-eyebrow">DISTRIBUCIÓN</span>
                    <h2 className="mt-3 text-2xl font-bold text-[#173D2A]">Pisos y habitaciones</h2>

                    <div className="mt-6 rounded-2xl border border-[#E9E4D7] bg-white p-5 shadow-sm">
                        {loading ? (
                            <p className="text-sm text-[#66766A]">{loadError ? "No disponible por ahora." : "Cargando distribución…"}</p>
                        ) : floorEntries.length === 0 ? (
                            <p className="text-sm text-[#66766A]">Pronto publicaremos la distribución de pisos.</p>
                        ) : (
                            <ul className="divide-y divide-[#F0ECE0]">
                                {floorEntries.map(([floor, rooms]) => (
                                    <li key={floor} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                                        <div className="flex w-40 shrink-0 items-center gap-2 font-semibold text-[#173D2A]">
                                            <Building2 size={17} className="text-[#287A51]" />
                                            Piso {floor}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {rooms.map((room) => (
                                                <span
                                                    key={room.id}
                                                    title={room.tipo === "compartida" ? "Compartida" : "Individual"}
                                                    className="rounded-lg border border-[#E9E4D7] bg-[#FCFBF6] px-2.5 py-1 text-xs font-medium text-[#173D2A]"
                                                >
                                                    {room.habitacion}
                                                    <span className="ml-1.5 text-[10px] font-bold uppercase text-[#287A51]">
                                                        {room.tipo === "compartida" ? "C" : "I"}
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* CÓMO RESERVAR */}
                <section className="mt-14">
                    <span className="mk-home-eyebrow">PROCESO</span>
                    <h2 className="mt-3 text-2xl font-bold text-[#173D2A]">Reservar es sencillo</h2>

                    <ol className="mt-6 grid gap-4 md:grid-cols-3">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="rounded-2xl border border-[#E9E4D7] bg-white p-5 shadow-sm">
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#287A51] text-sm font-bold text-white">
                                    {index + 1}
                                </span>
                                <strong className="mt-3 block text-[#173D2A]">{step.title}</strong>
                                <p className="mt-1 text-sm text-[#66766A]">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* LLAMADO A LA ACCIÓN */}
                <section className="mt-14 flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-r from-[#287A51] to-[#173D2A] p-8 text-white md:flex-row md:items-center">
                    <div>
                        <h2 className="text-2xl font-bold">¿Listo para apartar tu lugar?</h2>
                        <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                            <MapPin size={15} /> Universidad Tecnológica de Xicotepec de Juárez
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#173D2A] transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            Comenzar ahora <ArrowRight size={16} />
                        </Link>
                        <Link
                            to="/contact"
                            className="inline-flex items-center rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            Tengo dudas
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Residence;
