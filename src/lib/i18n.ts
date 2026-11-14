// Languages: English at /, French at /fr/, Spanish at /es/ (as on olympians.org, where the same pages exist in all three).
// Menu labels are copied from the original site in each language; the remaining words are service words (search, close…).
export type Lang = 'en' | 'fr' | 'es';
export const ALL_LANGS: Lang[] = ['en', 'fr', 'es'];
// languages that are built and shown in the switcher (French and Spanish data: scripts/crawl-lang*.mjs + LANG_SITE=fr|es extract + xlang)
export const LANGS: Lang[] = ['en', 'fr', 'es'];
export const LANG_NAME: Record<Lang, string> = { en: 'English', fr: 'Français', es: 'Español' };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const langOf = (pathname: string): Lang => {
  const p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  const m = p.match(/^\/(fr|es)(\/|$)/);
  return (m ? m[1] : 'en') as Lang;
};
// strip the language prefix: "/fr/woa/about/" -> "/woa/about/"
export const stripLang = (p: string) => p.replace(/^\/(fr|es)(?=\/)/, '');
// add the language prefix to a site path ("/woa/about/" -> "/fr/woa/about/"); external links stay as they are
export const L = (href: string, lang: Lang) => (lang === 'en' || !href.startsWith('/') || /^\/(fr|es)\//.test(href) ? href : `/${lang}${href}`);

// Menu labels on olympians.org, by English path
const NAV_LABEL: Record<Lang, Record<string, string>> = {
  en: {},
  fr: {
    '/olympians/': 'Olympiens', '/noas/': 'ANOs', '/news/': 'Nouvelles',
    '/woa/about/': 'Présentation', '/woa/olympism/': 'Olympisme', '/woa/leadership/': 'Leadership', '/woa/contact-us/': 'Contactez-Nous',
    '/noas/noa-guide/': 'Guide pour les ANO', '/noas/noa-directory/': 'Annuaire des ANO', '/noas/grants/': 'Subventions', '/best-practices/': 'Meilleures Pratiques',
  },
  es: {
    '/olympians/': 'Atletas Olímpicos', '/noas/': 'NOAs', '/news/': 'Noticias',
    '/woa/about/': 'Sobre Nosotros', '/woa/olympism/': 'Olimpismo', '/woa/leadership/': 'Liderazgo', '/woa/contact-us/': 'Contáctenos',
    '/noas/noa-guide/': 'Guía de la NOA', '/noas/noa-directory/': 'Directorio ANAO', '/noas/grants/': 'Grants', '/best-practices/': 'Mejores Prácticas',
  },
};
export const navLabel = (href: string, en: string, lang: Lang) => NAV_LABEL[lang][href] ?? en;

const UI = {
  en: {
    search: 'Search', menu: 'Menu', close: 'Close', home: 'Home', skip: 'Skip to content', noResults: 'No results', all: 'All',
    prev: 'Previous', next: 'Next', share: 'Share', copyLink: 'Copy link', scroll: 'Scroll', language: 'Language',
    registerOly: 'Register for OLY', readMore: 'Read More', privacy: 'WOA Privacy Policy',
    copyright: '© 2026 World Olympians Association. All rights reserved', org: 'World Olympians Association',
    notFound: 'Page not found', breadcrumb: 'Breadcrumb', main: 'Main', footer: 'Footer', more: 'More', letters: 'Letters', year: 'Year', pages: 'Pages', onPage: 'On this page', section: 'Section',
  },
  fr: {
    search: 'Rechercher', menu: 'Menu', close: 'Fermer', home: 'Accueil', skip: 'Aller au contenu', noResults: 'Aucun résultat', all: 'Tout',
    prev: 'Précédent', next: 'Suivant', share: 'Partager', copyLink: 'Copier le lien', scroll: 'Défiler', language: 'Langue',
    registerOly: 'Inscrivez-vous à OLY', readMore: 'Lire la suite', privacy: 'Politique de Confidentialité de la WOA',
    copyright: '© 2026 Association Mondiale des Olympiens', org: 'Association Mondiale des Olympiens',
    notFound: 'Page introuvable', breadcrumb: "Fil d'Ariane", main: 'Principal', footer: 'Pied de page', more: 'Plus', letters: 'Lettres', year: 'Année', pages: 'Pages', onPage: 'Sur cette page', section: 'Rubrique',
  },
  es: {
    search: 'Buscar', menu: 'Menú', close: 'Cerrar', home: 'Inicio', skip: 'Ir al contenido', noResults: 'Sin resultados', all: 'Todo',
    prev: 'Anterior', next: 'Siguiente', share: 'Compartir', copyLink: 'Copiar enlace', scroll: 'Desplazar', language: 'Idioma',
    registerOly: 'Regístrese para OLY aquí', readMore: 'Lee mas', privacy: 'Política de Privacidad de la WOA',
    copyright: '© 2026 Asociación Mundial De Atletas Olímpicos', org: 'Asociación Mundial De Atletas Olímpicos',
    notFound: 'Página no encontrada', breadcrumb: 'Ruta', main: 'Principal', footer: 'Pie de página', more: 'Más', letters: 'Letras', year: 'Año', pages: 'Páginas', onPage: 'En esta página', section: 'Sección',
  },
} as const;
export type UIKey = keyof typeof UI.en;
export const t = (lang: Lang) => UI[lang];

const LOCALE: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
export const fmtDateL = (iso: string | null | undefined, lang: Lang) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
};
export const fmtNum = (n: number, lang: Lang) => n.toLocaleString(LOCALE[lang]);

// getStaticPaths helpers for pages under src/pages/[...lang]/
export const LANG_PARAMS = LANGS.map(l => ({ params: { lang: l === 'en' ? undefined : l }, props: { lang: l } }));
export const langParam = (l: Lang) => (l === 'en' ? undefined : l);
export const pageLang = (params: Record<string, string | undefined>): Lang => (params.lang === 'fr' || params.lang === 'es' ? params.lang : 'en');
