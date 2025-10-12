# FitBite – Iteracija 1

Pirmoji FitBite iteracija apima pilną naudotojo kelionę: registracija ir prisijungimas, profilio priežiūra su naujais kūno duomenų laukais, rekomenduojamo plano parinkimas (su paaiškinimu), detalūs planų puslapiai, individualaus savaitės plano sudarymas bei nuotraukos įkėlimas. Šis pagrindas paruoštas tolimesniam plėtojimui (Stripe mokėjimai, AI rekomendacijos, Docker diegimas).

## Technologijos ir reikalavimai
- **Front-end:** React 19 + TypeScript, React Router, Axios, Zod (validacijos).
- **Back-end:** FastAPI, SQLAlchemy 2.0, Pydantic, Passlib, python-jose.
- **DB adapteris:** SQLite (lokaliam vystymui; lengvai pakeičiama į PostgreSQL).
- **Autentifikacija:** JWT (HS256) su `access_token` saugojimu localStorage.
- **Failų saugykla:** lokali `media/profile_pictures/` direktorija (servinama per FastAPI `StaticFiles`).
- **Minimalūs įrankiai:** Python 3.11+, Node.js 20+, npm 10+, `curl` arba `HTTPie`, `sqlite3` (pasirinktinai analizei).

## Greitas startas dviem terminalais
```bash
# Terminalas A – API
cd backend
cp .env.example .env                     # sureguliuokite slaptažodžius / DB URL
python -m venv .venv
source .venv/bin/activate                # Windows: .venv\Scripts\activate arba .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminalas B – Front-end
cd frontend
cp .env.example .env                     # REACT_APP_API_URL -> http://localhost:8000/api
npm install
npm start
```
- API: `http://localhost:8000`
- UI: `http://localhost:3000`
- Swagger: `http://localhost:8000/docs`
- Sveikatos patikra: `curl http://localhost:8000/healthz`

> **Svarbu.** Jei prieš šią iteraciją jau buvote paleidę API su `app.db`, ištrinkite failą `backend/app.db`, kad būtų sukurta atnaujinta schema su naujais naudotojo laukais ir FitBite planų sėkla.

### Vieno komandos paleidimas (`dev.sh`)
Jei priklausomybės jau suinstaliuotos (t. y. `backend/.venv` egzistuoja ir `frontend/node_modules` įrašytas), galite paleisti abi dalis vienu metu:
```bash
./dev.sh
```
- Skriptas startuoja FastAPI ir React paraleliai, rodo jų PID ir išjungia procesus paspaudus `Ctrl+C`.
- Jei trūksta priklausomybių, skriptas pateiks aiškų pranešimą, kokias komandas reikia įvykdyti (`python -m venv ...`, `pip install ...`, `npm install`).
- Windows naudotojams rekomenduojama vykdyti per WSL arba Git Bash (PowerShell palaikymas planuojamas vėliau).

## Back-end gilinimasis
### Konfigūracija (`backend/.env`)
| Kintamasis | Paskirtis | Pastabos |
|------------|-----------|----------|
| `PROJECT_NAME` | API pavadinimas | rodomas Swagger antraštėje |
| `API_V1_PREFIX` | Bazinis kelias | numatyta `/api` |
| `BACKEND_CORS_ORIGINS` | Leidžiamos UI kilmės | kableliais atskirtas sąrašas |
| `DATABASE_URL` | SQLAlchemy DSN | `sqlite:///./app.db` arba `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT nustatymai | HS256 ir 60 min numatytieji |

### Kas vyksta paleidimo metu
1. Sukuriamos lentelės pagal SQLAlchemy modelius (`Base.metadata.create_all`).
2. `seed_initial_plans()` automatiškai įkelia 6 FitBite planus (Slim, Maxi, Smart, Vegetarų, Office ir Boost) su pavyzdiniais savaitės patiekalais.
3. Sukuriama `media/profile_pictures` direktorija (jei jos nėra).

### Naudotojo duomenys
- Registracijos metu privaloma nurodyti FitBite tikslą (`weight_loss`, `muscle_gain`, `balanced`, `vegetarian`, `performance`).
- Pasirinktinai pateikiamas ūgis (cm), svoris (kg), aktyvumo lygis (`sedentary`, `light`, `moderate`, `active`, `athlete`), mitybos preferencijos ir alergijos.
- Šie duomenys naudojami rekomenduojant planą (pagal KMI, aktyvumą, tikslą ir preferencijas) bei rodomi profilio puslapyje su KMI vertinimu.

### Tipiniai scenarijai
- **Švarus startas:** `rm backend/app.db && uvicorn app.main:app --reload` (arba pritaikykite savo SQLite kelią).
- **Perjungimas į PostgreSQL (lokalus Docker):**
  ```bash
  docker run --name fitbite-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fitbite -d postgres:16
  export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/fitbite"
  uvicorn app.main:app --reload
  ```
- **Vienkartinės migracijos vizija:** įdiegti Alembic ir generuoti migracijas ateityje (`alembic init`, `alembic revision --autogenerate`).

### API „smoke testai“
```bash
# 1) Registracija (su tikslais ir kūno duomenimis)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"P@ssw0rd123","first_name":"Demo","goal":"weight_loss","height_cm":172,"weight_kg":78,"activity_level":"moderate"}'

# 2) Prisijungimas (išsaugome JWT)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"P@ssw0rd123"}' | jq -r '.access_token')

echo "ACCESS TOKEN: $TOKEN"

# 3) Naudotojo info
curl http://localhost:8000/api/users/me -H "Authorization: Bearer $TOKEN"

# 4) Planų sąrašas
curl http://localhost:8000/api/plans -H "Authorization: Bearer $TOKEN"
```
> Patarimas: naudokite [HTTPie](https://httpie.io/) arba VS Code REST Client patogesniam testavimui.

### Failų įkėlimas (profilio nuotrauka)
```
curl -X POST http://localhost:8000/api/users/me/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@~/Pictures/avatar.jpg"
```
Failas pateks į `backend/media/profile_pictures/` ir bus pasiekiamas per `http://localhost:8000/media/profile_pictures/...`.

## Pagrindinės API galimybės (iteracija 1)
- `POST /api/auth/register` – paskyros sukūrimas su tikslu, kūno duomenimis ir preferencijomis.
- `POST /api/auth/login` – JWT prisijungimas.
- `GET /api/users/me` – prisijungusio naudotojo profilis (įskaitant pasirinktą planą ir KMI duomenis).
- `PUT /api/users/me` – profilio informacijos atnaujinimas (tikslas, ūgis, svoris, aktyvumas ir pan.).
- `POST /api/users/me/avatar` – profilio nuotraukos įkėlimas (PNG/JPG).
- `GET /api/plans` – visų prieinamų FitBite planų sąrašas (įskaitant individualius).
- `GET /api/plans/recommended` – rekomenduotas planas su `recommendation_reason` pagal naudotojo duomenis.
- `GET /api/plans/{id}` – detalus plano vaizdas su savaitės patiekalais.
- `POST /api/plans/custom` – individualaus savaitės plano sudarymas (iki 21 įrašo).
- `POST /api/plans/select` – plano priskyrimas naudotojui.

## Front-end gilinimasis
### Pagrindiniai skriptai
- `npm start` – dev serveris su HMR.
- `npm test` – React Testing Library (šiuo metu be konkrečių testų, pasiruošta ateičiai).
- `npm run build` – gamybinis build.
- `npx tsc --noEmit` – griežta tipų patikra.

### Aplinkos kintamieji (`frontend/.env`)
| Kintamasis | Aprašymas |
|------------|-----------|
| `REACT_APP_API_URL` | API bazinis URL, numatyta `http://localhost:8000/api`. Keičiant hostą ar protokolą nepamirškite HTTPS ir CORS nustatymų. |

### Autentifikacijos srautas UI pusėje
1. Prisijungus saugomas `fitbite_token` localStorage.
2. `AuthContext` prideda/nuima `Authorization: Bearer <token>` antraštę naudodamas Axios `defaults`.
3. `ProtectedRoute` komponentas neleistina prieigą be tokeno ir nukreipia į `/login`.

### UI struktūra
- `features/auth/*` – prisijungimo/registracijos puslapiai ir kontekstas.
- `features/profile/ProfilePage.tsx` – profilio redagavimas su ūgio, svorio, aktyvumo laukais, KMI skaičiavimu ir nuotraukos keitimu.
- `features/plans/PlansPage.tsx` – rekomenduojamas planas su paaiškinimu, visų planų sąrašas ir individualaus plano formos logika.
- `features/plans/PlanDetailPage.tsx` – detalus plano puslapis su savaitės meniu ir galimybe iš karto priskirti planą.
- `components/FormField.tsx` – vieningas formos laukų komponentas (input, textarea ir select).
- `layouts/AppLayout.tsx` – šoninę navigaciją turinti apsaugota aplikacijos struktūra.

### CSS ir UX
- `App.css` sukuria „dashboard“ stiliaus išdėstymą, reaguojantį į < 900 px pločio ekranus.
- Klaidos (raudonos) ir sėkmės (žalios) juostos atitinka aiškių pranešimų reikalavimą.
- Navigacija (sidebar + viršus) užtikrina patogią judėjimo patirtį tarp puslapių.

## QA patikrinimų sąrašas prieš demonstraciją
1. **Registracija + prisijungimas** – naujas naudotojas su tikslu, ūgiu, svoriu, aktyvumu; automatinis login.
2. **Profilio atnaujinimas** – vardas, pavardė, tikslas, kūno duomenys, preferencijos, išsaugojimas ir KMI atsinaujinimas.
3. **Nuotraukos įkėlimas** – PNG ir JPG testas, klaidos pranešimai neteisingiems formatams.
4. **Planų peržiūra** – rekomenduojamo plano paaiškinimas, makro santrauka ir nuoroda į detalų puslapį.
5. **Planas detaliai** – `/plans/:id` rodo savaitės struktūrą, leidžia priskirti planą ir grįžti į sąrašą.
6. **Parengto plano pasirinkimas** – `Pasirinkti planą` -> statuso baneris -> mygtuko disablinimas.
7. **Individualaus plano kūrimas** – pridėjimas, šalinimas iš sąrašo, limitas iki 21 įrašo, planų sąrašas atsinaujina.
8. **Tokeno galiojimas** – atnaujinti puslapį naršyklėje, vartotojas lieka prisijungęs.

## Kiti naudingi failai
- `backend/.env.example` – back-end konfigūracija.
- `backend/requirements.txt` – priklausomybės (įskaitant uvicorn, alembic).
- `backend/media/profile_pictures/` – saugomos naudotojų nuotraukos.
- `frontend/.env.example`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json` – TypeScript aplinka.

## Tolimesnės iteracijos (roadmap)
1. PostgreSQL + Alembic migracijos + Docker Compose (DB + API + UI).
2. Stripe prenumeratų apmokėjimai ir planų monetizacija.
3. Rekomendacijų variklis (pvz., ingredientų filtravimas, AI idėjos).
4. Integruotas receptų generatorius pagal turimus produktus.
5. Išsamus GDPR auditas (duomenų eksportas, ištrynimas, logai).

Šis README pakeičia seną Express/Cra boilerplate aprašą ir pateikia realias darbo instrukcijas visai komandai.
