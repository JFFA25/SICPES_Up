// Iconos del prototipo SICPES (mismos trazos de Sketches/mockups/mockups.js)
import type { SVGProps } from "react";

const ICONS: Record<string, string> = {
  home: '<path d="M3 10.8 12 3l9 7.8V21H3V10.8Z"/><path d="M9 21v-7h6v7"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M8 3v3M16 3v3M3 9h18"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  logout: '<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V21h-4v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3v-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1H21v4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
  bed: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18M3 21v-3M21 21v-3"/><path d="M7 10V7h5v3"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M11 18.5a2 2 0 0 1 2 0"/><circle cx="12" cy="21" r=".5" fill="currentColor"/>',
  shield: '<path d="M12 3 4.5 6v5c0 4.7 3.2 8.2 7.5 10 4.3-1.8 7.5-5.3 7.5-10V6L12 3Z"/><path d="m9 12 2 2 4-4"/>',
  star: '<path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8L6.7 19.7l1-6L3.3 9.4l6-.9L12 3Z"/>',
  mapPin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  building: '<path d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M15 9h4a1 1 0 0 1 1 1v11M2 21h20"/><path d="M7 7h4M7 11h4M7 15h4M18 13h.01M18 17h.01"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h16M16 13h2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 7l3 3M14 9l3 3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sparkles: '<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/>',
  leaf: '<path d="M20 4C10 4 4 8 4 16c0 2 1 4 1 4s2-1 4-1c8 0 11-6 11-15Z"/><path d="M4 20c3-6 7-9 12-11"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z"/>',
  phone: '<path d="M6 3h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

const Icon = ({ name, size = 18, ...rest }: IconProps) => (
  <svg
    className="mk-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: ICONS[name] ?? ICONS.sparkles }}
    {...rest}
  />
);

export default Icon;
