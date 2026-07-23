# Doctor Appointments API

NestJS 11 API for Day 2 authentication and role-based access control.

## Stack

- NestJS 11
- TypeScript
- PostgreSQL
- TypeORM
- JWT authentication
- npm

## Packages Added

- `@nestjs/config`: loads `.env` values through Nest's standard config module.
- `@nestjs/typeorm`, `typeorm`, `pg`: connects NestJS to PostgreSQL using TypeORM.
- `class-validator`, `class-transformer`: validates DTO request bodies through Nest's `ValidationPipe`.
- `bcrypt`: hashes signup passwords and verifies login passwords.
- `@nestjs/jwt`: signs JWT access tokens.
- `@nestjs/passport`, `passport`, `passport-jwt`: integrates JWT bearer authentication with Nest guards.
- `@types/bcrypt`, `@types/passport-jwt`: TypeScript types for development.

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/doctor_appointments
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

Do not commit real secrets. `.env` is already ignored by git.

## Database Setup

Create the PostgreSQL database before starting the app:

```sql
CREATE DATABASE doctor_appointments;
```

The app uses TypeORM with `synchronize: true` for this development task, so the `users` table is created automatically when the app starts. For production, replace synchronization with migrations.

## Install

```bash
npm install
```

## Run

```bash
npm run start:dev
```

The API runs on `http://localhost:3000` by default.

## Test

```bash
npm test
```

## API Requests

### Signup Doctor

`POST http://localhost:3000/auth/signup`

```json
{
  "name": "Dr. Asha Mehta",
  "email": "doctor@example.com",
  "password": "password123",
  "role": "DOCTOR"
}
```

### Signup Patient

`POST http://localhost:3000/auth/signup`

```json
{
  "name": "Ravi Kumar",
  "email": "patient@example.com",
  "password": "password123",
  "role": "PATIENT"
}
```

### Login

`POST http://localhost:3000/auth/login`

```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "name": "Dr. Asha Mehta",
    "email": "doctor@example.com",
    "role": "DOCTOR",
    "createdAt": "2026-07-21T00:00:00.000Z"
  }
}
```

### Doctor Profile

`GET http://localhost:3000/doctor/profile`

Header:

```http
Authorization: Bearer <doctor_access_token>
```

Only users with role `DOCTOR` can access this route. A patient token returns `403 Forbidden`.

### Patient Profile

`GET http://localhost:3000/patient/profile`

Header:

```http
Authorization: Bearer <patient_access_token>
```

Only users with role `PATIENT` can access this route. A doctor token returns `403 Forbidden`.

## Manual Testing Steps

1. Start PostgreSQL.
2. Create the `doctor_appointments` database.
3. Create `.env` with `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN`.
4. Run `npm run start:dev`.
5. Send the doctor signup request.
6. Send the patient signup request.
7. Send the same signup request again to confirm duplicate email returns `409 Conflict`.
8. Login as doctor and copy `access_token`.
9. Login as patient and copy `access_token`.
10. Call `GET /doctor/profile` with the doctor token and confirm `200 OK`.
11. Call `GET /doctor/profile` with the patient token and confirm `403 Forbidden`.
12. Call `GET /patient/profile` with the patient token and confirm `200 OK`.
13. Call `GET /patient/profile` with the doctor token and confirm `403 Forbidden`.
14. Call either profile route without a token and confirm `401 Unauthorized`.
