# JOVI Modo Aula App

Aplicacao full-stack separada da sprint, pensada como evolucao real do projeto.

## Recursos

- Login e cadastro com JWT
- SQLite para usuarios, materias e registros
- Upload real de imagem e audio
- CRUD completo de materias e timeline
- Proxy seguro para Gemini no backend
- Frontend mobile-first servido pelo Express

## Como rodar

1. Copie `.env.example` para `.env`
2. Preencha `JWT_SECRET` e `GEMINI_API_KEY`
3. Instale dependencias com `npm install`
4. Rode com `npm run dev`
5. Abra `http://localhost:3000`

## Persistencia local por computador

- O banco SQLite e os uploads ficam fora da pasta do projeto, em uma pasta local do proprio usuario.
- No Windows, o padrao fica em `%LOCALAPPDATA%\\JOVI\\modo-aula-app`.
- Cada computador comeca vazio e mantem apenas os dados criados naquele proprio ambiente.
- Se precisar mudar esse local, defina a variavel `JOVI_DATA_DIR` antes de iniciar o servidor.
