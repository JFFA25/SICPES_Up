import { useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

type LegalDocument = "privacy" | "terms";

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const documents: Record<
  LegalDocument,
  { title: string; intro: string; sections: LegalSection[] }
> = {
  privacy: {
    title: "Aviso de privacidad",
    intro:
      "Este aviso describe cómo el portal SICPES Residencial utiliza los datos personales necesarios para ofrecer sus funciones de cuenta, reservación y consulta de pagos.",
    sections: [
      {
        title: "Datos que podemos tratar",
        items: [
          "Datos de cuenta: nombre, correo electrónico y, si se proporciona, teléfono y contraseña (la contraseña se almacena protegida mediante un hash).",
          "Si inicias sesión con Google, recibimos tu nombre, correo verificado y foto de perfil disponibles en esa cuenta.",
          "Datos de operación: solicitudes de reservación, habitación solicitada, fechas, importes, estado e historial de pagos.",
          "Comprobantes de pago y fotos de perfil que decidas subir a la plataforma.",
        ],
      },
      {
        title: "Para qué se utilizan",
        paragraphs: [
          "Utilizamos estos datos para crear y mantener tu cuenta, autenticarte, atender solicitudes de reservación, registrar y revisar pagos, enviarte mensajes relacionados con la cuenta y responder consultas de soporte.",
        ],
      },
      {
        title: "Servicios que intervienen",
        paragraphs: [
          "Google proporciona el inicio de sesión cuando eliges esa opción. Cloudinary almacena las fotos de perfil y los comprobantes que se suben. También utilizamos proveedores técnicos de alojamiento, base de datos y correo para operar el portal y enviar mensajes de cuenta.",
          "El personal autorizado de SICPES puede consultar la información necesaria para administrar reservaciones y revisar pagos. No vendemos tus datos personales.",
        ],
      },
      {
        title: "Conservación y solicitudes",
        paragraphs: [
          "Conservamos los datos mientras sean necesarios para operar la cuenta y mantener los registros de reservaciones y pagos, o durante el tiempo que resulte necesario para atender obligaciones aplicables.",
          "Para solicitar acceso, corrección o eliminación de tus datos, escribe a sicpes.soporte@gmail.com desde el correo asociado a tu cuenta e indica qué solicitud deseas realizar. Revisaremos la solicitud y te contactaremos si necesitamos verificar tu identidad.",
        ],
      },
      {
        title: "Sesión y cambios a este aviso",
        paragraphs: [
          "El portal utiliza una cookie de sesión necesaria para mantener tu acceso mientras usas la cuenta. Podemos actualizar este aviso cuando cambien las funciones o el tratamiento de datos; la versión vigente estará publicada en esta página.",
        ],
      },
      {
        title: "Contacto",
        paragraphs: [
          "Si tienes dudas sobre este aviso o el uso de tus datos, escríbenos a sicpes.soporte@gmail.com.",
        ],
      },
    ],
  },
  terms: {
    title: "Términos y condiciones",
    intro:
      "Estos términos aplican al uso del portal SICPES Residencial, que permite administrar cuentas, enviar solicitudes de habitación y consultar registros de pago.",
    sections: [
      {
        title: "Cuenta y acceso",
        paragraphs: [
          "Debes proporcionar información correcta y mantener la confidencialidad de tus credenciales. Si detectas un acceso que no reconoces, comunícate con soporte. También puedes iniciar sesión usando una cuenta de Google.",
        ],
      },
      {
        title: "Reservaciones",
        paragraphs: [
          "Enviar una solicitud desde el portal no garantiza la asignación de una habitación. La solicitud queda sujeta a revisión y confirmación por parte del personal responsable; el estado mostrado en tu cuenta refleja el resultado de esa revisión.",
        ],
      },
      {
        title: "Pagos y comprobantes",
        paragraphs: [
          "El portal permite consultar registros de pago y, cuando la función esté disponible, enviar un comprobante para revisión. Subir un comprobante no significa que el pago haya sido aprobado; el personal responsable debe validarlo y actualizar su estado.",
        ],
      },
      {
        title: "Uso aceptable",
        paragraphs: [
          "Te comprometes a usar el portal de forma legal, proporcionar información veraz y no intentar acceder a cuentas ajenas, interferir con el funcionamiento del servicio ni subir contenido ilícito o que no tengas derecho a compartir.",
        ],
      },
      {
        title: "Disponibilidad y cambios",
        paragraphs: [
          "Podemos actualizar o suspender funciones del portal para mantenimiento, seguridad o mejoras. Estos términos pueden cambiar; publicaremos la versión vigente en esta página.",
          "El uso del portal no sustituye los acuerdos o condiciones particulares de alojamiento que correspondan a una reservación confirmada.",
        ],
      },
      {
        title: "Contacto",
        paragraphs: [
          "Para consultas sobre estos términos, escribe a sicpes.soporte@gmail.com.",
        ],
      },
    ],
  },
};

const LegalPage = ({ documentType }: { documentType: LegalDocument }) => {
  const legalDocument = documents[documentType];

  useEffect(() => {
    window.document.title = `${legalDocument.title} | SICPES`;
  }, [legalDocument.title]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#173D2A]">
      <Navbar />
      <main className="px-4 py-10 sm:px-6 lg:py-14">
        <article className="mx-auto max-w-3xl rounded-2xl border border-[#EDE8DB] bg-white p-6 shadow-sm sm:p-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#4C7A5F]">
            SICPES Residencial
          </p>
          <h1 className="mb-3 text-3xl font-bold">{legalDocument.title}</h1>
          <p className="mb-8 text-sm text-[#66766A]">
            Última actualización: 26 de noviembre de 2026
          </p>
          <p className="mb-8 leading-7">{legalDocument.intro}</p>

          <div className="space-y-7">
            {legalDocument.sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 text-xl font-semibold">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p className="mb-3 leading-7" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="list-disc space-y-2 pl-6 leading-7">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-8 border-t border-[#EDE8DB] pt-5 text-sm text-[#66766A]">
            <Link className="font-semibold text-[#217048] underline" to="/contact">
              Contacto
            </Link>
            {" · "}
            <Link className="font-semibold text-[#217048] underline" to="/">
              Volver al inicio
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
