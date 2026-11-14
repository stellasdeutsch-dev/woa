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
| Home | 4:819 | 27:3823 | 27:4942 | 27:4384 |
| About | 4:820 | 27:1477 | 27:115 | 27:494 |
| History | 4:821 | 27:3290 | 27:3648 | 27:3457 |
| Olympism | 4:822 | 27:11389 | 27:12360 | 27:11854 |
| Leadership | 4:823 | 27:5491 | 27:5879 | 27:5681 |
| Contact Us | 4:824 | 27:365 | 27:1746 | 27:2 |
| OLY | 4:825 | 27:9661 | 27:10041 | 27:9854 |
| Olympian.org Email | 4:826 | 27:10223 | 27:10662 | 27:10430 |
| Health | 4:827 | 27:2639 | 27:3084 | 27:2853 |
| Olympians for Life | 4:828 | 27:10849 | 27:11205 | 27:11016 |
| WOF | 4:829 | 27:15151 | 27:14859 | 27:14629 |
| NOA Guide | 4:830 | 27:6990 | 27:7570 | 27:7256 |
| NOA Directory | 4:831 | 27:6051 | 27:6679 | 27:6370 |
| Grants | 4:832 | 27:1861 | 27:2389 | 27:2119 |
| News | 4:833 | 27:8537 | 27:9028 | 27:8791 |
| News article | 4:834 | 27:7843 | 27:8325 | 27:8064 |
| OLY House | 4:835 | 27:9273 | 27:9535 | 27:9411 |
| Best Practices | 4:836 | 27:999 | 27:763 | 27:1246 |
| SkillsBuild | 4:837 | 27:13087 | 27:13484 | 27:13275 |

| WOF Attendees | 14:1621 | 27:13674 | 27:14311 | 27:13995 |
| Page not found | 14:1622 | 27:12812 | 27:12997 | 27:12913 |

Прототип: 1416 переходов по клику (меню, подвал, крошки, кнопки), старт: Home 1440 / 834 / 390. Кадры обновлены 14.11.2026 днём (визуальные блоки текстовых страниц, иконки с золотым кругом).

Старые версии кадров лежат в «Архив»: секции «Screens v1 — 14.11.2026» и «Screens v2 — 14.11.2026» (29:2834).

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
| Olympism | 20:20 | 27:11389 | 27:12360 | 27:11854 |
| NOA Guide — Member Engagement | 20:26 | ? | ? | ? |
| OLY House 2020 — A message from the President | 20:32 | ? | ? | ? |

Код: `src/pages/woa/olympism/`, `src/pages/noas/noa-guide/member-engagement/`, `src/pages/oly-house/a-message-from-president-joel-bouzou/2020/`, блоки `.vb-*` в `src/styles/global.css`.

## Иконки: стиль сайта
Смысловые иконки: линия 1.75 плюс золотой круг (r 7.5, центр 15/15, #b6a67f, 55%) под рисунком. Служебные (стрелки, закрыть, меню, поиск, контакты, соцсети, цитата) без круга. Design System → Icons (8:100): у 29 старых добавлен слой Accent, добавлено 25 новых (quote, tip, design, channel, message, frequency, social, newsletter, website, target, heart, chat, gift, pen, clock, bell, equal, leaf, humanism, alliance, columns, torch, snow, letter, email).
