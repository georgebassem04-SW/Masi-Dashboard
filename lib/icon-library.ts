/**
 * ICON LIBRARY — the icons a client can choose for the header, the footer and the product filter button.
 * ------------------------------------------------------------------
 * The SAME file exists in the dashboard (lib/icon-library.ts) — keep both identical.
 * Chosen in the dashboard → Header → Icons, Footer → Contact details and Product filter → "Button icon". Only the icon's ID is saved
 * (e.g. "bag-line"); this file turns the ID into the drawing, on the website and in the dashboard's picker.
 *
 *   ICON_LIBRARY[slot][id]  -> the icon (null = "no icon, show the text", used by the language switch)
 *   ICON_THEMES             -> ready-made sets: one click chooses a matching icon for every slot
 *   iconFor(slot, id)       -> the icon, or the slot's default when the id is unknown (never breaks the page)
 *
 * TO ADD AN ICON: import it (https://lucide.dev/icons or https://react-icons.github.io/react-icons → "Font Awesome 5")
 * and add one line to its slot below, with a new id. Nothing else to change.
 * IDs ending in "-solid" are filled icons, "-line" are outline icons.
 */
import { createElement, type ComponentType, type SVGProps } from "react";
import {
  AlignJustify,
  AtSign,
  CircleUserRound,
  Clock,
  Equal,
  Funnel,
  FunnelPlus,
  ListFilter,
  Settings2,
  SlidersHorizontal,
  SlidersVertical,
  Globe,
  Handbag,
  Headset,
  Languages,
  LayoutGrid,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  PhoneCall,
  Search,
  Send,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Timer,
  User,
  UserRound,
} from "lucide-react";
import {
  FaBars,
  FaClock,
  FaEnvelope,
  FaFilter,
  FaSlidersH,
  FaGlobe,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegClock,
  FaRegEnvelope,
  FaRegUser,
  FaRegUserCircle,
  FaSearch,
  FaShoppingBag,
  FaShoppingBasket,
  FaShoppingCart,
  FaUser,
  FaUserCircle,
  FaWhatsapp,
} from "react-icons/fa";
import { BsFilterLeft, BsSliders } from "react-icons/bs";

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
const as = (c: unknown) => c as IconComponent;
/** Thicker version of an outline icon */
const bold = (icon: unknown): IconComponent => {
  const Bold = (props: SVGProps<SVGSVGElement>) => createElement(as(icon), { ...props, strokeWidth: 3 });
  return Bold;
};

/**
 * Drawn icons (a client's own brand drawings, e.g. from their Figma file): viewBox + the path(s) of the SVG.
 * They take the text colour (currentColor) and the size classes like the other icons.
 */
const drawn = (viewBox: string, paths: string[]): IconComponent => {
  const Drawn = ({ strokeWidth: _s, ...props }: SVGProps<SVGSVGElement>) =>
    createElement("svg", { viewBox, fill: "currentColor", "aria-hidden": true, ...props }, ...paths.map((d, i) => createElement("path", { key: i, d })));
  return Drawn;
};
/** Thin magnifier (MASI) */
const thin = (icon: unknown): IconComponent => {
  const Thin = (props: SVGProps<SVGSVGElement>) => createElement(as(icon), { ...props, strokeWidth: 1.25 });
  return Thin;
};
/** MASI bag: the cart icon inspired by the letter "M" of the MASI logo */
const MASI_BAG = drawn("52 48 166 162", [
    "M55.7358 104.028L84.0473 103.976L84.3108 99.8774C85.1102 87.5211 90.5213 75.937 99.5514 67.2489C109.038 58.1484 121.547 53.1287 134.75 53.1287C147.952 53.1287 160.277 58.0782 169.737 67.0646C178.882 75.7527 184.363 87.4157 185.171 99.8862L185.435 103.984H214.256L214.229 204.81L132.035 192.559L55.7534 204.845L55.7271 104.02L55.7358 104.028ZM208.713 198.43L208.739 109.522H183.643L183.616 126.758H172.408L172.381 109.522H93.7187L93.7012 126.758H82.5276L82.5101 109.522H61.2611L61.2787 198.403L131.763 187.004L208.713 198.43ZM134.732 64.1335C114.546 64.1335 97.7243 79.184 95.5985 99.1315L95.0803 103.984H174.393L173.875 99.1402C171.766 79.3157 155.05 64.2739 134.996 64.1335H134.732Z",
]);
/** MASI menu: three bars inspired by the letter "I" of the MASI logo */
const MASI_MENU = drawn("-20 -40 193 196", [
    "M152.98 115.316C150.142 114.075 147.107 113.116 143.894 112.453C138.267 111.298 130.76 110.714 121.582 110.714H31.3983C22.0728 110.714 14.4859 111.298 8.85861 112.453C5.70711 113.104 2.74605 114.038 0 115.242V94.6989C2.74605 95.9092 5.70711 96.8368 8.85247 97.488C14.535 98.6613 21.9131 99.2265 31.3922 99.2265H121.582C130.913 99.2265 138.205 98.6552 143.888 97.488C147.101 96.8306 150.136 95.8723 152.974 94.6313V115.316H152.98Z",
    "M152.98 68.9833C150.142 67.7423 147.107 66.784 143.894 66.1205C138.267 64.9656 130.76 64.3819 121.582 64.3819H31.3983C22.0728 64.3819 14.4859 64.9656 8.85861 66.1205C5.70711 66.7717 2.74605 67.7055 0 68.9095V48.3664C2.74605 49.5766 5.70711 50.5043 8.85247 51.1555C14.535 52.3288 21.9069 52.894 31.3922 52.894H121.582C130.913 52.894 138.212 52.3227 143.894 51.1555C147.107 50.4981 150.142 49.5398 152.98 48.2988V68.9833Z",
    "M152.98 20.6844C150.142 19.4435 147.107 18.4851 143.894 17.8217C138.267 16.6667 130.76 16.0831 121.582 16.0831H31.3983C22.0728 16.0831 14.4859 16.6667 8.85861 17.8217C5.70711 18.4728 2.74605 19.4066 0 20.6107V0.0675765C2.74605 1.2778 5.70711 2.20544 8.85247 2.85663C14.535 4.02999 21.9131 4.59517 31.3922 4.59517H121.582C130.913 4.59517 138.205 4.02385 143.888 2.85663C147.101 2.1993 150.136 1.24094 152.974 0V20.6844H152.98Z",
]);

/** Header slots, then footer-contact slots, then the product filter button */
export const ICON_SLOTS = ["search", "account", "cart", "menu", "language", "phone", "whatsapp", "email", "address", "hours", "filter"] as const;
export type IconSlot = (typeof ICON_SLOTS)[number];

export const ICON_LIBRARY: Record<IconSlot, Record<string, IconComponent | null>> = {
  search: {
    "search-line": as(Search),
    "search-bold": bold(Search),
    "search-solid": as(FaSearch),
    "search-thin": thin(Search),
  },
  account: {
    "user-solid": as(FaUser),
    "user-line": as(User),
    "user-round-line": as(UserRound),
    "user-regular": as(FaRegUser),
    "user-circle-solid": as(FaUserCircle),
    "user-circle-line": as(CircleUserRound),
    "user-circle-regular": as(FaRegUserCircle),
  },
  cart: {
    "cart-solid": as(FaShoppingCart),
    "cart-line": as(ShoppingCart),
    "bag-solid": as(FaShoppingBag),
    "bag-line": as(ShoppingBag),
    "handbag-line": as(Handbag),
    "basket-solid": as(FaShoppingBasket),
    "basket-line": as(ShoppingBasket),
    "masi-bag": MASI_BAG,
  },
  /** The ☰ button on phones */
  menu: {
    "menu-line": as(Menu),
    "menu-solid": as(FaBars),
    "menu-wide": as(AlignJustify),
    "menu-two": as(Equal),
    "menu-grid": as(LayoutGrid),
    "masi-menu": MASI_MENU,
  },
  /** "text" = the other language's name ("English" / "العربية") instead of an icon */
  language: {
    text: null,
    "globe-line": as(Globe),
    "globe-solid": as(FaGlobe),
    "languages-line": as(Languages),
  },
  phone: {
    "phone-line": as(Phone),
    "phone-solid": as(FaPhoneAlt),
    "phone-call-line": as(PhoneCall),
    "mobile-line": as(Smartphone),
    "headset-line": as(Headset),
  },
  whatsapp: {
    "whatsapp-solid": as(FaWhatsapp),
    "chat-line": as(MessageCircle),
  },
  email: {
    "mail-line": as(Mail),
    "mail-solid": as(FaEnvelope),
    "mail-regular": as(FaRegEnvelope),
    "at-line": as(AtSign),
    "send-line": as(Send),
  },
  address: {
    "pin-line": as(MapPin),
    "pin-solid": as(FaMapMarkerAlt),
    "navigation-line": as(Navigation),
    "map-line": as(MapIcon),
  },
  hours: {
    "clock-line": as(Clock),
    "clock-solid": as(FaClock),
    "clock-regular": as(FaRegClock),
    "timer-line": as(Timer),
  },
  /** The "Filter" button above the products (dashboard → Product filter → Button icon) */
  filter: {
    "sliders-line": as(SlidersHorizontal),
    "sliders-vertical-line": as(SlidersVertical),
    "sliders-thin": as(BsSliders),
    "sliders-solid": as(FaSlidersH),
    "settings-line": as(Settings2),
    "funnel-line": as(Funnel),
    "funnel-plus-line": as(FunnelPlus),
    "funnel-solid": as(FaFilter),
    "list-filter-line": as(ListFilter),
    "filter-left": as(BsFilterLeft),
  },
};

export type IconChoice = Record<IconSlot, string>;

/** Ready-made sets ("icon themes"). The first one is the website's original look. */
export const ICON_THEMES: Record<"solid" | "line" | "soft", IconChoice> = {
  solid: {
    search: "search-solid",
    account: "user-solid",
    cart: "cart-solid",
    menu: "menu-line",
    language: "text",
    phone: "phone-solid",
    whatsapp: "whatsapp-solid",
    email: "mail-solid",
    address: "pin-solid",
    hours: "clock-solid",
    filter: "sliders-line",
  },
  line: {
    search: "search-line",
    account: "user-line",
    cart: "bag-line",
    menu: "menu-line",
    language: "globe-line",
    phone: "phone-line",
    whatsapp: "chat-line",
    email: "mail-line",
    address: "pin-line",
    hours: "clock-line",
    filter: "sliders-line",
  },
  soft: {
    search: "search-line",
    account: "user-circle-line",
    cart: "handbag-line",
    menu: "menu-two",
    language: "languages-line",
    phone: "headset-line",
    whatsapp: "whatsapp-solid",
    email: "at-line",
    address: "navigation-line",
    hours: "timer-line",
    filter: "settings-line",
  },
};

export const DEFAULT_ICONS: IconChoice = ICON_THEMES.solid;

/** true when `id` is an icon of this slot */
export const isIcon = (slot: IconSlot, id: unknown): id is string => typeof id === "string" && Object.prototype.hasOwnProperty.call(ICON_LIBRARY[slot], id);

/** The icon for a slot (unknown id → the slot's default). null only for the language slot's "text" */
export const iconFor = (slot: IconSlot, id: string): IconComponent | null => ICON_LIBRARY[slot][isIcon(slot, id) ? id : DEFAULT_ICONS[slot]];
