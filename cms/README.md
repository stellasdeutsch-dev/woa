# WOA Admin (Strapi 5)

Панель управления сайтом WOA. Весь контент сайта (страницы, новости, Best Practices, каталог NOA, руководство, меню, тексты интерфейса) на трёх языках: EN, FR и ES. Сайт остаётся статичным на GitHub Pages: при сборке он забирает опубликованное из Strapi.

## Что внутри

| Раздел | Что там |
|---|---|
| 01 · Pages | 70 страниц (About, Olympism, Grants, главы NOA Guide, OLY House…) |
| 02 · News | 685 новостей EN, 658 FR, 656 ES. Переводы связаны с английской новостью |
| 03 · Best Practices | 91 / 84 / 84 |
| 04 · NOAs | 114 ассоциаций: контакты и число олимпийцев с OLY. Страны по-французски и по-испански, как на оригинале |
| 05 · Executive Committee, 06 · Honorary Members | руководство с биографиями |
| 07 · Redirects | старые адреса |
| 08 · Menu, 09 · Interface texts, 10 · Site settings | меню, служебные слова, почта и соцсети |
| Media Library | 782 файла в папках Backgrounds, News, Best Practices, Leadership, Documents |

Главная панель (виджеты WOA):
- **Site content**: сколько записей опубликовано на каждом языке.
- **Needs attention**: страницы без картинки, записи без перевода, неопубликованные черновики, NOA без почты.
- **Awaiting review**: записи со статусом проверки `needs_review` или `changes_requested`.
- **Notifications**: импорт, резервные копии, пересборки сайта, запросы на проверку.
- **Publishing and backups**: последние сборки сайта на GitHub, кнопки «Rebuild site» и «Back up now».
- **Visitors**: посещения за 14 дней.
- **Translations**: доля английских записей, у которых есть FR и ES.

Аналитика (пункт меню Analytics):
- посетители, просмотры, сессии, время на сайте, отказы, со сравнением с прошлым периодом;
- график по дням, популярные страницы, источники, языки, устройства, скачивания;
- выгрузка CSV и настройки (сбор вкл./выкл., срок хранения, исключённые адреса).

Без cookies и без IP-адресов. Посетитель с включённым «Do Not Track» или «Global Privacy Control» не учитывается.

Кроме того:
- «Open preview» в карточке записи показывает эту страницу на сайте;
- публикация записи сама пересобирает сайт примерно через 2 минуты (нужен `GITHUB_TOKEN`);
- каждую ночь сохраняется резервная копия базы (SQLite), хранятся последние 14.

Код: `src/api/*` (типы контента), `src/plugins/woa` (сервер виджетов, аналитики, уведомлений, копий и пересборки), `src/admin` (логотип, цвета, виджеты, страница аналитики), `src/index.ts` (языки, права, порядок полей).

## Запуск у себя

```bash
cd cms
npm install
npm run develop          # http://localhost:1337/admin
```

При первом запуске создаётся администратор из `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD` в `cms/.env` (файл не попадает в git).

Загрузить контент сайта в пустую базу (Strapi должен быть остановлен):

```bash
npm run import            # добавить недостающее
npm run import -- --reset # стереть контент сайта и загрузить заново
```

Проверить, что CMS и файлы сайта совпадают, и выгрузить контент в сайт:

```bash
cd ..
CMS_URL=http://localhost:1337 node scripts/cms-pull.mjs --check
CMS_URL=http://localhost:1337 node scripts/cms-pull.mjs
```

## Выложить в Strapi Cloud

1. На cloud.strapi.io нажмите «Create project» и выберите репозиторий `stellasdeutsch-dev/woa`, ветку `main`.
2. **Base directory: `cms`.** Тариф выбираете сами: бесплатного в Strapi Cloud нет, Starter самый дешёвый.
3. В Variables проекта добавьте:
   - `SITE_URL=https://stellasdeutsch-dev.github.io/woa/`
   - `GITHUB_REPO=stellasdeutsch-dev/woa`
   - `STRAPI_TELEMETRY_DISABLED=true`
   - по желанию `GITHUB_TOKEN` (см. ниже).
4. После первого деплоя откройте адрес проекта и создайте администратора.
5. Перенесите контент и файлы из локальной базы. В облачной панели: Settings → Transfer Tokens → «Create new transfer token», тип Push. Затем у себя:

```bash
cd cms
npx strapi transfer --to https://<проект>.strapiapp.com/admin --to-token <transfer token>
```

6. Подключите сайт к CMS. В GitHub, в репозитории: Settings → Secrets and variables → Actions → Variables, добавьте `CMS_URL=https://<проект>.strapiapp.com`. Со следующей сборки сайт берёт контент из CMS и шлёт в неё посещения.
7. Кнопка «Rebuild site» и автоматическая пересборка. Создайте на GitHub fine-grained token на репозиторий `woa` с правом Contents: Read and write и впишите его в `GITHUB_TOKEN` в Variables проекта Strapi.

На своём сервере всё то же самое: `npm run build && npm run start`. Для PostgreSQL задайте `DATABASE_CLIENT=postgres` и `DATABASE_URL`. Резервные копии SQLite делает сама CMS; для PostgreSQL их делает хостинг.

## Как редактору

- Языки переключаются справа вверху в карточке записи. Перевод создаётся там же: «Create locale» / пустая форма на нужном языке.
- Текст хранится в HTML, как на исходном сайте. Новый текст можно писать в Markdown: при выгрузке он станет HTML.
- Картинку меняют загрузкой в поле Picture или Hero image. Поле с путём («Original … file») трогать не нужно: оно используется, только если картинки нет.
- Чтобы отправить запись на проверку, поставьте Review status = `needs_review`. Запись появится в виджете «Awaiting review» и в уведомлениях.
