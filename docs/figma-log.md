# Figma: журнал узлов

Файл: https://www.figma.com/design/kx3ZwhUEKX24AXTrU0qMH1 (команда shyngysnar's team)

## Страницы
| Страница | id |
|---|---|
| Screens | 0:1 |
| User Flow | 3:2 |
| Wireframes | 3:3 |
| Design System | 3:4 |
| Сайт как есть | 3:5 |
| Архив | 3:6 |

## Screens: секции и кадры (1440 / 834 / 390)
| Страница сайта | секция | 1440 | 834 | 390 |
|---|---|---|---|---|
| Home | 4:819 | 3:1612 | 3:265 | 3:1062 |
| About | 4:820 | 3:805 | 3:2164 | 3:7 |
| History | 4:821 | 3:2402 | 3:2559 | 3:2724 |
| Olympism | 4:822 | 3:2906 | 3:3141 | 3:3358 |
| Leadership | 4:823 | 3:3667 | 3:3852 | 3:4017 |
| Contact Us | 4:824 | 3:4210 | 3:4337 | 3:4450 |
| OLY | 4:825 | 3:4562 | 3:4751 | 3:4929 |
| Olympian.org Email | 4:826 | 3:5113 | 3:5354 | 3:5542 |
| Health | 4:827 | 3:5783 | 3:5994 | 3:6197 |
| Olympians for Life | 4:828 | 3:6426 | 3:6592 | 3:6775 |
| WOF | 4:829 | 3:6964 | 3:7228 | 3:7514 |
| NOA Guide | 4:830 | 3:7739 | 3:8004 | 3:8251 |
| NOA Directory | 4:831 | 3:8546 | 3:8864 | 3:9174 |
| Grants | 4:832 | 3:9483 | 3:9736 | 3:9981 |
| News | 4:833 | 3:10247 | 3:10500 | 3:10744 |
| News article | 4:834 | 3:10981 | 3:11201 | 3:11412 |
| OLY House | 4:835 | 3:11673 | 3:11807 | 3:11929 |
| Best Practices | 4:836 | 3:12050 | 3:12295 | 3:12529 |
| SkillsBuild | 4:837 | 3:12759 | 3:12917 | 3:13066 |

## Как обновлять
1. `npm run build && npx astro preview`
2. `node scripts/figma/export.mjs http://localhost:4321/woa <out> "Home=/" ...` — SVG на каждую ширину.
3. `upload_assets` → POST SVG → `scripts/figma/fix-text.js` с id новых кадров → заменить старый кадр на том же месте секции.
Кадры собраны из SVG: у слоёв привязки SCALE, менять размер кадра только через `resizeWithoutConstraints`.
