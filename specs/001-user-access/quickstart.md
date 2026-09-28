# Quickstart: Acceso seguro y administración de usuarios

**Feature**: `001-user-access` | **Fecha**: 2026-09-26

Dos partes:

1. **Pasos manuales**: lo que el Dueño configura en los paneles (DNS, Supabase, Resend, Vercel,
   GitHub). Claude no puede hacerlo porque requiere cuentas, pagos o secretos.
2. **Validación**: cómo levantar el proyecto en local y comprobar que la feature funciona.

> **Regla**: ningún valor secreto se escribe en el repo, ni siquiera en este documento. Los
> secretos solo se pegan en los paneles de Vercel/Supabase o en tu `.env.local` (ignorado por
> git). `.env.example` lista los **nombres** de las variables, nunca los valores.

---

## Parte 1 — Pasos manuales (Dueño)

Usa siempre la cuenta `admin@nexoru.ai`. Cada sección indica **cuándo** hacerla según la fase de
[tasks.md](tasks.md):

| Cuándo | Secciones | Costo |
|--------|-----------|-------|
| Fase 1 (Setup), en paralelo con el desarrollo | §2 Resend, filas de Resend en §3 DNS, §7 GitHub | 0 USD |
| Fase 4 (despliegue del MVP) | §1 Supabase Pro, §5 base de datos, §4 Vercel Pro, fila `op` en §3 DNS, §6 cuenta del Dueño | 45 USD/mes desde aquí |
| Cada historia posterior | §5 (migraciones nuevas) antes del merge de su PR | — |

Hasta la Fase 4, el desarrollo usa **solo Supabase local** (Parte 2); no hace falta contratar
nada.

### 1. Supabase (Pro, 25 USD/mes)

1. Crea o elige la **organización Nexoru** y cámbiala al plan **Pro** (Billing). Deja el
   **Spend Cap activado** (viene así por defecto) para que el costo no pase de 25 USD/mes.
2. Crea el proyecto **`nexoru-op`**:
   - Región **East US (North Virginia)**, la más cercana a Vercel `iad1` y con buena latencia
     desde México.
   - Contraseña de base de datos generada; guárdala en tu gestor de contraseñas, **no** en el
     repo.
3. **Project Settings → API Keys**: copia a tu gestor la **Project URL**, la **publishable key**
   y la **secret key**.
4. **Authentication → Sign In / Providers**:
   - **Allow new users to sign up: OFF** (FR-009).
   - ⚠️ **Deja activado el proveedor Email** ("Enable Email provider"): si se desactiva, también se
     bloquea el inicio de sesión con contraseña. El registro público lo corta solo la opción anterior.
   - Email provider activo. "Confirm email": ON.
   - Desactiva todos los proveedores sociales.
5. **Authentication → Passwords** (o "Password security"):
   - Longitud mínima **12**.
   - **Leaked password protection: ON**.
6. **Authentication → Multi-Factor**: **TOTP (App Authenticator)** activo, verificación
   habilitada. Phone MFA desactivado (es de pago y no se usa).
7. **Authentication → Sessions**:
   - **Time-box user sessions: 12 h**.
   - Inactivity timeout: vacío (la inactividad la controla la app, ver research R6).
8. **Project Settings → JWT** (o Authentication → Sessions): **Access token expiry: 300 s**.
9. **Authentication → Emails → SMTP Settings** (después del paso 2 de Resend):
   - Enable custom SMTP: ON.
   - Host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = API key SMTP de
     Resend.
   - Sender email `no-reply@nexoru.ai`, sender name `Nexoru Op`.
10. **Authentication → Emails**: **Email OTP expiration: 3600 s** (1 h, FR-024).
11. **Authentication → Emails → Templates → Reset password**: el texto en español se versiona en
    `supabase/templates/recovery.html`. Copia su contenido aquí.
12. **Authentication → URL Configuration**:
    - Site URL `https://op.nexoru.ai`.
    - Redirect URLs: `https://op.nexoru.ai/**`.
13. **Authentication → Rate Limits**: baja "sign-in/sign-up" a **10 por 5 min por IP** y
    "token verifications" a **10 por 5 min por IP** (mitigación de research R5).
14. **Authentication → Hooks → Custom Access Token**: activa y elige la función
    `public.custom_access_token_hook`. Hazlo **después** de aplicar las migraciones (paso 5 de
    esta parte).

### 2. Resend (gratis)

1. Crea la cuenta con `admin@nexoru.ai`.
2. **Domains → Add domain → `nexoru.ai`**, región `us-east-1`. Resend mostrará 3–4 registros DNS
   (ver paso 3).
3. Cuando el dominio aparezca como **Verified**: **API Keys → Create** con permiso **Sending
   access** limitado al dominio `nexoru.ai`. Esa clave es la contraseña SMTP del paso 1.9 y de
   `SMTP_PASSWORD`.

### 3. DNS de nexoru.ai

En el proveedor donde esté el DNS de `nexoru.ai`. Los valores exactos los dan Vercel y Resend en
sus paneles; aquí va el tipo y el nombre.

| Tipo | Nombre | Valor | Para |
|------|--------|-------|------|
| CNAME | `op` | El que indique Vercel (p. ej. `cname.vercel-dns.com`) | La app en op.nexoru.ai |
| TXT | `resend._domainkey` | Clave DKIM que muestra Resend | Firma de correos |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com`, prioridad 10 (según Resend) | Rebotes |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (según Resend) | SPF del subdominio de envío |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@nexoru.ai` (**solo si no existe ya**) | DMARC |

- **No toques** los registros MX de la raíz `nexoru.ai`: son los que reciben el correo de
  `admin@nexoru.ai`.
- Si el DNS está en Cloudflare, el CNAME `op` va con el proxy **desactivado** (nube gris), porque
  Vercel emite su propio certificado.

### 4. Vercel (Pro, 20 USD/mes)

1. Crea o elige el equipo **Nexoru** y cámbialo a **Pro**.
2. **Add New → Project →** importa `adminnexoru/nexoru-op` desde GitHub. Framework: Next.js (lo
   detecta solo).
3. **Settings → Environment Variables**, solo en el entorno **Production**:

   | Variable | Valor | Secreta |
   |----------|-------|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase | No |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | No (es pública por diseño) |
   | `SUPABASE_SECRET_KEY` | Secret key | **Sí** (marcar como Sensitive) |
   | `APP_URL` | `https://op.nexoru.ai` | No |
   | `SMTP_HOST` | `smtp.resend.com` | No |
   | `SMTP_PORT` | `465` | No |
   | `SMTP_USER` | `resend` | No |
   | `SMTP_PASSWORD` | API key de Resend | **Sí** (Sensitive) |
   | `EMAIL_FROM` | `Nexoru Op <no-reply@nexoru.ai>` | No |

4. **Settings → Git**: desactiva los **Preview deployments** (o deja Preview sin variables). Solo
   hay una base de datos, la de producción, y una preview no debe tocarla.
5. **Settings → Functions**: región **`iad1`** (Washington, junto a Supabase us-east-1).
6. **Settings → Domains → Add `op.nexoru.ai`** y crea el CNAME del paso 3.

### 5. Base de datos de producción (una vez, y en cada migración nueva)

Aplica las migraciones **solo cuando el PR correspondiente tenga CI en verde** y justo antes de
su merge.

En la **terminal integrada de VS Code**, donde tú tecleas los comandos (piden tu inicio de
sesión en Supabase y la contraseña de la base de datos, que Claude no debe ver):

```bash
npx supabase login                         # abre el navegador
npx supabase link --project-ref <ref>      # <ref> sale de la URL del proyecto
npx supabase db push                       # aplica supabase/migrations/*
```

Después, activa el hook del paso 1.14. En cada historia posterior que traiga migraciones, repite
solo `npx supabase db push` **antes** de hacer merge de su PR, para que el código nuevo encuentre
la base ya actualizada.

### 6. Activar la cuenta del Dueño

En la **terminal integrada de VS Code**, donde tú tecleas los comandos. Exporta las variables
solo en esa sesión de terminal: nunca en un archivo del repo ni pegadas en el chat con Claude.

```bash
#   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SMTP_*, EMAIL_FROM, APP_URL
npm run bootstrap:owner
```

Llegará a `admin@nexoru.ai` un correo de activación. Ábrelo, define la contraseña, escanea el QR
con tu app autenticadora y **guarda los 10 códigos de recuperación fuera del teléfono** (gestor
de contraseñas o papel en un lugar seguro).

### 7. GitHub

- **Actions** no necesita ningún secreto: CI usa Supabase local.
- **Protección de `main`** (gratis porque el repo es público, research R11): **Settings → Rules →
  Rulesets → New branch ruleset**, llamado `main`, con estado **Active** y objetivo la rama por
  defecto. Activa: *Restrict deletions*, *Block force pushes* y *Require a pull request before
  merging* (0 aprobaciones: trabajas solo). Deja *Require status checks to pass* para después:
  el check de CI solo aparece cuando corre por primera vez, en el PR de US1. Se activa en la
  tarea T065, antes de ese primer merge.
- **Secret scanning y Push protection** (gratis en repos públicos): **Settings → Advanced
  Security** (en algunas cuentas, "Code security"). Activa **Secret scanning** y **Push
  protection**. Con Push protection, GitHub **rechaza un push** que contenga una llave
  reconocible (por ejemplo, de Supabase o Resend) antes de que llegue al repo.
- **Un PR por historia**: cada historia de usuario se entrega en su propio PR de
  `001-user-access` hacia `main`. Haz merge con **"Create a merge commit"** (no "Squash"), para
  que la rama siga alineada con `main` y la historia siguiente parta limpia.

### 8. Procedimiento manual si el Dueño pierde el autenticador y los códigos

Es el caso límite de la spec, que no se automatiza.

1. Entra al panel de Supabase con `admin@nexoru.ai` (el panel tiene su propio 2FA; actívalo).
2. **Authentication → Users → admin@nexoru.ai → Remove MFA factors**.
3. En **SQL Editor**, registra la acción en la bitácora (principio I):
   ```sql
   select public.log_audit_event(
     p_action    => 'mfa_reset_forced',
     p_result    => 'success',
     p_actor_id  => (select id from auth.users where email = 'admin@nexoru.ai'),
     p_target_id => (select id from auth.users where email = 'admin@nexoru.ai'),
     p_metadata  => '{"via": "panel"}'
   );
   ```
4. Inicia sesión en op.nexoru.ai: sin factores registrados, pedirá registrar un autenticador
   nuevo y dará códigos nuevos. Los anteriores quedan invalidados al regenerarse.
5. La bitácora mostrará `mfa_reset_forced` (vía panel) y después `mfa_enrolled`.

### 9. Recuperar la contraseña del Dueño antes de que US4 esté en producción

Hasta que la Historia 4 (recuperación por correo) esté desplegada, op.nexoru.ai no tiene
pantalla para definir una contraseña nueva. Si olvidas la tuya, se hace **desde el panel de
Supabase**:

1. Entra al panel de Supabase con `admin@nexoru.ai` (con su propio 2FA).
2. Genera en tu gestor de contraseñas una contraseña aleatoria de **20 o más caracteres**. Este
   camino no pasa por la validación de la app ni por la protección de contraseñas filtradas.
3. **SQL Editor**, en una consulta nueva. Cambio de contraseña, cierre de sesiones y registro
   en la bitácora van en **una sola transacción**:
   ```sql
   begin;
   update auth.users
     set encrypted_password = extensions.crypt('<contraseña nueva>', extensions.gen_salt('bf'))
     where email = 'admin@nexoru.ai';
   delete from auth.sessions
     where user_id = (select id from auth.users where email = 'admin@nexoru.ai');
   select public.log_audit_event(
     p_action    => 'password_changed',
     p_result    => 'success',
     p_actor_id  => (select id from auth.users where email = 'admin@nexoru.ai'),
     p_target_id => (select id from auth.users where email = 'admin@nexoru.ai'),
     p_metadata  => '{"via": "panel"}'
   );
   commit;
   ```
4. **Borra de inmediato la consulta** del historial y de los snippets del SQL Editor: es el
   único lugar donde la contraseña queda en claro. Si no puedes borrarla, repite el
   procedimiento con otra contraseña y borra ambas consultas.
5. Inicia sesión en op.nexoru.ai con la contraseña nueva y tu código TOTP, que sigue siendo
   obligatorio.
6. La bitácora mostrará `password_changed` con `via: panel`.

Cuando US4 esté en producción, usa "¿Olvidaste tu contraseña?" en `/login`.

---

## Parte 2 — Validación en local

### Requisitos

- Node.js 24 LTS, npm.
- Docker (para Supabase local).
- Supabase CLI.
- Una app autenticadora (o `otplib`, que usan los tests).

### Arranque

```bash
npm install
supabase start                  # Postgres, Auth y Mailpit locales
supabase db reset               # aplica migraciones + seed
cp .env.example .env.local      # rellena con los valores de `supabase status`
npm run dev                     # http://localhost:3000
npm run bootstrap:owner         # invita a admin@nexoru.ai (local)
```

Los correos locales se ven en **Mailpit**: http://127.0.0.1:54324

### Pruebas automáticas

| Comando | Qué valida |
|---------|------------|
| `npm run lint && npm run typecheck` | Estilo y tipos |
| `npm test` | Vitest: matriz de permisos, validación de contraseñas, códigos, inactividad |
| `supabase test db` | pgTAP: RLS en todas las tablas, matriz de permisos en SQL, bitácora inmutable, visibilidad FR-029a |
| `npm run test:e2e` | Playwright: flujos críticos de abajo |

Las cuatro corren en GitHub Actions en cada PR. **Ningún merge a `main` sin verde** (principio VI).

### Escenarios de validación (Playwright + revisión manual)

Cada uno corresponde a una historia de la [spec](spec.md). Resultado esperado entre corchetes.

1. **Activación del Dueño y 2FA (Historia 1)**:
   - Abrir el correo de activación en Mailpit, definir la contraseña y registrar el TOTP.
     [Se muestran 10 códigos y se entra a `/`.]
   - Cerrar sesión y volver a entrar con la contraseña correcta y un código TOTP erróneo.
     [No entra; aparece `sign_in_failed` en la bitácora.]
   - Tras 5 fallos desde la misma IP. [Mensaje genérico "Demasiados intentos…", idéntico al que
     se obtiene con un correo inexistente; el 6.º intento desde esa IP, aunque sea correcto, se
     rechaza durante 15 min.]
   - Con ese bloqueo vigente, entrar con el mismo correo desde otra IP (cabecera simulada en el
     test). [Entra con normalidad, SC-010.]
   - Tras entrar, 31 min sin actividad (reloj simulado en el test). [Vuelve a `/login`.]
2. **Código de recuperación**:
   - Entrar con la contraseña y un código de recuperación. [Obliga a registrar un autenticador
     nuevo; llega el aviso; el código usado ya no sirve.]
3. **Invitaciones (Historia 2)**:
   - El Dueño invita a un Lector y a un Administrador. [Llegan 2 correos; ambos activan su
     cuenta.]
   - El Administrador intenta invitar a un Administrador. [La opción no aparece; la llamada
     directa devuelve `forbidden` y se registra `permission_denied`.]
   - Abrir una invitación caducada (fecha simulada) o ya usada. [Se rechaza.]
   - Buscar `/signup` o `/register`. [404.]
4. **Baja, reactivación y reinicios (Historia 3)**:
   - Con el Lector con sesión abierta, el Dueño lo da de baja. [En la siguiente acción, en menos
     de 1 min, el Lector sale y no puede volver a entrar; llega el aviso.]
   - Reactivarlo. [Entra con sus mismas credenciales y su mismo TOTP.]
   - El Administrador intenta cualquier acción sobre el Dueño u otro Administrador. [Rechazado.]
   - Forzar el reinicio del 2FA de un Lector. [Sesiones cerradas; en su siguiente acceso debe
     registrar un TOTP nuevo.]
5. **Recuperación de contraseña (Historia 4)**:
   - Solicitarla con un correo válido y con uno inexistente. [Mismo mensaje; solo llega un
     correo.]
   - Usar el enlace. [Contraseña cambiada, sesiones cerradas, se sigue pidiendo TOTP.]
6. **Bitácora (Historia 5)**:
   - El Dueño filtra por usuario y fechas. [Ve todos los eventos anteriores.]
   - El Administrador abre la bitácora. [No ve ningún evento del Dueño ni de otros
     Administradores.]
   - Intentar un `update` o `delete` sobre `audit_events` (pgTAP, incluso como `service_role`).
     [Error.]
7. **Sin secretos y con cabeceras de seguridad**:
   - `git ls-files | grep -i env` [solo `.env.example`].
   - `curl -sI https://op.nexoru.ai/login` [incluye `Strict-Transport-Security`,
     `Content-Security-Policy` con `'nonce-…'`, `'strict-dynamic'` y `frame-ancestors 'none'`,
     **sin** `'unsafe-eval'` ni `'unsafe-inline'` en `script-src`; `X-Content-Type-Options: nosniff`
     y `Referrer-Policy`].
   - **IP no falsificable (SC-011), solo en producción**: intenta iniciar sesión en
     `https://op.nexoru.ai/login` con un correo ficticio (`prueba@example.test`) enviando
     encabezados falsos, por ejemplo con la extensión "ModHeader" del navegador:
     `X-Forwarded-For: 203.0.113.9` y `x-vercel-forwarded-for: 203.0.113.9`. [En la bitácora, el
     `sign_in_failed` de ese intento muestra tu IP real, no `203.0.113.9`.]
   - Buscar en `audit_events` y en los logs cualquier contraseña o código de prueba. [0
     coincidencias.]
