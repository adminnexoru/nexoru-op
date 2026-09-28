# Backlog de Nexoru Op

Ideas y mejoras acordadas que **no** se implementan todavía. Cada una necesita su propio ciclo de
Spec Kit (`/speckit-specify` → … → `/speckit-implement`) antes de escribir código.

| ID | Fecha | Origen | Descripción | Motivo |
|----|-------|--------|-------------|--------|
| B-001 | 2026-09-28 | Feature 001-user-access, implementación de US1 | **Aviso al Dueño por fallos distribuidos**: avisar al Dueño cuando una misma cuenta acumule muchos intentos fallidos desde varias IP en poco tiempo (por ejemplo, 20 fallos desde 5 o más IP en 1 hora). | El bloqueo por correo + IP (FR-005) no frena a un atacante con muchas IP; hoy lo contienen el 2FA obligatorio y los límites por IP de Supabase. Umbral, ventana y canal del aviso quedan por definir en su spec. |
| B-002 | 2026-09-28 | Feature 001-user-access, implementación de US1 | **Evaluar los códigos de recuperación nativos de Supabase** (`supabase.auth.mfa.recoveryCodes`, hoy marcados como experimentales y detrás de `auth.experimental.recoveryCodes`) para sustituir la implementación propia (research R7) cuando sean estables. | Menos código propio que mantener. Hoy se descarta por ser experimental. |
