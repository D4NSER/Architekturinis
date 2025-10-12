# FitBite Front-end

TypeScript + React aplikacija, teikianti autentifikuotą sąsają sveikos mitybos planams kurti ir tvarkyti. Šis dokumentas pakeičia standartinį CRA README.

## Greitas startas
```bash
cd frontend
cp .env.example .env               # REACT_APP_API_URL -> http://localhost:8000/api
npm install
npm start
```
Aplikacija pasiekiama `http://localhost:3000` ir bendrauja su FastAPI `http://localhost:8000/api`.

## Branduolio struktūra
- `src/features/auth` – prisijungimo/registracijos logika, `AuthContext` saugo JWT ir naudotoją.
- `src/features/profile` – profilio forma su kūno duomenų atnaujinimu, KMI vertinimu ir nuotraukos įkėlimu.
- `src/features/plans` – rekomenduojamo plano atvaizdavimas, planų detalės, paruoštų planų pasirinkimas, individualaus plano kūrimas savaitei.
- `src/features/plans/PlanDetailPage.tsx` – išplėstos plano informacijos puslapis.
- `src/layouts/AppLayout` – apsaugotas „dashboard“ su šonine navigacija.
- `src/routes/ProtectedRoute` – užtikrina, kad neautentifikuoti vartotojai nukreipiami į `/login`.
- `src/api/*` – atskiros Axios klientų funkcijos (`auth`, `users`, `plans`).

## Aplinkos kintamieji
| Kintamasis | Numatytoji reikšmė | Pastabos |
|------------|--------------------|----------|
| `REACT_APP_API_URL` | `http://localhost:8000/api` | Perjunkite diegiant į kitą hostą (pvz., `https://api.fitbite.lt/api`). |

## Naudingi skriptai
| Komanda | Paskirtis |
|---------|-----------|
| `npm start` | Dev serveris su HMR. |
| `npm test` | React Testing Library (observuoti būsimiems testams). |
| `npm run build` | Optimizuotas gamybinis build (`build/`). |
| `npx tsc --noEmit` | Griežta tipų patikra (galima integruoti CI). |
| `npm run lint` | _nėra_; jei reikalinga, pridėkite ESLint konfigūraciją ateityje. |

## Autentifikacijos detalės
1. Prisijungus UI gauna `access_token` (`LoginResponse`) ir išsaugo `localStorage` (`fitbite_token`).
2. `AuthContext` nustato `Authorization` antraštę visoms Axios užklausoms.
3. `ProtectedRoute` rodo „Kraunama...“ būseną kol vyksta profilio užklausos ir nukreipia į `/login` jei tokenas neteisingas.
4. Atsijungus tokenas ir profilio duomenys išvalomi.

## Formų UX
- Visos formos naudoja bendrą `FormField` komponentą, užtikrinantį vienodą stilių.
- Klaidos rodomos `error-banner` (raudona), sėkmės – `success-banner` (žalia).
- Individualus planas leidžia pridėti/salinti patiekalus iki 21 įrašo savaitei; klaidos rodomos lietuviškai.

## Build & deploy pastabos
1. Konfigūruojant CI rekomenduojama naudoti:
   ```bash
   npm ci
   npm run build
   ```
2. Norint statinį buildą tiekti per `serve` ar kitą serverį: `npx serve -s build -l 3000`.
3. Prieš deploy verta paleisti `npx tsc --noEmit` ir (kai atsiras testai) `npm test -- --watch=false`.

## Tolimesni darbai (front-end roadmap)
1. Įdiegti formų validaciją su Zod (`zodResolver` + React Hook Form).
2. Pridėti vienetinius testus pagrindiniams komponentams (`AuthContext`, `PlansPage`).
3. Optimizuoti planų formą – pridėti drag&drop patiekalų tvarkymui.
4. Integruoti „dark mode“ ir prieinamumo (ARIA) patobulinimus.
5. Paruošti `Dockerfile` UI konteinerizacijai / „Cloud Run“ diegimui.

---
Jei reikalinga išsamesnė informacija apie API ar bendrą architektūrą, žr. projekto šaknies `README.md`.
