# Test Credentials — js.AI

## Demo user (already registered)
- Email: `demo@jsai.app`
- Password: `demo1234`
- Name: `Demo`

## Register flow
Registration is open (no verification). Testing agent can create fresh users, e.g.:
- Email: `test+<random>@jsai.app`
- Password: `test1234`
- Name: any

## Backend base URL
- External: `https://smart-app-maker-51.preview.emergentagent.com`
- API prefix: `/api`

## Notes
- JWT stored in secure store under key `jsai_auth_token`
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Chat endpoints: `GET /api/chats`, `POST /api/chats`, `GET /api/chats/{id}/messages`, `POST /api/chats/{id}/messages/sync`, `PATCH /api/chats/{id}`, `DELETE /api/chats/{id}`
