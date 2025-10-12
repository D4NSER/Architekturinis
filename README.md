# BalancedBite – Iteracija 1

Pirmoji iteracija užtikrina pilną naudotojo kelionę: registracija ir prisijungimas, profilio priežiūra su nuotraukos keitimu, mitybos planų peržiūra, parinkimas ir individualaus savaitės plano sudarymas. Šis pagrindas paruoštas tolimesniam plėtojimui (Stripe mokėjimai, AI rekomendacijos, Docker diegimas).

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
2. `seed_initial_plans()` automatiškai įkelia 2 demonstracinius mitybos planus su patiekalais.
3. Sukuriama `media/profile_pictures` direktorija (jei jos nėra).

### Tipiniai scenarijai
- **Švarus startas:** `rm backend/app.db && uvicorn app.main:app --reload` (arba pritaikykite savo SQLite kelią).
- **Perjungimas į PostgreSQL (lokalus Docker):**
  ```bash
  docker run --name balancedbite-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=balancedbite -d postgres:16
  export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/balancedbite"
  uvicorn app.main:app --reload
  ```
- **Vienkartinės migracijos vizija:** įdiegti Alembic ir generuoti migracijas ateityje (`alembic init`, `alembic revision --autogenerate`).

### API „smoke testai“
```bash
# 1) Registracija
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"P@ssw0rd123","first_name":"Demo","goals":"weight_loss"}'

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
1. Prisijungus saugomas `balancedbite_token` localStorage.
2. `AuthContext` prideda/nuima `Authorization: Bearer <token>` antraštę naudodamas Axios `defaults`.
3. `ProtectedRoute` komponentas neleistina prieigą be tokeno ir nukreipia į `/login`.

### UI struktūra
- `features/auth/*` – prisijungimo/registracijos puslapiai ir kontekstas.
- `features/profile/ProfilePage.tsx` – profilio redagavimas, nuotraukos įkėlimas.
- `features/plans/PlansPage.tsx` – rekomenduojamas planas, visų planų sąrašas ir individualaus plano formos logika.
- `components/FormField.tsx` – vieningas formos laukų komponentas.
- `layouts/AppLayout.tsx` – šoninę navigaciją turinti apsaugota aplikacijos struktūra.

### CSS ir UX
- `App.css` sukuria „dashboard“ stiliaus išdėstymą, reaguojantį į < 900 px pločio ekranus.
- Klaidos (raudonos) ir sėkmės (žalios) juostos atitinka aiškių pranešimų reikalavimą.
- Navigacija (sidebar + viršus) užtikrina patogią judėjimo patirtį tarp puslapių.

## QA patikrinimų sąrašas prieš demonstraciją
1. **Registracija + prisijungimas** – naujas naudotojas, automatinis login po registracijos.
2. **Profilio atnaujinimas** – vardas, pavardė, tikslai, išsaugojimas ir persikrovimas.
3. **Nuotraukos įkėlimas** – PNG ir JPG testas, klaidos pranešimai neteisingiems formatams.
4. **Planų peržiūra** – rekomenduojamo plano metas, detali makro santrauka.
5. **Parengto plano pasirinkimas** – `Pasirinkti planą` -> statuso baneris -> mygtuko disablinimas.
6. **Individualaus plano kūrimas** – bent vienas patiekalas, peržiūra sąraše, planų sąrašas atsinaujina.
7. **Tokeno galiojimas** – atnaujinti puslapį naršyklėje, vartotojas lieka prisijungęs.

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
