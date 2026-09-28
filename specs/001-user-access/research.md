# Research: Acceso seguro y administración de usuarios

**Feature**: `001-user-access` | **Fecha**: 2026-09-26

Precios consultados el 2026-09-26 en las páginas oficiales de cada proveedor (USD, sin impuestos).
Revisarlos antes de contratar.

---

## R1. Hosting de la app Next.js: Vercel Pro vs Cloudflare Workers

**Decision**: **Vercel Pro — 20 USD/mes** (1 asiento de despliegue, incluye 20 USD de crédito de uso).

**Rationale**:

- Vercel Hobby no permite uso comercial, así que las opciones reales son Vercel Pro y Cloudflare.
- La seguridad de esta feature depende de `proxy.ts` (antes `middleware.ts`): refresca la sesión
  de Supabase, exige 2FA completo (AAL2) antes de cualquier pantalla interna y aplica la
  inactividad. En Next.js 16, `proxy.ts` solo corre en runtime Node.js, y el soporte de "Node
  middleware" en `@opennextjs/cloudflare` es **experimental** y con incidencias abiertas a
  septiembre de 2026. Una feature de seguridad no debe apoyarse en un adaptador experimental.
- Vercel ejecuta Next.js de forma nativa (mismo fabricante) y sin adaptador.
- El asiento de 20 USD cubre **todos los proyectos** del equipo: los demás productos de Nexoru
  (Ganador, ABE, app.nexoru.ai) pueden vivir en el mismo equipo sin coste de hosting adicional
  mientras el uso quepa en el crédito incluido (1 TB de transferencia y 10 M de edge requests no
  consumen crédito).

**Alternatives considered**:

| Opción | Costo/mes | Por qué no |
|--------|-----------|------------|
| Vercel Hobby | 0 | Prohíbe uso comercial. |
| Cloudflare Workers Free | 0 | Límite de 10 ms de CPU por petición (el SSR de Next.js lo supera con facilidad) y 3 MiB de bundle comprimido; más el riesgo de `proxy.ts` descrito arriba. |
| Cloudflare Workers Paid + OpenNext | 5 | Opción más barata viable. Rechazada **por ahora** por el soporte experimental de `proxy.ts`. Alternativa: usar el `middleware.ts` en edge runtime, que está obsoleto en Next.js 16. **Revisar cuando OpenNext declare estable el soporte de Node middleware**: el ahorro sería de 15 USD/mes. |

---

## R2. Base de datos y Auth: Supabase Free, proyecto compartido o Supabase Pro

**Decision**: **Supabase Pro — 25 USD/mes por organización**, con un **proyecto por producto**.
Nexoru Op es el primer proyecto y queda cubierto por el crédito de cómputo incluido. Cada
producto adicional suma **~10 USD/mes** (instancia Micro).

**Rationale**:

- Pro incluye, sin código propio, tres controles que la spec exige y que Free no tiene:
  - **Protección de contraseñas filtradas** (FR-004).
  - **Límite de duración de sesión** (time-box a 12 h, FR-007), aplicado por el propio servidor de
    Auth, así que no se puede eludir desde el cliente.
  - Sin **pausa por inactividad**. Un sistema que usa una sola persona puede pasar una semana sin
    tráfico, y en Free el proyecto se pausaría.
- Pro incluye **backups diarios** (7 días). Sin backups, la bitácora de auditoría y los usuarios
  no se podrían recuperar ante un error.
- **Un proyecto por producto** mantiene aislados los usuarios, datos y RLS de cada producto y
  permite migrar un producto al dominio del cliente sin separar datos compartidos (ciclo de vida
  de la constitución).

**Alternatives considered**:

| Opción | Costo/mes | Por qué no |
|--------|-----------|------------|
| Supabase Free, un proyecto para Op | 0 | Solo 2 proyectos activos en toda la cuenta (probablemente ya ocupados por otros productos), pausa tras 7 días sin actividad, sin backups, sin protección de contraseñas filtradas ni límite de sesión. |
| Un proyecto (Free o Pro) compartido por todos los productos | 0 / 25 | Un único conjunto de usuarios de Auth para todos los productos: una fuga o un error de RLS en un producto expone a los demás (principio I). Migrar un producto al dominio del cliente obligaría a extraer sus datos del proyecto común. |
| Supabase Team | 599 | Solo añadiría los hooks de verificación de contraseña y MFA (ver R5). No se justifica. |

**Costo proyectado de Supabase según el número de productos**: 1 → 25 · 2 → 35 · 3 → 45 · 4 → 55 USD/mes.

---

## R3. Envío de correo desde nexoru.ai

**Decision**: **Resend, plan gratuito (0 USD/mes)**, por SMTP. El remitente es
`Nexoru Op <no-reply@nexoru.ai>` y el dominio `nexoru.ai` se verifica en Resend con DKIM y SPF.

**Rationale**:

- Es compatible con Supabase Auth como SMTP personalizado (disponible en todos los planes). Así
  Supabase envía los correos de recuperación desde nexoru.ai.
- La app usa el **mismo SMTP** para invitaciones y avisos de seguridad: una sola forma de enviar
  en toda la app. En local y en CI se apunta al Mailpit que trae Supabase CLI, lo que permite
  leer los correos en las pruebas E2E sin enviar nada real.
- El plan gratuito incluye 3.000 correos/mes, 100/día y 3 dominios. El volumen previsto (decenas
  al mes) queda muy por debajo, y los 3 dominios alcanzan para otros productos.
- El registro SPF/MX de Resend va en un subdominio (`send.nexoru.ai`), así que no interfiere con
  el correo actual de `admin@nexoru.ai`.

**Alternatives considered**:

| Opción | Costo/mes | Por qué no |
|--------|-----------|------------|
| SMTP integrado de Supabase | 0 | Solo envía a miembros del equipo de Supabase, con límite de pocos correos por hora. No sirve para producción. |
| Amazon SES | ~0 (0,10 USD / 1.000) | Igual de barato a este volumen, pero exige cuenta de AWS, salir del sandbox y configuración IAM. Más trabajo sin ahorro. |
| Brevo Free | 0 | 300 correos/día, pero sin ventajas sobre Resend y con una configuración de dominio más pesada. |
| Resend Pro | 20 | Innecesario a este volumen. Pasar a Pro solo si se superan 100 correos/día. |

**Límite a vigilar**: el plan gratuito corta en 100 correos al día. Para que nadie lo agote
provocando bloqueos a propósito, el aviso `notice_account_locked` se envía como mucho una vez
cada 24 h por cuenta (`profiles.last_lock_notice_at`). Si se alcanzara el límite, los correos
fallidos quedan en la bitácora como `email_failed` (FR-031b) y la salida es Resend Pro
(20 USD/mes).

---

## R4. Invitaciones con caducidad de 7 días

**Decision**: tabla propia `invitations` con token aleatorio (se guarda solo su hash SHA-256) y
caducidad de 7 días. Al aceptar, el servidor crea el usuario con la Admin API de Supabase
(`auth.admin.createUser` con `email_confirm: true`) y la contraseña que eligió la persona.

**Rationale**: el enlace de invitación nativo de Supabase (`inviteUserByEmail`) caduca según la
expiración de OTP de correo, que tiene un máximo de 24 h. No cumple los 7 días de FR-011, y
tampoco permite revocar ni reenviar con registro propio (FR-012).

**Alternatives considered**: `inviteUserByEmail` con reenvío automático diario. Es más frágil y
no permite invalidar el enlace anterior.

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
- **Verificación en producción**: la prueba de humo tras el despliegue envía un
  `X-Forwarded-For` y un `x-vercel-forwarded-for` falsos y comprueba en la bitácora que la IP
  registrada es la real (quickstart, validación 7). Si la app se moviera de Vercel, hay que
  revisar esta regla.
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

- **12 h**: la opción "Time-box user sessions" de Supabase Pro, aplicada por el servidor de Auth.
- **30 min de inactividad**:
  - Tabla `app_sessions` con `last_activity_at` por sesión (el `session_id` viene del JWT).
    `proxy.ts` llama a `check_session` en cada petición autenticada. La función devuelve
    `ok`, `idle`, `max_age` o `inactive_user` y actualiza la actividad como máximo una vez por
    minuto. La misma llamada detecta las 12 h (para registrar `session_expired` con
    `max_age`) y la baja del usuario (FR-020).
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
- El servidor lo verifica y en la misma operación **invalida todos los códigos** del usuario
  (2026-09-28). Después elimina los factores TOTP con la Admin API
  (`auth.admin.mfa.deleteFactor`), le envía el aviso por correo y lo redirige a registrar un
  autenticador nuevo antes de dar acceso. Al confirmarlo se genera un juego nuevo de 10 códigos
  (FR-003a).
- El aviso no dice cuántos quedan: dice que se usó un código y que los códigos fueron
  reemplazados por un juego nuevo. Invalidarlos todos en el momento del uso evita que los 9
  restantes sigan valiendo mientras el usuario registra su autenticador nuevo.

**Rationale**: Supabase MFA no tiene códigos de recuperación nativos. Su documentación recomienda
implementarlos por cuenta propia o registrar un segundo factor.

---

## R8. Dónde se aplican los permisos

**Decision**: toda mutación sobre usuarios, invitaciones y bitácora pasa por **funciones SQL
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
  tabla `profiles` (no del JWT). Así un cambio de rol o una baja surten efecto en la siguiente
  acción (FR-016, SC-004).
- Revocar sesiones se hace con `delete from auth.sessions` dentro de la función SQL, porque la
  Admin API solo permite cerrar sesiones a partir del JWT del propio usuario.

**Alternatives considered**: comprobar permisos solo en TypeScript con la clave secreta. Se
rechaza porque un error en la app se saltaría RLS por completo.

---

## R9. Contraseñas comprometidas y longitud mínima

**Decision**:

- En Supabase Auth: longitud mínima de 12 y protección de contraseñas filtradas (Pro), para los
  cambios que pasan por Auth.
- En la app, además: la misma validación (12 caracteres y consulta k-anonymity a la API pública
  gratuita de Have I Been Pwned: solo se envían los 5 primeros caracteres del hash SHA-1) antes de
  crear el usuario al aceptar una invitación, porque `admin.createUser` no aplica la protección
  de Supabase.

---

## R10. Pruebas y CI

**Decision**:

- **Vitest** para lógica pura: matriz de permisos, validación de contraseñas, formato de
  códigos, cálculo de inactividad.
- **pgTAP** mediante `supabase test db` para las políticas RLS y las funciones SQL. Es la forma
  de probar el principio I directamente en la base de datos.
- **Playwright** para los flujos críticos contra Supabase local (`supabase start`), generando
  códigos TOTP con `otplib` y leyendo los correos en Mailpit.
- **GitHub Actions**: lint, typecheck, Vitest, `supabase start`, pgTAP y Playwright en cada PR.

**Costo**: 0 USD. El repo es público (R11), así que los minutos de Actions son ilimitados. Si
volviera a ser privado: 2.000 min/mes en GitHub Free, unas 250 ejecuciones de ~8 min.

---

## R11. Protección de la rama main

**Hallazgo original**: en GitHub Free, la protección de ramas y los rulesets no existen para
repos privados.

**Decision (2026-09-26)**: el Dueño hizo **público** el repositorio **por costo**: con un repo
público, los rulesets de GitHub son gratuitos y `main` se protege con uno que exige PR y el
check de CI (ruleset creado en T011; el check se exige desde T065), sin pagar GitHub Pro (4 USD/mes).

**Revisión obligatoria**: esta decisión **se revisará antes de que Nexoru Op maneje datos de
clientes** (por ejemplo, con el módulo de portafolio o las integraciones). Entonces se evaluará
volver a privado con GitHub Pro, o mantenerlo público si el repo sigue sin contener nada
sensible.

**Consecuencias y medidas** (riesgo aceptado por el Dueño):

- Cualquiera puede leer el código, las specs, la constitución (con el número comercial de
  WhatsApp y `admin@nexoru.ai`) y el diseño de seguridad. La seguridad no depende de que el
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
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | `next.config.ts` (todas las rutas) y `proxy.ts` (redirecciones) |
| `X-Content-Type-Options` | `nosniff` | ídem |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ídem |

**Qué permite la CSP y por qué**:

- `img-src data:`: el QR del TOTP que devuelve Supabase (`mfa.enroll`) es una imagen `data:`.
- `connect-src` con la URL de Supabase: el cliente de Supabase en el navegador.
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

## Resumen de costos

| Concepto | Proveedor | Costo/mes |
|----------|-----------|-----------|
| Hosting de la app | Vercel Pro (1 asiento) | 20 USD |
| Postgres + Auth + backups | Supabase Pro (1 proyecto) | 25 USD |
| Correo transaccional | Resend Free (máx. 100/día) | 0 USD |
| Repo y CI | GitHub Free, repo público + Actions | 0 USD |
| Dominio y DNS | nexoru.ai (existente) | 0 USD |
| **Total recomendado** | | **45 USD/mes** |
| Alternativa más barata viable | Cloudflare Workers Paid en lugar de Vercel | 30 USD/mes (riesgo en R1) |

**Cuándo empieza el costo**: durante el desarrollo solo se usa Supabase local (Docker), así que
el costo es **0 USD**. Supabase Pro y Vercel Pro se contratan en la Fase 4 de las tareas
(despliegue del MVP). Resend Free se da de alta en la Fase 1 porque la verificación del
dominio puede tardar y no cuesta nada.

**Spend Cap de Supabase**: se deja **activado** (viene activado por defecto en Pro). Así el
costo no pasa de 25 USD: si se superan las cuotas incluidas, Supabase limita el servicio en
lugar de cobrar excedentes. Revisarlo si algún producto crece.

**Con varios productos**: Vercel sigue en 20 USD (mismo asiento) y Supabase suma ~10 USD por
producto. Con 4 productos: 20 + 55 = **75 USD/mes**.
