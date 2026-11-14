# Figma: журнал узлов

Файл: https://www.figma.com/design/kx3ZwhUEKX24AXTrU0qMH1 (команда shyngysnar's team)

## Страницы
| Страница | id |
|---|---|
| Screens | 0:1 |
| Визуал для текстовых страниц | 17:2 |
| User Flow | 3:2 |
| Wireframes | 3:3 |
| Design System | 3:4 |
| Сайт как есть | 3:5 |
| Архив | 3:6 |

## Screens: секции и кадры (1440 / 834 / 390)
| Страница сайта | секция | 1440 | 834 | 390 |
|---|---|---|---|---|
| Home | 4:819 | 33:3845 | 33:4871 | 33:4359 |
| About | 4:820 | 33:515 | 33:786 | 33:2 |
| History | 4:821 | 33:3308 | 33:3668 | 33:3477 |
| Olympism | 4:822 | 33:17188 | 33:18167 | 33:17656 |
| Leadership | 4:823 | 33:5377 | 33:5765 | 33:5567 |
| Contact Us | 4:824 | 33:273 | 33:1753 | 33:402 |
| OLY | 4:825 | 33:15434 | 33:15814 | 33:15627 |
| Olympian.org Email | 4:826 | 33:15997 | 33:16441 | 33:16207 |
| Health | 4:827 | 33:2650 | 33:3099 | 33:2866 |
| Olympians for Life | 4:828 | 33:16633 | 33:16994 | 33:16804 |
| WOF | 4:829 | 33:20694 | 33:20964 | 33:20464 |
| NOA Guide | 4:830 | 33:12761 | 33:13346 | 33:13032 |
| NOA Directory | 4:831 | 33:5937 | 33:10389 | 33:8040 |
| Grants | 4:832 | 33:1868 | 33:2400 | 33:2130 |
| News | 4:833 | 33:14328 | 33:14821 | 33:14583 |
| News article | 4:834 | 33:13623 | 33:14108 | 33:13847 |
| OLY House | 4:835 | 33:15066 | 33:15314 | 33:15197 |
| Best Practices | 4:836 | 33:1506 | 33:1270 | 33:1039 |
| SkillsBuild | 4:837 | 33:18897 | 33:19309 | 33:19093 |

| WOF Attendees | 14:1621 | 33:19509 | 33:20146 | 33:19830 |
| Page not found | 14:1622 | 33:18622 | 33:18807 | 33:18723 |

Прототип: 1415 переходов по клику (меню, подвал, крошки, кнопки), старт: Home 1440 / 834 / 390. Кадры обновлены 14.11.2026 днём дважды: визуальные блоки текстовых страниц и иконки, затем исправления по аудиту (крупнее шрифт, контраст, каталог NOA, главная).

Старые версии кадров лежат в «Архив»: секции «Screens v1», «Screens v2» (29:2834) и «Screens v3» (33:23888), все от 14.11.2026.

## Как обновлять
1. `npm run build && npx astro preview`
2. `node scripts/figma/export.mjs http://localhost:4321/woa <out> "Home=/" ...` — SVG на каждую ширину.
3. `upload_assets` → POST SVG → `scripts/figma/fix-text.js` с id новых кадров → `scripts/figma/swap-screens.js` (ставит кадр на место старого, переносит переходы прототипа по совпадению текста, старый кадр уходит в «Архив»).
Кадры собраны из SVG: у слоёв привязки SCALE, менять размер кадра только через `resizeWithoutConstraints`.

## User Flow (3:2)
- Audiences — секция 11:2
- User flows — секция 11:148

## Wireframes (3:3)
Серые копии всех кадров Screens в той же раскладке (секции с теми же названиями). Фото заменены серыми плашками «Image placeholder».

## Design System (3:4)
- Коллекция переменных «WOA tokens» (VariableCollectionId:7:2): c-black, c-ink, c-gold, c-white, c-grey-50…700, c-error, c-overlay, sp-1…sp-10, gutter, container, header-h, radius, radius-lg — имена и значения как в `src/styles/global.css`.
- Текстовые стили: Display, H1–H4, Lead, Body, Body / Bold, Small, Small / SemiBold, Caption, Stat number, Nav, Button (Montserrat, размеры замерены при 1440).
- Эффект «Card hover».
- Секции: Colors 8:2, Typography 8:56, Icons 8:100 (52 компонента «Icon / …»), Components 9:2.
- Компоненты: Button 9:57 (Primary/Outline/Gold × Default/Hover), Pill / Tab 9:64, Search field 9:65, Form field 9:79, Document row 9:94, Topic card 9:111, News card 9:132, Table row 9:150 (Desktop/Phone), Stat 9:151.

## Сайт как есть (3:5)
Копия olympians.org (7 страниц × 3 ширины): Home 12:5030, About 12:5031, OLY 12:5032, NOA Directory 12:5033, Grants 12:5034, News 12:5035, News article 12:5036. Шрифт Verlag заменён на Jost (Verlag не входит в Figma); цветные тонировки плиток главной не перенесены.

## Архив (3:6)
«Screens v1 — 14.11.2026» и «Сайт как есть v1 — 14.11.2026» — первые версии, заменённые исправленными.

## Визуал для текстовых страниц (17:2), 14.11.2026
Образцы с других сайтов и три текстовые страницы до и после. Тексты дословные, поменялась подача.
| Секция | id | Было | Стало 1440 | Стало 390 |
|---|---|---|---|---|
| Примеры с других сайтов (IOC, Atlassian, GOV.UK, Apple, Stripe) | 20:2 | | | |
| Olympism | 20:20 | 33:17188 | 33:18167 | 33:17656 |
| NOA Guide — Member Engagement | 20:26 | ? | ? | ? |
| OLY House 2020 — A message from the President | 20:32 | ? | ? | ? |

Код: `src/pages/woa/olympism/`, `src/pages/noas/noa-guide/member-engagement/`, `src/pages/oly-house/a-message-from-president-joel-bouzou/2020/`, блоки `.vb-*` в `src/styles/global.css`.

## Иконки: стиль сайта
Смысловые иконки: линия 1.75 плюс золотой круг (r 7.5, центр 15/15, #b6a67f, 55%) под рисунком. Служебные (стрелки, закрыть, меню, поиск, контакты, соцсети, цитата) без круга. Design System → Icons (8:100): у 29 старых добавлен слой Accent, добавлено 25 новых (quote, tip, design, channel, message, frequency, social, newsletter, website, target, heart, chat, gift, pen, clock, bell, equal, leaf, humanism, alliance, columns, torch, snow, letter, email).
