# Olympic-family websites: UX benchmark for the olympians.org redesign

Research date: 14 November 2026. Desktop checks at 1440 px.

## Method and coverage

Sites were read with WebFetch. When olympics.com timed out on WebFetch (three times), the page was opened in a browser pane and read from the DOM and screenshots. On the IOC page optional cookies were rejected. This document records only what was seen on the pages listed below. If a section or item could not be checked, it says so.

| Site | URL checked | Result |
|---|---|---|
| IOC | olympics.com/ioc | WebFetch timed out. Read in a browser: home page, mega-menu, language menu |
| Athlete365 | olympics.com/athlete365/, /auth/welcome | WebFetch timed out. Read in a browser |
| ANOC | anocolympic.org | Home page read. `/nocs/directory/` returned 404 |
| European Olympic Committees (EOC) | eurolympic.org, /enocs/ | Read |
| USOPA | usopa.org | **Domain does not resolve (DNS error).** teamusa.com/usopa returned 404. USOPA content was read on usopc.org/lifeaftersport |
| Olympians Canada | olympians.ca, www.olympians.ca | **Domain does not resolve.** The successor, OLY Canada (oly.olympic.ca), was read |
| Team GB | teamgb.com, /athletes | Home page body did not render for WebFetch (only nav and footer). /athletes was read in a browser |
| NZ Olympic Committee | olympic.org.nz, /athletes/ | Read. Some cards loaded as placeholders |
| Olympic Refuge Foundation (extra) | olympics.com/en/olympic-refuge-foundation/ | Read in a browser, including the programmes map and list |
| olympians.org (baseline) | /, /olympians/oly/, /noas/noa-directory/ | Read for comparison |

---

## 1. Site-by-site findings

### 1.1 IOC (olympics.com/ioc)

- **Audiences.** Media, the Olympic Movement (NOCs, IFs, candidate hosts), the public and job seekers.
- **Top bar (cross-site links).** Olympics · Olympic Museum · Athlete365 · Olympic Studies Centre · Olympic Refuge Foundation · Dakar 2026 · LA28 · Shop · language selector "English".
- **Main navigation.** IOC · Olympic Games · Athletes · Olympic Movement · Beyond the Games · Media · News · Documents · FAQ · search icon.
- **Mega-menu.** Opens on hover. "Olympic Games" opens a panel with a "See all Olympic Games ›" link, then columns: Olympic Games (LA28, Alps 2030, Brisbane 2032, Utah 2034), Youth Olympic Games (Dakar 2026, Dolomiti Valtellina 2028), Olympic Esports Games, Becoming an Olympic Games host (Continuous Dialogue, Strategic Dialogue, Targeted Dialogue, Past host elections), Olympic Legacy, Volunteers, Ticketing and Hospitality.
- **Home page order.**
  1. Full-bleed hero slider (4 stories) with play/pause, dots and a "Next: …" teaser
  2. Latest news (12 cards, "All news" link)
  3. All about Dakar 2026 Youth Olympic Games (feature block)
  4. Featured ("Olympic Highlights – weekly updates" and others)
  5. Fit for the future (strategy feature)
  6. FAQ about the IOC Policy on the Protection of the Female Category
  7. Upcoming Games
  8. Olympic Review (magazine)
  9. IOC Social Media (YouTube, X, LinkedIn, WhatsApp, "All Olympic social media handles")
  10. Footer
- **News listing.** Each card shows an image, a topic tag chip (e.g. "Dakar 2026", "Samsung", "Olympic Refuge Foundation", "IOC News"), a headline and a date ("13 Nov 2026"). On screen the news row ran off the right edge like a slider.
- **Search.** Icon in the main nav.
- **Language.** Dropdown with English and Français.
- **Footer.** Events calendar, Publications, Olympic Charter, Documents, Press Center, FAQs, Jobs; family links (Olympics, Olympic Museum, Athlete365, Olympic Studies Centre, Olympic Refuge Foundation, Dakar 2026, LA28, Shop); Sign-up; Cookie Policy, Privacy Policy, Terms of Service, Contact us.
- **Notable components.** Hover mega-menu with a "See all" link; topic chips on news; a cross-site family bar; a policy FAQ given its own place on the home page.
- **Weak points and rule conflicts.** Hero and section headings are set in all caps in a condensed face. Section titles have a large outlined "ghost" copy of the title behind them (decorative duplication). News and Featured rows run as horizontal sliders. The cookie banner covers the lower part of the first screen.

### 1.2 Athlete365 (olympics.com/athlete365)

- **Audiences.** The welcome page describes Athlete365 as "the global community for Olympians, Paralympians, elite-level athletes and their entourage members".
- **Top bar.** Olympics · IOC · Olympic Museum · Olympic Studies Centre · Olympic Refuge Foundation · Shop · "English" selector (the other languages could not be confirmed).
- **Main navigation.** Home · For you · Games · Learning · Your network · About Athlete365 (dropdown) · Search · Notification center · My account.
- **Home page order.**
  1. Hero slider (6 stories). One slide is "Help shape the future of the Olympian community"
  2. Discover by topic: round icon chips (Dakar 2026, IOC AC, Career+, Business Accelerator, Safe Sport, Mental Health, LA28, Olympic Solidarity, AC Support, NOC AC Activity Grant) with arrows and "View all"
  3. Latest news (one large story plus a side list)
  4. Offers (e.g. "Claim your free mindfulness app subscription", "Showcase your creativity with the Olympian Artists Programme", "Access your Games-time photos")
  5. Dakar 2026 (rail)
  6. Mental health (rail)
  7. Trending
  8. Discover Athlete365 (Who we are, What we do)
  9. Footer
- **Membership and benefits.** A "Join the community" pop-over says "Sign in or register to unlock the full Athlete365 experience". The footer link "Become a member" leads to a one-screen welcome page with a single "Start" button. Benefits are shown as "Offers" cards, each with a category label and a one-line promise.
- **Grants and programmes.** Listed as topics (Business Accelerator, Career+, NOC AC Activity Grant) and found through topic browsing, not a separate grants page.
- **Footer.** Socials; About Athlete365 (Who we are, What we do, Become a member, IOC Athletes' Commission, Contact us); Games-time (Milano Cortina 2026, Dakar 2026, LA28); Explore (Discover by topic, Learning, For you); Mobile apps (Athlete365 app). The legal line is all caps: "COPYRIGHT © 2026 … PRIVACY POLICY · VIDEO AND IMAGE USAGE · TERMS OF SERVICE · COOKIE POLICY · IOC HOTLINE".
- **Notable components.** Topic-chip browsing, an "Offers" benefit rail, personalised "For you", a notification centre, account-gated content.
- **Weak points and rule conflicts.** All-caps section headings. Small coloured category labels sit above every card title. Topic icons sit in filled coloured circles. Every rail is a horizontal carousel with arrows. The Dakar 2026 band has a gradient art background. The welcome page explains nothing about what membership gives before asking you to "Start".

### 1.3 ANOC (anocolympic.org)

- **Audiences.** NOCs, the Olympic family, continental associations, partners and media.
- **Top-level navigation (with sub-items).**
  - About ANOC: Vision and Mission; Organization (Structure, Executive Council, Commissions and Working Groups); History; Constitution & Ethics
  - ANOC General Assembly
  - ANOC Awards: The ANOC Awards; Previous Editions
  - ANOC World Beach Games: The ANOC World Beach Games; Hosting the AWBG; AWBG Qatar 2019; Beach Sports News
  - News: ANOC News; Olympic Movement News; Newsletters
  - Digital Accelerator Program
  - Sustainability Accelerator Program
  - NOCs: Directory; NOC Highlights; Social Media Dashboard; Prevention Manipulation
  - Partners: Partners; Become a partner
  - Calendar: Meetings Calendar; Competitions Calendar
  - Documents & Multimedia: ANOC Digital Content HUB; Documents
  - ANOC.TV
  - Contacts: ANOC; Olympic Family; Continental Associations
- **Home page order.** Welcome → Latest News (Prev/Next slider) → Meetings Calendar (6 events) → Competitions Calendar (6 events) → General Assembly banner (Hong Kong, 7–10 Dec 2026) → Memories → NOC Highlights → ANOC News → Olympic News → ANOC.TV banner → Newsletter → Multimedia → Social Media → Partners (tiered: Partners, Gold, Bronze) → Footer.
- **Directory.** "Directory" sits under NOCs, but no entries or map appear on the home page, and `/nocs/directory/` returned 404.
- **News.** One featured item with date, headline and excerpt, then an "All … News" link. Date formats differ ("06 November 2026" and "November 06, 2026").
- **Programmes.** Digital Accelerator Program and Sustainability Accelerator Program are top-level items. No grant amounts or criteria appear on the home page.
- **Search and language.** No search. No language switcher.
- **Footer.** About ANOC; ANOC News; NOC's; Misc. (calendars, World Beach Games, Digital Accelerator, Digital Content HUB, Documents); Olympic Movement Contacts; Legal Notice, Privacy, Cookies; social icons.
- **Notable components.** Calendar lists with date badges; a tiered partner logo grid; a newsletter form that also asks for the organisation.
- **Weak points.** 13 top-level items. Labels differ between the two menus ("Program" vs "Programme", "&" vs "and"). No search. A "Loading..." placeholder shows in the Welcome area.

### 1.4 European Olympic Committees (eurolympic.org)

- **Audiences.** European NOCs, media, the sports public, partners and job seekers.
- **Top-level navigation.** Home · About EOC (Who we are; History; ENOCS; Organisation › Executive Committee, Commissions, Head Office, Job Opportunities) · News (News; Newsletter) · Calendar · Sport Events (Clean Sport; Prevention Manipulation; Eoc Sport Events › The European Games, EYOF, Games of the Small States of Europe, Facts & Figures) · Awards (Order of Merit; Laurels; Piotr Nurowski; Janez Kocijančič) · Multimedia (Photos; Videos) · Contacts · Documents · English / Français.
- **Home page order.** News slider (5) → Istanbul 2027 European Games block → Our Sports Events (3 image links) → Latest News (5 cards, "View more news") → EOC channel promo ("THE BEST OF EUROPEAN SPORT IS JUST A CLICK AWAY!") → EOC Social Media (embeds) → app promo ("YOUR FRONT ROW SEAT TO EUROPEAN SPORTS EXCELLENCE") → Featured Links (Clean Sport, Awards, ENOCS, Documents) → partner logo strips → Istanbul 2027 banners → Newsletter → Footer.
- **Directory (ENOCS page).** One alphabetical list of 50 NOCs (Albania to Ukraine). Each entry is a flag plus the country name and links to a country page (`/enocs/albania/`). There is a search element. No map, no regional grouping, no filters. Some slugs are out of date (`fyrom`, `turkey`).
- **News cards.** Thumbnail, date ("Nov 03, 2026"), H3 headline, excerpt and a category tag (EOC / Olympic Movement). One "View more news" link, with no pagination.
- **Search.** "Search..." field in the header.
- **Language.** English / Français.
- **Footer.** Short description of the organisation, the Rome address and phone, quick links, social links, legal links, cookie settings. The copyright reads 2024 while the news runs to 2026.
- **Weak points and rule conflicts.** Promo headings are written in capitals in the source text. Labels are inconsistent ("Sport Events" vs "Eoc Sport Events"). There is no hero statement of purpose: the mission appears only in the footer. Many links leave the site.

### 1.5 USOPA (US Olympians & Paralympians Association)

- **Standalone site.** usopa.org does not resolve, and teamusa.com/usopa returns 404. USOPA has no website of its own. It appears as one block on the USOPC "Life After Sport" page.
- **USOPC navigation.** About Us · Our Impact · For Athletes · People & Careers · For NGBs · For Media · Report a Concern · Contact Us. Secondary bar: Continuing Education · Professional Development · Life After Sport · All Benefits & Resources.
- **Life After Sport page order.** Intro and testimonial → "Retirement and what that means for you" (5 question headings, accordion style) → "Helpful Resources for You in This Time" (Pivot Program, Guild, Athlete Fellowship Program, Tuck) → "Seeking Mental Health Support?" (emergency callout pointing to 9-8-8) → "Stay involved with Team USA" (Athletes' Commission, USOPA, USOPA Chapters) → "Am I Eligible for these Resources?" → footer.
- **Membership.** USOPA is described as an alumni group for athletes who represented Team USA at a Games. There is no join button or dues information. Chapters are reached through a link and a shared mailbox. Eligibility gets its own section, with concrete time windows for general Team USA benefits (e.g. Agora access for 10 years after the last qualifying event).
- **Search.** Icon only. **Footer.** General, Get Involved, Team USA, Olympics & Paralympics groups; Accessibility, Governance, Privacy, Site Map; Cookie Settings.
- **Takeaways.** Organising the page around the retiring athlete's questions and adding a section that answers "Am I eligible?" both work well. Hiding the alumni association inside the parent body's site is what to avoid: a 2023 review cited in search results found many members did not know what USOPA does.

### 1.6 OLY Canada (oly.olympic.ca), successor to Olympians Canada

- **Audiences.** Active and retired Team Canada Olympians, addressed directly.
- **Navigation.** Home · Athletes ▾ · Governance · Intact Olympian Impact ▾ · Ways to get Involved · News · Resources · Contact Us · FR.
- **Home page order.** Hero ("Oly Canada") → intro on the Olympian legacy → quick links ("oly canada commission", "ways to get involved") → "Intact olympian Impact" banner with "Next Intake: Spring 2027" → Latest News ("View all news") → footer.
- **Membership.** Only the community size is stated ("around 3000 retired and active Olympians"). The OLY letters, benefits and Legacy Grants are not on the home page.
- **Stats.** One figure (≈3000).
- **Language.** One "FR" link.
- **Footer.** Team Canada link, connect/subscribe, Instagram, Facebook, X, © Canadian Olympic Committee, Privacy Policy.
- **Weak points.** Capitalisation is inconsistent ("oly canada commission", "Intact olympian Impact"). No search. A thin home page that gives an Olympian no reason to come back. Showing the programme intake date on the banner is the one thing worth copying.

### 1.7 Team GB (teamgb.com)

- **Audiences.** Fans, athletes ("Athlete Resources"), partners, media and job seekers.
- **Navigation.** News · Athletes · Sports · Games · Video · Shop · Our Impact (Team GB Foundation, Charity Partners, Get Set) · SUBSCRIBE.
- **Athletes page.** Heading "OUR ATHLETES". An athlete carousel with round portraits, the name and the sport in a colour accent, plus pager dots. A search field labelled **"Search by Athlete Name, Sport or Games"** with an EXPLORE button. A Filter panel (Filter / Clear / Apply / Cancel). A "SELECTED FOR MILANO CORTINA 2026" block.
- **Footer.** Useful Links (shown twice with different items), Follow (TikTok, Facebook, Instagram, YouTube, X, Snapchat), partner tiers (Worldwide Partners, Official Partners, Official Suppliers, Official Charity), Legal Links (including Modern Slavery Statement, Safeguarding, Equality and Diversity Statement).
- **Weak points and rule conflicts.** On first load a cookie wall and a newsletter modal ("BE PART OF TEAM GB'S JOURNEY TO LA28") appear on top of each other and cover the directory. All headings are in capitals. The athlete strip is a horizontal carousel. The WebFetch render showed no body content, a sign of heavy client-side rendering.

### 1.8 New Zealand Olympic Committee (olympic.org.nz)

- **Audiences.** Fans, athletes and sport staff ("Athlete & Sport Hub"), educators, partners and donors.
- **Navigation.** Primary: Games · Athletes · Sports. Secondary: Videos · Photos · News · Education · Shop · More (About NZOC; Athlete & Sport Hub; NZ Team History; NZOC Partners; NZ Olympic Foundation; NZ Wāhine Toa Programme).
- **Home page order.** Hero with a downloadable "Te Reo glossary" card → Latest news → athlete spotlight (Lisa Carrington, "9 Olympic Medals", "View athlete" / "View all athletes" / "See all past games") → NZ Team TV → "STAY UPDATED" newsletter → Our partners → footer.
- **Athlete directory (/athletes/).** The best directory in this set. A breadcrumb; a "Search for an athlete" box with a button; "Refine by" with a **live count ("4271 athletes")**; Filter; a per-page choice (30/60); "Sort by A-Z". Cards show a photo or placeholder, the sport, the name and a medal line ("1 Olympic Medal"). Each profile has a clean URL (`/athletes/valerie-adams`).
- **Language.** English interface with te reo Māori in programme names and resources.
- **Footer.** Repeated nav columns, "Follow NZ Team" socials, © NZOC, Privacy, Terms.
- **Weak points.** "STAY UPDATED" in capitals. No site-wide search on the home page. Many cards loaded as empty placeholders.

### 1.9 Olympic Refuge Foundation (extra)

- **Navigation.** Programmes · Refugee Team · Think Tank · Coalition · Resources, with two buttons on the right: **Donate** (filled) and **Join us** (secondary).
- **Home page order.** Hero statement ("We believe in a society where everyone belongs, through sport") → Our Mission / Our work (impact pillars: Access, Adoption…) → **Programmes with a Map / List toggle** → Refugee Team (video playlist) → News & Articles → Partners → Collective Action (Think Tank, Coalition, Community of Practice) → Join Us / Contact Us → footer.
- **Programmes directory.** The **Map** tab shows a world map with clustered pins (cluster counts such as "2", "3") and zoom controls. The **List** tab shows a card grid; each card has the country (Bangladesh, Bulgaria, Burkina Faso…), the programme name (SPIRIT, SPORT COACH+, RESPECT…), the locations and a "Know more" button.
- **Footer.** Donate, Join us, the section links, "Go to Olympics.com", and cookie and legal links.
- **Weak points and rule conflicts.** "OUR MISSION" and "PROGRAMMES" are in all caps. The mission copy still states a target "by 2024", which is out of date. The map uses saturated orange land on a blue sea, which reads as decoration more than information.

### 1.10 Baseline: olympians.org today

- Navigation: WOA (About, Olympism, Leadership, Contact Us) · Olympians (OLY, Olympian.org Email, Health, Olympians for Life, WOF) · NOAs (NOA Guide, NOA Directory, Grants) · News · OLY House · Best Practices · SkillsBuild. Utility links: Contact, X, Facebook; English / Français / Español. The nav is set in capitals.
- **OLY page.** A "Register for OLY" form (name, date of birth as three dropdowns, country/team, email, phone, Code of Conduct and T&C checkboxes). It does not say who is eligible, what happens after submitting, or how long it takes. It uses "Sign up" and "Register" for the same action. An uncaptioned image carousel sits under the form.
- **NOA Directory.** A decorative world map, an A–Z bar (O, Q, W, X, Y missing) and a "Search" heading. **The directory body rendered empty in the browser: no entries, links or loading state.**
- **News.** Tag "News" on every item. Only the first item shows a date. No summaries, filters or pagination.
- **Cookie notice.** "I Understand" only.

---

## 2. Comparison matrix

| | IOC | Athlete365 | ANOC | EOC | USOPA (USOPC) | OLY Canada | Team GB | NZOC | ORF | WOA today |
|---|---|---|---|---|---|---|---|---|---|---|
| Site search | Icon | Yes | No | Field | Icon | No | Directory only | Directory only | No | No |
| Language switch | EN/FR | Selector | No | EN/FR | No | FR link | No | Partial te reo | No | EN/FR/ES (resets to home) |
| Member/country directory | – | – | Link (404) | Flag list of 50 | Chapters link | – | Search + filter | Search, filter, count, sort | Map/List toggle | Empty page |
| Membership explained | – | Gated, "Start" only | – | – | Eligibility section | Community size only | Fan newsletter | – | "Join us" button | Form only |
| News card fields | Tag, date | Category, title | Date, excerpt | Tag, date, excerpt | – | Not rendered | – | Not rendered | Title | Tag, title, date on first item only |
| All-caps headings | Yes | Yes | n/a | Some | No | No | Yes | Some | Yes | Nav |
| Horizontal carousels | Yes | Yes | News slider | News slider | No | No | Yes | Card rows | No | Image carousel |

---

## 3. Synthesis for olympians.org

### 3.1 Audiences and top tasks

| Audience | Top tasks | Where it goes today | What the redesign must make easy |
|---|---|---|---|
| **Olympian (individual)**, the main audience | Get the OLY letters; check eligibility; find their NOA; get an olympian.org email; health and Olympians for Life support; SkillsBuild; see news about fellow Olympians | Under "Olympians" and "SkillsBuild", with acronyms not explained | A single "For Olympians" entry point. An OLY flow with eligibility, steps, what happens next and timing. "Find my NOA" from any page |
| **NOA official / volunteer** | Read the NOA Guide; apply for WOA Grants (criteria, deadline, amount); share best practices; update directory details; contact WOA | Spread across "NOAs", "Best Practices", "News" | A "For NOAs" hub: Guide, Grants (status, deadline, eligibility), Best Practices, directory listing, contacts |
| **Prospective Olympian association / NOC** | Learn how to set up an NOA and join WOA | Not visible | A "Start an NOA" guide page linked from the directory's empty countries |
| **Media** | Find out what OLY is; WOA leadership; press releases; images; contact | News list, Leadership page | A Media page: fact sheet, leadership, press contact, logo rules |
| **Partners / sponsors** | Understand reach (number of Olympians, NOAs, countries); partnership options | Not visible | Facts and figures block; partner page |
| **Fans / public** | Check whether someone is an Olympian; stories; OLY House | News, OLY House | Stories and OLY House. Low priority on the home page |
| **IOC / Olympic family staff** | Governance, statutes, contacts | WOA › About / Leadership | About section with governance documents |

### 3.2 Patterns worth adopting (15)

1. **Search box with a live result count on the directory.** "Search for an athlete" plus "4271 athletes" and Sort A–Z. *NZOC.* Use for the NOA directory ("Search by country or NOA", "N associations") and later for news.
2. **Map / List toggle for a geographic directory.** A world map with clustered pins and a card list of the same data, switched with two tabs. *Olympic Refuge Foundation.* The list view must be the default on phones, and the map stays informative (pins and counts, no decorative colour).
3. **Country entry as flag + name linking to a country page.** *EOC ENOCS.* Each NOA gets its own page (`/noas/kenya/`) with contacts, website and social links, and an "OLY recipients" or news slot. Use current country names in slugs and labels (EOC still shows `fyrom` and `turkey`).
4. **A plain "Am I eligible?" section with concrete conditions and time windows.** *USOPC Life After Sport.* Put this at the top of the OLY page: who counts as an Olympian, what is checked, what happens after submitting, how long it takes.
5. **Organise the Olympian section around the retiring athlete's questions.** *USOPC.* Use question headings ("What is OLY?", "How do I use the letters?", "Is there a fee?") in an accordion, so detail is opened only when needed.
6. **Benefits shown as short "offer" cards with a one-line promise.** *Athlete365 "Offers".* Use for OLY letters, olympian.org email, SkillsBuild, health resources and OLY House. Lay them out in a wrapping grid, not a rail.
7. **Topic browsing.** *Athlete365 "Discover by topic".* Use as tags on news and resources: Health, Careers, Grants, OLY, Events. Show them as text chips in a wrapping row, not icons in coloured circles.
8. **Two clear calls to action in the header.** ORF puts Donate (primary) and Join us (secondary) on the right of the nav. For WOA: "Get OLY" (primary) and "Find your NOA" (secondary).
9. **Hover mega-menu with a "See all" link and labelled columns.** *IOC.* WOA's three-level dropdown becomes three or four panels (For Olympians, For NOAs, News & stories, About WOA), each with short descriptions under the links.
10. **News cards with a topic chip, date, headline and excerpt, plus one "All news" link.** *IOC, EOC.* Every item gets a date (today only the first one does). Add filters by topic and pagination on the news page.
11. **Programme banner with the next deadline or intake.** *OLY Canada, "Next Intake: Spring 2027".* Use on WOA Grants: open/closed status, deadline, amount range, link to criteria.
12. **Cross-family bar or footer row of sibling organisations.** *IOC, Athlete365* (Olympics, Athlete365, Olympic Museum, ORF…). WOA links to IOC, Athlete365 and the IOC Athletes' Commission, and back to NOAs. Logos stay unaltered, or plain text links are used.
13. **Calendar list with date badges.** *ANOC Meetings / Competitions calendars.* Use for WOA events, Olympians reunions, grant deadlines and the General Assembly.
14. **Single-person spotlight with one key figure and two actions.** *NZOC*: "9 Olympic Medals", "View athlete", "View all athletes". Use for an "Olympian of the month" or a NOA highlight, with one figure, not a stats wall.
15. **A footer that carries governance.** *Team GB* (Safeguarding, Equality and Diversity, Modern Slavery statements), *EOC* (a short description of the organisation plus its address). WOA's footer adds what WOA is in one sentence, the address, a contact email, governance links and a cookie-settings link.

Extra notes, not counted above: the IOC gave a policy FAQ its own home page slot. WOA could do the same for "OLY: questions and answers" when demand peaks after a Games. Language switching must keep the current page (today WOA's switcher resets to the home page). The IOC and EOC switchers stay on the section.

### 3.3 Anti-patterns to avoid

| Anti-pattern | Seen on | Why it matters for WOA |
|---|---|---|
| Directory link that leads to a 404 or an empty page | ANOC (`/nocs/directory/` 404), **WOA's own NOA Directory renders empty** | The directory is a core NOA and Olympian task. It needs real entries, a no-JS fallback and a "no results" state |
| Membership gate with no explanation ("Welcome… Start") | Athlete365 | The OLY page must say what you get and what happens next before asking for data |
| Alumni body buried inside the parent's site, with no own entry point | USOPA (no domain, one block on usopc.org) | WOA must look like the home for Olympians, not a sub-page |
| Too many top-level items | ANOC (13), WOA (8 with mixed purposes) | Group into 4–5 audience-led sections |
| Inconsistent labels, capitalisation and date formats | ANOC, EOC, OLY Canada, WOA ("Sign up"/"Register", "Noas"/"NOAs") | Set one glossary (OLY, NOA, WOF spelled out at first use) and one date format |
| Cookie wall plus a newsletter modal stacked on first load | Team GB | Use one consent banner with "Reject all", and no modal on arrival |
| Stale content in plain view | EOC copyright 2024; ORF "by 2024" target | Add review dates for evergreen pages |
| Horizontal carousels and sliders for news, athletes and offers | IOC, Athlete365, Team GB, EOC, ANOC | Against the client's rules. Use wrapping grids and a "More" link |
| All-caps headings (CSS or typed capitals) | IOC, Athlete365, Team GB, ORF, EOC promos, NZOC "STAY UPDATED", WOA nav | Against the client's rules. Use sentence case |
| Small category labels above card titles | Athlete365 (orange labels on every card) | Against the "no eyebrows" rule. Put the topic as a chip under or beside the meta line, or leave it out |
| Icons in filled coloured circles or squares | Athlete365 topic chips | Against the rules. Use plain line icons that match their labels, or text chips |
| Gradients and decorative art behind content | Athlete365 Dakar band | Against the rules |
| Ghost or outlined duplicate headings behind titles | IOC | Decoration that repeats text. Avoid |
| Uncaptioned image carousels | WOA OLY page | Remove, or replace with captioned photos in a grid |
| Decorative map with no data | WOA NOA Directory | If a map is shown, it must carry the data (pins, counts) and have a list equivalent |
| No site search | ANOC, OLY Canada, ORF, WOA | WOA has many documents (NOA Guide, grants, best practices). Add global search |

### 3.4 Brand and protected marks

- None of the sites alter the Olympic rings. The IOC, Athlete365 and ORF show them only as part of the official lock-ups. The WOA logo with rings must stay exactly as supplied: no recolouring, cropping, outlining or animation.
- Use "Olympic" and "Olympian" only in the WOA's own approved wording, and partner logos only in their supplied form.

---

## 4. Gaps and limits

- usopa.org and olympians.ca do not resolve. Findings for those organisations come from usopc.org and oly.olympic.ca.
- ANOC's NOC directory URL returned 404, so its directory pattern could not be assessed.
- The Team GB home page body and some NZOC card content did not render for the fetcher. Team GB was checked in a browser only on /athletes.
- Athlete365 language options and the IOC mobile menu were not checked. Pages were reviewed at desktop width only. No phone-width checks were made.
