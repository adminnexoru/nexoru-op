# Research: Acceso seguro del Dueño y puesta en marcha local

**Feature**: `001-user-access` | **Fecha**: 2026-09-26 · **Redefinida**: 2026-09-28

La redefinición del 2026-09-28 (constitución v2.0.0) convierte Nexoru Op en un dashboard local, de
solo lectura y para un solo usuario. Las decisiones de nube, costos y correo de la versión
anterior (hosting en Vercel, Supabase Pro, Resend, invitaciones de 7 días) quedan en el historial
de git y en el backlog (B-006). Esta es la investigación vigente.

---

## R1. Ejecución local

**Decision**: Nexoru Op corre en la máquina del Dueño con `next start` escuchando **solo en
`127.0.0.1`**, sin despliegue en la nube (principio III, FR-033).

**Rationale**: es una herramienta de un solo usuario que lee archivos de su propia máquina
(`PROJECTS_ROOT`); ponerla en la nube obligaría a subir o sincronizar esos archivos y añadiría
costo. Escuchar solo en `127.0.0.1` impide el acceso desde la red local.

**Alternatives considered**: despliegue en Vercel con Supabase Pro (B-006, ~65 USD/mes); escuchar
en `0.0.0.0` (expondría el dashboard en la red).

**Puertos de Docker (2026-09-28)**: Supabase local publica sus puertos en todas las interfaces
(`0.0.0.0`), así que la base de datos (con usuario `postgres`/`postgres`) y Studio (sin
autenticación) quedaban accesibles desde la red local. Se corrige para todo Docker con
`/etc/docker/daemon.json` → `{"ip": "127.0.0.1"}`, y se comprueba con `ss -ltn`. Los servidores
de Next.js (`dev`, `start`, Playwright y `op:start`) usan `-H 127.0.0.1`, y las URL de la app son
`http://127.0.0.1:<puerto>` (con `localhost` el navegador podría intentar `::1`).

---

## R2. Supabase local para Auth y datos

**Decision**: Supabase local (Docker, Supabase CLI) para Postgres y Auth, con MFA TOTP, RLS y el
Custom Access Token Hook, igual que en la versión anterior. La base guarda solo la cuenta, la
bitácora y, en features posteriores, un **índice regenerable** del portafolio (principio XI).

**Rationale**: reutiliza todo lo construido y probado en US1 (auth con 2FA, RLS, bitácora) sin
costo. Supabase local incluye `timebox` de sesión y los hooks que en la nube eran de pago.

**Alternatives considered**: SQLite con autenticación propia (habría que reescribir y volver a
probar toda la seguridad de US1).

---

## R3. Sin envío de correo

**Decision**: se elimina todo envío de correo: `nodemailer`, `src/lib/email/`, las variables
`SMTP_*` y `EMAIL_FROM`, el evento `email_failed`, la columna `profiles.last_lock_notice_at` y
los avisos `notice_*` (principio XII, FR-032).

**Consecuencias**:

- La activación del Dueño se hace con un enlace mostrado en la terminal (R4).
- El bloqueo y el uso de códigos de recuperación quedan solo en la bitácora.
- La contraseña olvidada se recupera con un procedimiento local (quickstart), no por correo.

---

## R4. Activación del Dueño sin correo

**Decision**: `npm run bootstrap:owner`, en la terminal integrada de VS Code, crea una invitación
de rol Dueño con un token aleatorio de 32 bytes (en la base solo su hash SHA-256), caducidad de
**1 hora**, y **muestra el enlace** `http://127.0.0.1:<puerto>/invite/<token>` en la terminal. En
esa página el Dueño define su contraseña (12+ caracteres y HIBP) y registra su app autenticadora.
Si la cuenta ya existe, no hace nada; si había un enlace pendiente, lo revoca y emite uno nuevo.

**Rationale**:

- **Más simple**: reutiliza la tabla `invitations`, `invitation_for_token`, `accept_invitation` y
  la página `/invite/[token]`, ya construidas y probadas.
- **Más seguro**: la contraseña no pasa por la terminal (no queda en el historial ni en
  scrollback) y se valida igual que el resto de contraseñas. El enlace es de un solo uso y caduca
  en 1 hora.

**Alternatives considered**: pedir la contraseña en la terminal y crear la cuenta directamente
(más código nuevo, validación duplicada y riesgo de que la contraseña quede en el historial).

---

## R5. Bloqueo tras 5 intentos fallidos (por correo + IP)

**Decision**:

- El inicio de sesión se hace mediante **server actions** que, antes de intentar autenticar,
  consultan la tabla `auth_attempts`, cuya clave es la combinación **correo + IP**.
  - Registran cada fallo (contraseña, TOTP o código de recuperación) en esa combinación.
  - Al 5.º fallo consecutivo rechazan los intentos de ese correo **desde esa IP** durante
    15 min. Las demás IP no se ven afectadas.
  - El conteo se hace también para correos que no existen, y el mensaje es siempre el mismo
    ("Demasiados intentos. Espera unos minutos e inténtalo de nuevo."), exista o no la cuenta
    (FR-006).
- **IP confiable (2026-09-28)**: la IP se toma **solo** de `x-vercel-forwarded-for`, que fija
  Vercel. Según la documentación de Vercel ("Request headers"), Vercel reescribe
  `X-Forwarded-For` para impedir la suplantación, y `x-vercel-forwarded-for` es idéntico pero
  además no se pisa aunque haya otro proxy delante. `X-Forwarded-For` y `x-real-ip` se ignoran
  siempre: son los que un cliente intentaría falsificar.
- **Sin IP confiable**:
  - En producción (`VERCEL=1`), `getClientIp()` devuelve `null`. El intento se rechaza con el
    mensaje genérico, sin llegar a Supabase Auth, y se registra como `sign_in_failed` con
    `{ reason: "untrusted_ip" }`.
  - Solo en local (fuera de Vercel) se usa la IP de respaldo **`0.0.0.0`**, con un aviso en el
    log. En local las pruebas simulan el encabezado de Vercel.
- **Uso local (2026-09-28, redefinición)**: Nexoru Op corre en la máquina del Dueño, fuera de
  Vercel, y escucha solo en `127.0.0.1`. Todas las peticiones reales llegan sin
  `x-vercel-forwarded-for`, así que se cuentan con la IP de respaldo `0.0.0.0` y el bloqueo actúa
  en la práctica por correo. El mecanismo por correo + IP se conserva: está construido y probado,
  y protege igual frente a un proceso local que intente adivinar la contraseña. Un proceso local
  podría enviar ese encabezado para cambiar de contador, pero ya tendría acceso a la máquina.
- El **Custom Access Token Hook** (disponible en Free y Pro) se niega a emitir tokens a cuentas
  dadas de baja o a sesiones inactivas. No aplica el bloqueo, porque no conoce la IP de la
  petición: el bloqueo vive en las server actions.

**Rationale**:

- **Correo + IP y no solo cuenta**: el correo del Dueño (`admin@nexoru.ai`) es público. Con un
  bloqueo por cuenta, cualquiera podría dejarlo fuera fallando 5 veces cada 15 min.
- Los hooks nativos de "Password Verification" y "MFA Verification Attempt", que permitirían
  contar fallos dentro del propio servidor de Auth, solo existen en Team (599 USD/mes).

**Alternatives considered**: bloqueo por cuenta (rechazado por lo anterior) y bloqueo solo por
IP (no protege una cuenta concreta frente a un atacante con pocas IP).

**Riesgos residuales aceptados**:

1. **Atacante con muchas IP**: cada IP tiene su propio contador, así que puede hacer más
   intentos en total.
2. **Llamadas directas al servidor de Auth**: la clave pública (publishable key) permite llamar
   a Supabase Auth sin pasar por la app. Esos intentos no incrementan el contador de la app ni
   aparecen en la bitácora de Nexoru Op; quedan en los logs de Auth de Supabase.

Ambos se mitigan con:

- Los límites de velocidad por IP de Supabase Auth, configurados a la baja (ver quickstart).
- El segundo factor obligatorio: acertar la contraseña no da acceso a datos, porque toda RLS
  exige AAL2.

Revisar si Nexoru pasa algún día a Team.

---

## R6. Cierre por inactividad (30 min) y duración máxima (12 h)

**Decision**:

- **12 h**: `[auth.sessions] timebox = "12h"` en `supabase/config.toml`, aplicado por el servidor
  de Auth local.
- **30 min de inactividad**:
  - Tabla `app_sessions` con `last_activity_at` por sesión (el `session_id` viene del JWT).
    `proxy.ts` llama a `check_session` en cada petición autenticada. La función devuelve
    `ok`, `idle`, `max_age` o `inactive_user` y actualiza la actividad como máximo una vez por
    minuto. La misma llamada detecta las 12 h (para registrar `session_expired` con
    `max_age`) y una cuenta inactiva.
  - El Custom Access Token Hook rechaza el refresco si han pasado más de 30 min desde la última
    actividad.
  - Con una **caducidad del JWT de 5 min**, una sesión inactiva queda inutilizable como mucho
    5 min después del límite, aunque el cliente haya sido manipulado.
  - Un temporizador en el cliente (actividad en cualquier pestaña mediante `BroadcastChannel`)
    cierra la sesión al llegar a los 30 min, para que el usuario lo vea en el momento.

**Rationale**: el "inactivity timeout" de Supabase mide cuándo se refrescó el token, no la
actividad del usuario. El cliente de Supabase refresca en segundo plano aunque nadie toque la
pantalla, así que no cumple FR-007 por sí solo.

---

## R7. Códigos de recuperación del segundo factor

**Decision**:

- Al registrar el TOTP se generan 10 códigos aleatorios (10 caracteres, alfabeto sin
  ambigüedades). Se muestran una vez y se guardan solo como hash (`crypt()` de pgcrypto con
  bcrypt).
- Para usar uno, el usuario tiene la sesión en AAL1 (contraseña correcta) e introduce el código.
- El servidor lo verifica y en la misma operación **invalida todos los códigos** del usuario.
  Después elimina los factores TOTP con la Admin API (`auth.admin.mfa.deleteFactor`) y lo
  redirige a registrar un autenticador nuevo antes de dar acceso. Al confirmarlo se genera un
  juego nuevo de 10 códigos (FR-003a). Invalidarlos todos en el momento del uso evita que los 9
  restantes sigan valiendo mientras se registra el autenticador nuevo.
- Sin aviso por correo (principio XII): el evento queda en la bitácora.

**Rationale**: Supabase MFA no tiene códigos de recuperación nativos. Su documentación recomienda
implementarlos por cuenta propia o registrar un segundo factor.

---

## R8. Dónde se aplican los permisos

**Decision**: toda mutación sobre la cuenta, la activación y la bitácora pasa por **funciones SQL
`security definer`** (`search_path = ''`) invocadas con el JWT del usuario. Cada función:

1. Comprueba `auth.uid()`, AAL2, estado activo y la matriz de permisos
   ([contracts/permissions.md](contracts/permissions.md)).
2. Aplica el cambio.
3. Inserta el evento de auditoría **en la misma transacción**.

Las operaciones que solo existen en la Admin API de Auth (banear, borrar factores, crear usuario)
las hace después el servidor con la clave secreta de Supabase (`SUPABASE_SECRET_KEY`, rol
`service_role`), que solo existe en el servidor.

**Rationale**:

- Los permisos (y que ninguna acción quede sin auditar) quedan garantizados por la base de datos,
  aunque la app tenga un error.
- Las políticas RLS verifican además, en cada consulta, el estado activo y el rol leídos de la
  tabla `profiles` (no del JWT).
- Con un solo usuario, la matriz de permisos por rol (`can_manage`, `can_assign`) y la
  visibilidad por rol de la bitácora ya construidas se conservan sin cambios: están probadas y
  no estorban. Se retoman con B-003.

**Alternatives considered**: comprobar permisos solo en TypeScript con la clave secreta. Se
rechaza porque un error en la app se saltaría RLS por completo.

---

## R9. Contraseñas comprometidas y longitud mínima

**Decision**:

- En Supabase Auth local: longitud mínima de 12 (`minimum_password_length`).
- En la app: la misma longitud y la consulta k-anonymity a la API pública gratuita de Have I Been
  Pwned (solo salen los 5 primeros caracteres del hash SHA-1) antes de crear la cuenta en la
  activación, porque `admin.createUser` no aplica esa comprobación.
- Es una consulta de red de solo lectura, permitida por el principio XII. Si HIBP no responde, la
  validación falla abierta (solo se exige la longitud) y queda un aviso en el log.

---

## R10. Pruebas y CI

**Decision**:

- **Vitest** para lógica pura: matriz de permisos, validación de contraseñas, formato de
  códigos, cálculo de inactividad.
- **pgTAP** mediante `supabase test db` para las políticas RLS y las funciones SQL. Es la forma
  de probar el principio I directamente en la base de datos.
- **Playwright** para los flujos críticos contra la instancia **de pruebas** de Supabase local,
  generando códigos TOTP con `otplib`. La activación se prueba ejecutando el script real
  `bootstrap:owner` y leyendo el enlace que imprime (sin Mailpit).
- **GitHub Actions**: lint, typecheck, Vitest, `supabase start`, pgTAP y Playwright. Se dispara
  con `push` **y** `pull_request` hacia `main`, como exige la verificación 3.1 del estándar
  (`nexoru-governance/standard/conformance.md`).

**Costo**: 0 USD. El repo es público (R11), así que los minutos de Actions son ilimitados. Si
volviera a ser privado: 2.000 min/mes en GitHub Free, unas 250 ejecuciones de ~8 min.

---

## R11. Protección de la rama main

**Hallazgo original**: en GitHub Free, la protección de ramas y los rulesets no existen para
repos privados.

**Decision (2026-09-26)**: el Dueño hizo **público** el repositorio **por costo**: con un repo
público, los rulesets de GitHub son gratuitos y `main` se protege con uno que exige PR y el
check de CI (ruleset creado en T011; el check se exige desde T082), sin pagar GitHub Pro (4 USD/mes).

**Revisión obligatoria**: la decisión se revisará si Nexoru Op llegara a manejar datos de
clientes. Con la redefinición, el repo no guarda datos del portafolio: el dashboard los lee en
local y la base solo tiene la cuenta, la bitácora y un índice regenerable. El criterio de
`nexoru-governance/standard/repo-visibility.md` (tipo `interno`, sin datos sensibles) permite que
sea público.

**Consecuencias y medidas** (riesgo aceptado por el Dueño):

- Cualquiera puede leer el código, las specs, la constitución y el diseño de seguridad. La
  constitución v2.0.0 retiró el número comercial de WhatsApp y la lista de productos, aunque
  siguen en el historial de git. La seguridad no depende de que el
  diseño sea secreto, pero conviene tenerlo presente.
- **Secret scanning y Push protection** de GitHub (gratuitos en repos públicos) quedan
  activados: GitHub avisa si detecta una llave en el repo y **rechaza el push** que la contenga.
  Es una segunda barrera; la primera sigue siendo el principio II y el `.gitignore`.
- `CLAUDE.md` prohíbe subir datos reales de clientes, correos personales o capturas del sistema.
  Las pruebas y los seeds usan solo datos ficticios.
- GitHub Actions es gratuito e ilimitado en repos públicos.

---

## R12. Cabeceras de seguridad HTTP

**Decision (revisada el 2026-09-28)**:

- **CSP con nonce, generada en `src/proxy.ts`** para cada petición de página. Next.js aplica el
  nonce a sus propios scripts y estilos en línea. Por eso las páginas se renderizan de forma
  dinámica (el layout raíz llama a `connection()`).
- **Sin `'unsafe-eval'` ni `'unsafe-inline'` en `script-src`, en ningún entorno.** La guía de
  Next.js indica que React usa `eval` solo en desarrollo para mejorar las trazas de error. Sin él
  se pierde ese detalle en `next dev`, pero la app funciona.

| Cabecera | Valor | Dónde |
|----------|-------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'nonce-<n>'; img-src 'self' data:; font-src 'self'; connect-src 'self' <NEXT_PUBLIC_SUPABASE_URL>; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | `proxy.ts`, en cada respuesta que pasa por el proxy (páginas y redirecciones) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | `next.config.ts` (todas las rutas) y `proxy.ts` (redirecciones). En local, sobre `http://127.0.0.1`, el navegador la ignora; se conserva por si algún día hubiera despliegue con HTTPS |
| `X-Content-Type-Options` | `nosniff` | ídem |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ídem |

**Qué permite la CSP y por qué**:

- `img-src data:`: el QR del TOTP que devuelve Supabase (`mfa.enroll`) es una imagen `data:`.
- `connect-src` con la URL de Supabase local de cada entorno: el cliente de Supabase en el
  navegador.
- `frame-ancestors 'none'`: impide incrustar la app en un iframe (clickjacking).
- `form-action 'self'`: los formularios solo envían a la propia app.

**Verificado en la implementación (2026-09-28)**:

- Con el build de producción, las 14 E2E recorren todos los flujos de US1 y no registran ninguna
  violación de CSP en la consola.
- En `next dev`, la app funciona sin `'unsafe-eval'`. Las únicas violaciones vienen de
  `next-devtools`, el panel de ayuda que Next.js inyecta solo en desarrollo: pierde parte de sus
  estilos, sin efecto en la app. No se relaja la política por ello.
- Por la misma razón (estilos en atributos `style`, bloqueados sin `'unsafe-inline'`), el campo
  del código TOTP usa un `Input` normal en lugar del componente `input-otp`, y no se monta
  `sonner`.

**Alternatives considered**: CSP estática en `next.config.ts` con `'unsafe-inline'`. Se
descartó el 2026-09-28 por pedido del Dueño: con nonce, un script inyectado no se ejecuta.

---

## R13. Entornos de uso y de pruebas separados

**Decision**: dos instancias de Supabase local, con `project_id` y puertos distintos:

| Entorno | Carpeta de Supabase | `project_id` | Puertos (API / DB / Studio) | Variables | Uso |
|---------|--------------------|--------------|-----------------------------|-----------|-----|
| Pruebas y desarrollo | `supabase/` | `nexoru-op` | 54321 / 54322 / 54323 | `.env.local` | `npm test`, `db:test`, `test:e2e`, `npm run dev` (app en `http://127.0.0.1:3000`) |
| Uso del Dueño | `ops/supabase/` (migraciones enlazadas a `supabase/migrations/`) | `nexoru-op-live` | 55321 / 55322 / 55323 | `.env.op.local` | `op:start`, `op:stop`, `op:bootstrap-owner` |

**Salvaguardas** (FR-034, SC-012):

1. Los helpers de pruebas (`tests/e2e/helpers/db.ts`) y la configuración de Playwright se niegan
   a correr si la URL de Supabase no es la de pruebas (puerto 54321).
2. Una prueba unitaria revisa que ningún script de prueba de `package.json` ni archivo de
   `tests/` use el puerto, la carpeta o el archivo de variables del entorno de uso.
3. Una prueba de integración arranca con datos marcados en el entorno de uso (si está en marcha),
   ejecuta la limpieza de pruebas y comprueba que esos datos no cambian.
4. Los scripts `op:*` exigen `.env.op.local` y se niegan a correr con las variables de pruebas.

**Rationale**: `resetAppData()` borra usuarios y datos; si apuntara al entorno de uso, borraría la
cuenta del Dueño. Dos instancias separadas con salvaguardas en ambos sentidos lo hacen imposible
por construcción.

**Riesgo aceptado**: las dos pilas de Supabase a la vez consumen unos 2–3 GB de memoria cada
una. Se puede detener la de pruebas cuando no se usa (`npx supabase stop`).

**Alternatives considered**: una sola instancia con esquemas separados (una limpieza mal
dirigida seguiría pudiendo tocar la cuenta del Dueño).

---

## R14. `op:start` y `op:stop`

**Decision**:

- `op:start`: arranca la instancia de uso (`supabase start --workdir ops`), aplica migraciones
  pendientes, construye la app en un directorio propio (`distDir` `.next-op`, para no chocar con
  el build de pruebas) y la sirve con `next start -H 127.0.0.1 -p 3200` usando `.env.op.local`.
  Si el puerto está ocupado, falla con un mensaje claro.
- `op:stop`: detiene la app y la instancia de uso (`supabase stop --workdir ops`), sin borrar
  datos (sin `--no-backup`).
- **Opcionales, baja prioridad**: `op:backup` y `op:restore` (volcado y restauración de la base de
  uso). Como la base ya no guarda datos de proyectos, solo protegen la cuenta y la bitácora.

---

## Resumen de costos

| Concepto | Proveedor | Costo/mes |
|----------|-----------|-----------|
| App y base de datos | Local (Next.js + Supabase en Docker) | 0 USD |
| Comprobación de contraseñas filtradas | Have I Been Pwned (API pública) | 0 USD |
| Repo y CI | GitHub Free, repo público + Actions | 0 USD |
| **Total** | | **0 USD/mes** |
