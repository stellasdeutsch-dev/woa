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
| Home | 4:819 | 5:810 | 5:1362 | 5:2 |
| About | 4:820 | 5:2140 | 5:1902 | 5:552 |
| History | 4:821 | 5:2397 | 5:2554 | 5:2719 |
| Olympism | 4:822 | 5:2901 | 5:3136 | 5:3353 |
| Leadership | 4:823 | 5:3662 | 5:3851 | 5:4022 |
| Contact Us | 4:824 | 5:4220 | 5:4347 | 5:4460 |
| OLY | 4:825 | 5:4572 | 5:4761 | 5:4939 |
| Olympian.org Email | 4:826 | 5:5123 | 5:5328 | 5:5513 |
| Health | 4:827 | 5:5744 | 5:5955 | 5:6158 |
| Olympians for Life | 4:828 | 5:6387 | 5:6553 | 5:6736 |
| WOF | 4:829 | 5:6925 | 5:7189 | 5:7475 |
| NOA Guide | 4:830 | 5:7700 | 5:7965 | 5:8212 |
| NOA Directory | 4:831 | 5:8507 | 5:8825 | 5:9135 |
| Grants | 4:832 | 5:9444 | 5:9697 | 5:9942 |
| News | 4:833 | 5:10208 | 5:10461 | 5:10705 |
| News article | 4:834 | 5:10942 | 5:11162 | 5:11373 |
| OLY House | 4:835 | 5:11634 | 5:11768 | 5:11890 |
| Best Practices | 4:836 | 5:12011 | 5:12256 | 5:12490 |
| SkillsBuild | 4:837 | 5:12720 | 5:12878 | 5:13027 |

| WOF Attendees | 14:1621 | 14:275 | 14:586 | 14:894 |
| Page not found | 14:1622 | 14:2 | 14:186 | 14:102 |

Прототип: 1470 переходов по клику (меню, подвал, крошки, кнопки), старт: Home 1440 / 834 / 390.

Старые версии кадров (v1) лежат в «Архив», секция «Screens v1 — 14.11.2026».

## Как обновлять
1. `npm run build && npx astro preview`
2. `node scripts/figma/export.mjs http://localhost:4321/woa <out> "Home=/" ...` — SVG на каждую ширину.
3. `upload_assets` → POST SVG → `scripts/figma/fix-text.js` с id новых кадров → заменить старый кадр на том же месте секции.
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
| Olympism | 20:20 | 18:2687 | 18:1914 | 18:1145 |
| NOA Guide — Member Engagement | 20:26 | 18:2689 | 24:2 | 24:534 |
| OLY House 2020 — A message from the President | 20:32 | 18:2690 | 18:1653 | 18:2379 |

Код: `src/pages/woa/olympism/`, `src/pages/noas/noa-guide/member-engagement/`, `src/pages/oly-house/a-message-from-president-joel-bouzou/2020/`, блоки `.vb-*` в `src/styles/global.css`.

## Иконки: стиль сайта
Смысловые иконки: линия 1.75 плюс золотой круг (r 7.5, центр 15/15, #b6a67f, 55%) под рисунком. Служебные (стрелки, закрыть, меню, поиск, контакты, соцсети, цитата) без круга. Design System → Icons (8:100): у 29 старых добавлен слой Accent, добавлено 25 новых (quote, tip, design, channel, message, frequency, social, newsletter, website, target, heart, chat, gift, pen, clock, bell, equal, leaf, humanism, alliance, columns, torch, snow, letter, email).
