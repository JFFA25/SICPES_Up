import { useEffect } from "react";
import { FileText, ListChecks, CreditCard } from "lucide-react";
import AdminNavbar from "../components/admin/AdminNavbar";
import ReportGenerator from "../components/admin/ReportGenerator";
import LiveDashboard from "../components/admin/LiveDashboard";

// Estructura pensada para escalar: cada entrada es un reporte disponible.
// Hoy solo existe "general" (una sola plantilla en PDFMonkey); cuando se agreguen
// plantillas separadas para reservaciones/pagos, basta con sumar un objeto aquí
// y su propio generador, sin tocar el resto de la página.
const AVAILABLE_REPORTS = [
  {
    key: "general",
    title: "Reporte general",
    description: "Incluye reservaciones y pagos en un solo PDF. Puedes acotarlo a un rango de fechas específico.",
    icon: FileText,
  },
];

const UPCOMING_REPORTS = [
  { key: "reservations", title: "Reporte de reservaciones", icon: ListChecks },
  { key: "payments", title: "Reporte de pagos", icon: CreditCard },
];

const AdminReports = () => {
  useEffect(() => {
    document.title = "Reportes | Panel administrativo";
  }, []);

  return (
    <AdminNavbar active="reports">
      <div className="admin-page">
        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Reportes</h1>
            <p>Genera y descarga reportes en PDF con la información de tu sistema.</p>
          </div>
        </header>

        <div className="admin-report-grid">
          {AVAILABLE_REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.key}
                className="admin-panel admin-report-card"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="admin-report-icon flex items-center justify-center w-11 h-11 rounded-2xl">
                    <Icon className="w-5 h-5" strokeWidth={2.25} />
                  </span>
                  <h2 className="admin-report-title text-base font-bold">{report.title}</h2>
                </div>
                <p className="admin-report-description text-sm mb-5">{report.description}</p>
                <ReportGenerator />
              </div>
            );
          })}

          {UPCOMING_REPORTS.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.key}
                className="admin-panel admin-report-upcoming"
              >
                <span className="admin-report-icon flex items-center justify-center w-11 h-11 rounded-2xl mb-3">
                  <Icon className="w-5 h-5" strokeWidth={2.25} />
                </span>
                <h2 className="admin-report-title text-base font-bold mb-1">{report.title}</h2>
                <p className="admin-report-upcoming-note text-sm">Próximamente</p>
              </div>
            );
          })}
        </div>

        <LiveDashboard />
      </div>
    </AdminNavbar>
  );
};

export default AdminReports;
