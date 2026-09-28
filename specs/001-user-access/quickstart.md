# Quickstart: Acceso seguro del Dueño y puesta en marcha local

**Feature**: `001-user-access` | **Fecha**: 2026-09-26 · **Redefinido**: 2026-09-28

Dos partes:

1. **Puesta en marcha local**: lo que hace el Dueño para usar Nexoru Op a diario en su máquina
   (entorno de **uso**).
2. **Validación**: cómo se prueba la feature (entorno de **pruebas**, separado del de uso).

> **Reglas**
> - Todos los comandos se ejecutan en la **terminal integrada de VS Code**.
> - Ningún valor secreto se pega en el chat ni en un archivo versionado: solo en `.env.local`
>   (pruebas) o `.env.op.local` (uso), ambos ignorados por git.
> - Los scripts `op:*` solo tocan el entorno de uso; los de pruebas nunca lo tocan (research R13).

| Entorno | Supabase | App | Variables |
|---------|----------|-----|-----------|
| Uso | `ops/supabase/`, API en `127.0.0.1:55321`, Studio en `127.0.0.1:55323` | `http://127.0.0.1:3200` | `.env.op.local` |
| Pruebas y desarrollo | `supabase/`, API en `127.0.0.1:54321`, Studio en `127.0.0.1:54323` | `http://127.0.0.1:3000` | `.env.local` |

---

## Parte 1 — Puesta en marcha local (Dueño)

### 1. Requisitos (una vez)

- **Node.js 24** con nvm (`nvm use 24`) y **Docker** en marcha (`docker run --rm hello-world`).
- `npm ci` en la raíz del repo.

### 1b. Docker solo en local (una vez)

Docker publica por defecto los puertos en todas las interfaces de red, y dejaría la base de datos
(usuario `postgres`/`postgres`) y Supabase Studio (sin contraseña) accesibles desde la red local.
Para que todo lo que publica Docker escuche solo en `127.0.0.1` (FR-033):

1. Detén Supabase si está en marcha: `npx supabase stop` (y `npx supabase stop --workdir ops`).
2. Crea o edita `/etc/docker/daemon.json` con `{"ip": "127.0.0.1"}` (si el archivo ya existe,
   añade esa clave sin borrar las demás).
3. Reinicia Docker: `sudo systemctl restart docker`.
4. Arranca Supabase y comprueba con `ss -ltn` que los puertos 54321–54323 (y 55321–55323 del
   entorno de uso) aparecen como `127.0.0.1:<puerto>` y nunca como `0.0.0.0:<puerto>` ni `*:<puerto>`.

### 2. Variables del entorno de uso (una vez)

1. Arranca la instancia de uso: `npx supabase start --workdir ops`.
2. Muestra sus datos: `npx supabase status --workdir ops`.
3. Crea `.env.op.local` a partir de `.env.example` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL`: la **API URL** (`http://127.0.0.1:55321`).
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la **Publishable key**.
   - `SUPABASE_SECRET_KEY`: la **Secret key**.
   - `APP_URL`: `http://127.0.0.1:3200`.
4. No hace falta ningún dato de correo: Nexoru Op no envía correos.

### 3. Arrancar y detener

```bash
npm run op:start    # instancia de uso + app en http://127.0.0.1:3200
npm run op:stop     # detiene ambas, sin borrar datos
```

`op:start` se niega a correr si falta `.env.op.local` o si apunta a la instancia de pruebas, y
falla con un mensaje claro si el puerto 3200 está ocupado. La app escucha solo en `127.0.0.1`:
no es accesible desde otras máquinas de la red.

### 4. Activar la cuenta del Dueño (una vez)

```bash
npm run op:bootstrap-owner
```

La terminal muestra un **enlace de activación de un solo uso** que caduca en 1 hora
(`http://127.0.0.1:3200/invite/...`). Ábrelo en el navegador, define tu contraseña (12 o más
caracteres; se comprueba que no esté filtrada), escanea el QR con tu app autenticadora y
**guarda los 10 códigos de recuperación fuera del teléfono** (gestor de contraseñas o papel).

- Si el enlace caducó, vuelve a ejecutar el comando: revoca el anterior y emite uno nuevo.
- Si la cuenta ya está activa, el comando no hace nada y lo indica.

### 5. Procedimiento manual: perdiste el autenticador y los códigos

1. Con el entorno de uso en marcha, abre Supabase Studio local: `http://127.0.0.1:55323`.
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
4. Inicia sesión en `http://127.0.0.1:3200`: sin factores registrados, pedirá registrar un
   autenticador nuevo y dará códigos nuevos.

### 6. Procedimiento manual: olvidaste la contraseña

La recuperación por correo no existe (principio XII; queda en el backlog, B-005).

1. Genera en tu gestor de contraseñas una contraseña aleatoria de **20 o más caracteres**. Este
   camino no pasa por la comprobación de contraseñas filtradas de la app.
2. En Supabase Studio local (`http://127.0.0.1:55323`) → **SQL Editor**, en una consulta nueva:
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
3. **Borra de inmediato la consulta** del historial y de los snippets del SQL Editor: es el único
   lugar donde la contraseña queda en claro.
4. Inicia sesión con la contraseña nueva y tu código TOTP, que sigue siendo obligatorio.

### 7. Consultar la bitácora

La pantalla de la bitácora está en el backlog (B-007). Con el entorno de uso en marcha, abre
Supabase Studio (`http://127.0.0.1:55323`) → **SQL Editor** y usa consultas de solo lectura
(FR-038):

```sql
-- Últimos 50 eventos, del más reciente al más antiguo.
select occurred_at, action, result, attempted_email, host(ip) as ip, metadata
from public.audit_events
order by occurred_at desc, id desc
limit 50;

-- Filtrar por tipo de evento y rango de fechas.
select occurred_at, action, result, attempted_email, host(ip) as ip, metadata
from public.audit_events
where action in ('sign_in_failed', 'account_locked')
  and occurred_at between '2026-10-01' and '2026-10-31'
order by occurred_at desc, id desc;
```

La base impide modificar o borrar eventos, aunque se intente desde Studio.

### 8. GitHub

- **Protección de `main`**: el ruleset `main` exige PR, bloquea el borrado y el force push, y
  debe exigir que pase el check de CI. En **Settings → Rules → Rulesets → main**, activa
  *Require status checks to pass*, añade `lint, types, unit, db and e2e tests` y pulsa **Save
  changes** al final de la página.
- **Secret scanning y Push protection**: activados.
- **Actions** no necesita ningún secreto: CI usa Supabase local.

### 9. Respaldo (opcional, baja prioridad)

`npm run op:backup` y `npm run op:restore` (si se implementan) vuelcan y restauran la base de uso.
La base solo guarda la cuenta y la bitácora; los datos del portafolio se leen siempre de los
proyectos.

---

## Parte 2 — Validación (entorno de pruebas)

### Requisitos

Node.js 24, npm, Docker (configurado solo en local, Parte 1 §1b) y Supabase CLI (dependencia de
desarrollo).

### Arranque

```bash
npm ci
npx supabase start              # instancia de PRUEBAS (54321)
npx supabase db reset           # aplica migraciones + seed
cp .env.example .env.local      # rellena con los valores de `npx supabase status`
npm run dev                     # http://127.0.0.1:3000 (solo local)
npm run bootstrap:owner         # muestra el enlace de activación (pruebas)
```

### Pruebas automáticas

| Comando | Qué valida |
|---------|------------|
| `npm run lint && npm run typecheck` | Estilo y tipos |
| `npm test` | Vitest: permisos, contraseñas, IP, códigos, inactividad y aislamiento de entornos |
| `npm run db:test` | pgTAP: RLS en todas las tablas, bitácora inmutable, bloqueo, hook, códigos, activación |
| `npm run test:e2e` | Playwright: flujos de abajo |

Las cuatro corren en GitHub Actions en cada push y cada pull request a `main`. **Ningún merge a
`main` sin verde** (principio VI).

### Escenarios de validación

1. **Activación y 2FA (US1)**: `bootstrap:owner` muestra el enlace → definir contraseña →
   registrar TOTP. [Se muestran 10 códigos y se entra a `/`.] Cerrar sesión y volver a entrar con
   contraseña y TOTP.
2. **Código TOTP incorrecto**: [No entra; aparece `sign_in_failed` en la bitácora.]
3. **Bloqueo**: 5 fallos desde la misma IP. [Mensaje genérico, idéntico con un correo
   inexistente; el 6.º intento se rechaza aunque sea correcto durante 15 min. Desde otra IP
   simulada, el Dueño entra (SC-010).]
4. **IP falsificada (SC-011)**: un `X-Forwarded-For` falso distinto en cada intento no cambia la
   pareja correo + IP ni la IP registrada.
5. **Inactividad y 12 h**: 31 min sin actividad → `/login?reason=idle`; sesión de más de 12 h →
   `/login?reason=max_age`.
6. **Código de recuperación**: [Obliga a registrar un autenticador nuevo; los demás códigos dejan
   de servir; no se envía ningún correo.]
7. **Bitácora desde Studio (FR-038)**: con las consultas de la Parte 1 §7. [Se ven los eventos
   anteriores, del más reciente al más antiguo; un `update` o `delete` sobre `audit_events`
   falla.]
8. **Aislamiento de entornos (SC-012)**: con el entorno de uso en marcha y la cuenta del Dueño
   activa, ejecutar `npm test`, `npm run db:test` y `npm run test:e2e`. [La cuenta, los códigos
   y la bitácora del entorno de uso no cambian.] Apuntar `.env.local` al puerto 55321 y ejecutar
   `npm run test:e2e`. [Se niega a correr.]
9. **Solo en local (FR-033)**: `ss -ltn` muestra los puertos de la app (3000 y 3200), de la base
   de datos (54322, 55322) y de Studio (54323, 55323) solo en `127.0.0.1`. Desde otra máquina de
   la red, `http://<ip-de-la-máquina>:3200` y `:55323` no responden.
10. **Sin secretos y con cabeceras**: `git ls-files | grep -i env` [solo `.env.example`];
    `curl -sI http://127.0.0.1:3200/login` [CSP con `'nonce-…'` y `'strict-dynamic'`, sin
    `'unsafe-eval'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy`].
11. **Procedimientos manuales (FR-037)**: en el entorno de uso, seguir la Parte 1 §5 (autenticador
    y códigos perdidos) y §6 (contraseña olvidada). [En ambos casos se recupera el acceso y la
    bitácora registra `mfa_reset_forced` o `password_changed` con `via: panel`.]
