import type { StrapiApp } from '@strapi/strapi/admin';
import { ChartBubble, Bell, WarningCircle, CheckCircle, Rocket, Eye, Earth, Layout } from '@strapi/icons';
import Logo from './extensions/logo.png';
import HistoryPanel from './woa/panels/History';

const T = (id: string, defaultMessage: string) => ({ id: `woa.${id}`, defaultMessage });

// Light theme by default. Strapi reads STRAPI_THEME when the admin store is created (after this module loads)
// and falls back to the system setting; a theme picked in Profile is saved there and still wins.
try { if (!localStorage.getItem('STRAPI_THEME')) localStorage.setItem('STRAPI_THEME', 'light'); } catch {}

export default {
  config: {
    // interface languages an editor can pick in Profile settings
    locales: ['ru', 'fr', 'es'],
    auth: { logo: Logo },
    menu: { logo: Logo },
    head: { favicon: Logo },
    tutorials: false,
    notifications: { releases: false },
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'WOA Admin',
        'app.components.LeftMenu.navbrand.workplace': 'World Olympians Association',
        'Auth.form.welcome.title': 'WOA Admin',
        'Auth.form.welcome.subtitle': 'Log in to manage the content of the WOA website',
        'HomePage.head.title': 'WOA Admin',
        'HomePage.header.subtitle': 'Content of the WOA website in English, French and Spanish',
      },
      ru: {
        'app.components.LeftMenu.navbrand.title': 'WOA Admin',
        'app.components.LeftMenu.navbrand.workplace': 'Всемирная ассоциация олимпийцев',
        'Auth.form.welcome.title': 'WOA Admin',
        'Auth.form.welcome.subtitle': 'Вход в управление сайтом WOA',
        'HomePage.head.title': 'WOA Admin',
        'HomePage.header.subtitle': 'Сайт WOA на английском, французском и испанском',
        'woa.site': 'Контент сайта', 'woa.attention': 'Требует внимания', 'woa.review': 'Ждёт проверки', 'woa.notifications': 'Уведомления',
        'woa.publishing': 'Публикация и копии', 'woa.visitors': 'Посетители', 'woa.translations': 'Переводы', 'woa.analytics': 'Аналитика', 'woa.open': 'Открыть',
      },
    },
    theme: {
      light: {
        colors: {
          primary100: '#f7f5ef', primary200: '#e9e3d3', primary500: '#8c7c55', primary600: '#262626', primary700: '#000000',
          buttonPrimary500: '#3d3d3d', buttonPrimary600: '#262626',
        },
      },
      dark: {
        colors: {
          primary100: '#2a271f', primary200: '#4a4330', primary500: '#a89a72', primary600: '#c9bc97', primary700: '#e0d6bb',
          buttonPrimary500: '#8c7c55', buttonPrimary600: '#7a6b45',
        },
      },
    },
  },
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/woa-analytics',
      icon: ChartBubble,
      intlLabel: T('analytics', 'Analytics'),
      permissions: [],
      position: 4,
      Component: () => import('./woa/pages/Analytics'),
    });
    app.widgets.register([
      { id: 'woa-site', icon: Layout, title: T('site', 'Site content'), component: async () => (await import('./woa/widgets/SiteContent')).default },
      { id: 'woa-attention', icon: WarningCircle, title: T('attention', 'Needs attention'), component: async () => (await import('./woa/widgets/Attention')).default },
      { id: 'woa-review', icon: CheckCircle, title: T('review', 'Awaiting review'), component: async () => (await import('./woa/widgets/Review')).default },
      { id: 'woa-notifications', icon: Bell, title: T('notifications', 'Notifications'), component: async () => (await import('./woa/widgets/Notifications')).default },
      { id: 'woa-publishing', icon: Rocket, title: T('publishing', 'Publishing and backups'), component: async () => (await import('./woa/widgets/Publishing')).default },
      { id: 'woa-visitors', icon: Eye, title: T('visitors', 'Visitors'), link: { label: T('open', 'Open analytics'), href: '/woa-analytics' }, component: async () => (await import('./woa/widgets/Visitors')).default },
      { id: 'woa-translations', icon: Earth, title: T('translations', 'Translations'), component: async () => (await import('./woa/widgets/Translations')).default },
    ]);
  },
  bootstrap(app: StrapiApp) {
    // "History" panel next to every entry: earlier versions with a restore button
    (app.getPlugin('content-manager') as any).apis.addEditViewSidePanel([HistoryPanel]);
  },
};
