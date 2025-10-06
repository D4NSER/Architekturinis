# Projektas
Sukuriame repozitorija.
Pasileidziama per IDE ir terminale sekanciomis komandomis kuriame prjekta:
For Node.js backend:
 - cd backend
- npm init -y
- npm install express mongoose cors jsonwebtoken bcryptjs multer
- touch app.js
- mkdir controllers models routes uploads
- cd ..
For React frontend:
 - npx create-react-app frontend
For Python:
 - python3.11 -m venv venv
- mkdir backend

# Run and Test Locally:
- cd backend
- node app.js
- kitame terminale cd frontend
- npm start

# Githubo komandos:
patikrinti, kokiame branche esu: 
git branch
Sukurti nauja brancha ir pereiti i ji: 
git checkout -b pavadinimas-kazkoks
Parenkame visus failus su pakeitimas:
git add . 
Jeigu norime pasirinkti tik tam tikrus:
git add path/failas1 path/failas2
git commit -m "commito pranesimas"
git push origin pavadinimas-kazkoks
Vaikscioti per branchus:
git checkout main (arba pavadinimas-kazkoks)
Jeigu reikia parsisiusti naujus pakeitimus is pagrindines repozitorijos, bet nenorime sujungti ar keisti darbiniu failu, darome git fetch
git pull ir parsiuncia ir sujungia visus atnaujinimus.



