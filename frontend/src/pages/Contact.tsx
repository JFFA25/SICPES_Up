import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
    ChevronDown,
    Clock,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Zap,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import Alert from "../components/Alert";
import { useTimedMessage } from "../hooks/useTimedMessage";

// ── Datos de contacto (cámbialos aquí) ───────────────────────────────────────
const EMAIL = "sicpes.soporte@gmail.com";
const PHONE_LABEL = "776-104-3056";
const PHONE_TEL = "+527761043056";
const WHATSAPP = "527761043056";

// Reemplaza estas URLs por los perfiles reales de SICPES.
const SOCIALS = [
    { name: "Facebook", url: "https://www.facebook.com/", icon: "https://cdn-icons-png.flaticon.com/512/124/124010.png" },
    { name: "Twitter", url: "https://twitter.com/", icon: "https://cdn-icons-png.flaticon.com/512/733/733579.png" },
    { name: "Instagram", url: "https://www.instagram.com/", icon: "https://cdn-icons-png.flaticon.com/512/2111/2111463.png" },
];

// Horario por día de la semana (0 = domingo). null = cerrado.
const SCHEDULE: { label: string; days: number[]; open: number | null; close: number | null; text: string }[] = [
    { label: "Lunes a Viernes", days: [1, 2, 3, 4, 5], open: 9, close: 18, text: "9:00 AM - 6:00 PM" },
    { label: "Sábados", days: [6], open: 10, close: 14, text: "10:00 AM - 2:00 PM" },
    { label: "Domingos", days: [0], open: null, close: null, text: "Cerrado" },
];

const FAQS = [
    {
        q: "¿Cómo reservo una habitación?",
        a: "Crea tu cuenta, entra a Reservar, elige una habitación disponible y envía tu solicitud. El equipo la revisa y te avisa si fue aceptada.",
    },
    {
        q: "¿Cómo pago mi renta?",
        a: "Desde la sección Pagos puedes consultar tus cuotas y subir tu comprobante. El administrador lo valida y se refleja en tu historial.",
    },
    {
        q: "¿Qué incluye la renta?",
        a: "Servicios básicos, internet, mobiliario y limpieza de áreas comunes. El precio exacto depende del tipo de habitación.",
    },
    {
        q: "¿Cuánto tarda la confirmación?",
        a: "Normalmente respondemos en un máximo de 24 horas en días hábiles.",
    },
];

// Hora actual en la zona horaria del Centro de México
const mexicoNow = () => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Mexico_City",
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const hour = Number(get("hour")) % 24;
    return { day: dayMap[get("weekday")] ?? 0, hour: hour + Number(get("minute")) / 60 };
};

const Contact = () => {
    // Coordenadas fijas de la Pensión (UT Xicotepec de Juárez)
    const PENSION_LAT = 20.237911;
    const PENSION_LON = -97.958499;

    // Estados para controlar los datos devueltos por la API de OSRM
    const [distance, setDistance] = useState<string | null>(null);
    const [duration, setDuration] = useState<string | null>(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const { message, showError, clear } = useTimedMessage();

    // Formulario (se envía abriendo el correo del usuario)
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [sent, setSent] = useState(false);

    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [now, setNow] = useState(mexicoNow());

    useEffect(() => {
        document.title = "Contacto";
        const timer = setInterval(() => setNow(mexicoNow()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const todayRow = useMemo(() => SCHEDULE.find((row) => row.days.includes(now.day)), [now.day]);
    const isOpen = !!todayRow && todayRow.open !== null && todayRow.close !== null && now.hour >= todayRow.open && now.hour < todayRow.close;

    // FUNCIÓN DEL WEB SERVICE CORREGIDA MATEMÁTICAMENTE
    const calcularDistanciaAPension = () => {
        if (!navigator.geolocation) {
            showError("Tu navegador no soporta geolocalización.");
            return;
        }

        setLoadingRoute(true);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            try {
                // Consumo del Web Service de OSRM
                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/foot/${userLon},${userLat};${PENSION_LON},${PENSION_LAT}?overview=false`
                );
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    const ruta = data.routes[0];

                    // 1. Distancia exacta que devuelve el Web Service en kilómetros
                    const kilometrosNum = ruta.distance / 1000;
                    const kms = kilometrosNum.toFixed(2);

                    // 2. CÁLCULO DE SEGURIDAD: 1 km a pie = ~12.5 minutos.
                    const totalMinutos = Math.round(kilometrosNum * 12.5);

                    // 3. Formateo en horas y minutos si el trayecto es largo
                    let tiempoFormateado = "";
                    if (totalMinutos >= 60) {
                        const horas = Math.floor(totalMinutos / 60);
                        const minsRestantes = totalMinutos % 60;
                        tiempoFormateado = `${horas} h ${minsRestantes} min`;
                    } else {
                        tiempoFormateado = `${totalMinutos} min`;
                    }

                    setDistance(`${kms} km`);
                    setDuration(tiempoFormateado);
                } else {
                    showError("No se encontró una ruta factible a pie.");
                }
            } catch (error) {
                console.error("Error en el Web Service de mapas:", error);
                showError("No se pudo calcular la ruta. Intenta de nuevo más tarde.");
            } finally {
                setLoadingRoute(false);
            }
        }, () => {
            showError("Por favor acepta los permisos de ubicación para calcular tu ruta.");
            setLoadingRoute(false);
        });
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const subject = form.subject.trim() || "Consulta desde SICPES";
        const body = `${form.message.trim()}\n\n— ${form.name.trim()} (${form.email.trim()})`;
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSent(true);
        setTimeout(() => setSent(false), 6000);
    };

    const setField = (field: keyof typeof form) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const inputClass =
        "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

    return (
        <div className="min-h-screen bg-gray-100 animate-page-transition">
            <Navbar />

            {/* BREADCRUMBS */}
            <div className="max-w-7xl mx-auto px-6 md:px-10 mt-4">
                <Breadcrumbs />
            </div>

            {/* ENCABEZADO */}
            <header className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-2">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-700">
                    <span className="h-px w-8 bg-green-600" />
                    Contacto
                </p>
                <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-green-950">
                    ¿En qué podemos <span className="text-green-700">ayudarte?</span>
                </h1>
                <p className="mt-3 max-w-2xl text-gray-600">
                    Escríbenos, llámanos o visítanos. Respondemos tus dudas sobre reservaciones,
                    pagos y habitaciones en un máximo de 24 horas en días hábiles.
                </p>
            </header>

            {/* ACCESOS DIRECTOS */}
            <section className="max-w-7xl mx-auto px-6 md:px-10 mt-6 grid gap-4 sm:grid-cols-3">
                {[
                    { href: `mailto:${EMAIL}`, icon: Mail, title: "Correo", text: EMAIL, external: false },
                    { href: `tel:${PHONE_TEL}`, icon: Phone, title: "Llamar", text: PHONE_LABEL, external: false },
                    {
                        href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, tengo una duda sobre SICPES.")}`,
                        icon: MessageCircle,
                        title: "WhatsApp",
                        text: "Escríbenos un mensaje",
                        external: true,
                    },
                ].map(({ href, icon: Icon, title, text, external }) => (
                    <a
                        key={title}
                        href={href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group flex items-center gap-4 rounded-xl bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 transition group-hover:bg-green-700 group-hover:text-white">
                            <Icon className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-green-900">{title}</span>
                            <span className="block truncate text-sm text-gray-600">{text}</span>
                        </span>
                    </a>
                ))}
            </section>

            {/* FORMULARIO + HORARIOS */}
            <div className="grid lg:grid-cols-5 gap-6 px-6 md:px-10 mt-6 max-w-7xl mx-auto">
                {/* FORMULARIO */}
                <form
                    onSubmit={handleSubmit}
                    className="lg:col-span-3 rounded-xl bg-white p-6 md:p-8 shadow-md"
                >
                    <h2 className="text-xl font-bold text-green-700">Envíanos un mensaje</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Se abrirá tu aplicación de correo con el mensaje listo para enviar.
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Nombre
                            <input required value={form.name} onChange={setField("name")} className={`${inputClass} mt-1`} placeholder="Tu nombre completo" />
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            Correo electrónico
                            <input required type="email" value={form.email} onChange={setField("email")} className={`${inputClass} mt-1`} placeholder="tu@correo.com" />
                        </label>
                    </div>
                    <label className="mt-4 block text-sm font-medium text-gray-700">
                        Asunto
                        <input value={form.subject} onChange={setField("subject")} className={`${inputClass} mt-1`} placeholder="Ej. Duda sobre mi reservación" />
                    </label>
                    <label className="mt-4 block text-sm font-medium text-gray-700">
                        Mensaje
                        <textarea required rows={5} value={form.message} onChange={setField("message")} className={`${inputClass} mt-1 resize-y`} placeholder="Cuéntanos en qué podemos ayudarte" />
                    </label>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-green-800"
                        >
                            <Send className="h-4 w-4" strokeWidth={2.25} />
                            Enviar mensaje
                        </button>
                        {sent && <span className="text-sm text-green-700">Abriendo tu correo…</span>}
                    </div>
                </form>

                {/* HORARIOS */}
                <aside className="lg:col-span-2 flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
                    <img
                        src="https://images.unsplash.com/photo-1587614382346-4ec70e388b28"
                        alt="Atención y soporte SICPES"
                        className="h-40 w-full object-cover"
                    />
                    <div className="flex-1 p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="flex items-center gap-2 text-xl font-bold text-green-700">
                                <Clock className="h-5 w-5" strokeWidth={2.25} />
                                Horarios
                            </h2>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                    isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500" : "bg-gray-400"}`} />
                                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                            </span>
                        </div>

                        <ul className="mt-4 divide-y divide-gray-100">
                            {SCHEDULE.map((row) => {
                                const today = row.days.includes(now.day);
                                return (
                                    <li
                                        key={row.label}
                                        className={`flex items-center justify-between py-3 text-sm ${
                                            today ? "font-semibold text-green-800" : "text-gray-600"
                                        }`}
                                    >
                                        <span>
                                            {row.label}
                                            {today && (
                                                <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                                                    Hoy
                                                </span>
                                            )}
                                        </span>
                                        <span>{row.text}</span>
                                    </li>
                                );
                            })}
                        </ul>

                        <p className="mt-3 text-xs text-gray-500">Hora del Centro de México.</p>

                        <div className="mt-5 flex gap-3">
                            {SOCIALS.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-green-600 hover:shadow"
                                >
                                    <img src={social.icon} alt="" className="h-5 w-5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            {/* MAPA */}
            <section className="max-w-7xl mx-auto px-6 md:px-10 mt-6">
                <div className="rounded-xl bg-white p-6 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                            <h2 className="text-xl font-bold text-green-700">¿Dónde estamos?</h2>
                            <p className="text-sm text-gray-500">Universidad Tecnológica de Xicotepec de Juárez.</p>
                        </div>
                        <button
                            onClick={calcularDistanciaAPension}
                            className="flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-2 text-xs font-medium text-white shadow transition hover:bg-green-800 disabled:opacity-60"
                            disabled={loadingRoute}
                            title="Usa tu ubicación para calcular la distancia a pie"
                        >
                            {loadingRoute ? (
                                "Calculando..."
                            ) : (
                                <>
                                    <Zap className="w-3.5 h-3.5" strokeWidth={2.25} />
                                    ¿Qué tan lejos estoy?
                                </>
                            )}
                        </button>
                    </div>

                    {message && (
                        <div className="mb-3">
                            <Alert type={message.type} onClose={clear}>{message.text}</Alert>
                        </div>
                    )}

                    {/* Resultado dinámico de la respuesta del Web Service */}
                    {distance && duration && (
                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 p-3 rounded-lg mb-3 text-sm text-green-800">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2.25} />
                            <span>Te encuentras a <strong>{distance}</strong> de la pensión (Aprox. <strong>{duration} caminando</strong>).</span>
                        </div>
                    )}

                    <iframe
                        title="Mapa de ubicación de SICPES"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1316.8096511691192!2d-97.95849956359777!3d20.23791173649569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d08602491e37a1%3A0x4bbea4aede57d500!2sUniversidad%20Tecnol%C3%B3gica%20de%20Xicotepec%20de%20Ju%C3%A1rez!5e0!3m2!1ses!2smx!4v1749846297499!5m2!1ses!2smx"
                        className="w-full h-80 rounded-lg border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                </div>
            </section>

            {/* PREGUNTAS FRECUENTES */}
            <section className="max-w-7xl mx-auto px-6 md:px-10 mt-6 mb-10">
                <div className="rounded-xl bg-white p-6 md:p-8 shadow-md">
                    <h2 className="text-xl font-bold text-green-700">Preguntas frecuentes</h2>
                    <div className="mt-4 divide-y divide-gray-100">
                        {FAQS.map((faq, index) => {
                            const open = openFaq === index;
                            return (
                                <div key={faq.q}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(open ? null : index)}
                                        aria-expanded={open}
                                        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-green-900"
                                    >
                                        {faq.q}
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-green-700 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                    {open && <p className="pb-4 text-sm leading-relaxed text-gray-600">{faq.a}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Contact;
