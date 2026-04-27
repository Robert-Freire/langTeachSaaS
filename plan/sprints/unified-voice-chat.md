# Sprint: Unified Voice & Chat

## The teacher's story

Ana acaba de salir. Jordi tiene dos minutos antes de que llegue el siguiente alumno.

Está en la pantalla del registro de sesión de Ana — la dejó abierta mientras hablaban. Sin cerrar nada, sin buscar nada, pulsa "Open Assistant" en la barra lateral. El panel se desliza desde la derecha. Sabe que está en la sesión de Ana. No necesita decirle de quién es.

Pulsa el micrófono y habla:

> "Hoy hemos trabajado el pretérito perfecto. Le cuesta todavía el subjuntivo, especialmente el imperfecto. Súbele el nivel de escritura a B1 porque ha mejorado mucho. Y añade un teaching todo para repasar la voz pasiva la semana que viene."

Para. En la pantalla aparece primero la transcripción literal de lo que ha dicho — exactamente lo que salió, sin parafrasear. Debajo, tres propuestas:

- **Registro de sesión:** Topics Added: "Pretérito perfecto" — área de mejora: "Subjuntivo (imperfecto)"
- **Estudiante: Ana Martins:** Nivel de escritura A2 → **B1**
- **Teaching Todo:** "Repasar voz pasiva la semana que viene"

Jordi echa un vistazo. Todo parece correcto. Pulsa Aplicar todo. El panel se cierra. La sesión está registrada, el perfil actualizado, el recordatorio añadido.

El siguiente alumno llama a la puerta.

---

Dos días después, Jordi acaba de hacer una primera llamada de evaluación con una nueva alumna. Sigue en la pantalla de lista de estudiantes. Sin tocar el formulario de "Añadir estudiante", abre el asistente y habla:

> "Nueva alumna: Sofía, 28 años, ingeniera, de Madrid. Lengua materna castellano, aprende inglés. Nivel aproximado B1, quiere mejorar para entrevistas de trabajo."

Cinco campos propuestos en una sola tarjeta. Los acepta. Sofía aparece en la lista.

Más tarde, revisando el perfil de Marco, escribe en el asistente: "En realidad el nivel de Marco es B1.2, no B1." Una sola propuesta con el cambio. La aplica. Listo.

## What changes for Jordi

**Before this sprint:** Cada reflexión post-clase requiere tres pantallas y tres guardados separados. Actualizar el perfil de un estudiante significa navegar lejos del registro de sesión, buscar el campo correcto, editar, volver. Corregir un nivel mal registrado requiere ir al perfil, encontrar el campo, cambiarlo. La voz solo funciona dentro de pantallas específicas y solo actualiza una entidad a la vez.

**After this sprint:** Un único input — voz o texto, desde cualquier pantalla — produce propuestas tipadas para todas las entidades afectadas. El profesor revisa, ajusta lo que quiera, y aplica. Un flujo, un momento, cero navegación.

## What this sprint delivers

**The Atelier Assistant launcher (#1002)**
- Botón "Open Assistant" persistente en la barra lateral, visible desde cualquier pantalla
- Abre un panel lateral context-aware (sabe en qué pantalla y sobre qué estudiante está el profesor)
- Diseño Atelier: gradiente índigo, icono sparkle, `xl` border radius, sin bordes de línea

**The Atelier Assistant panel (#1008 → #1009 → #1010)**
- #1008: Panel shell — se desliza desde la derecha, persiste en navegación, input de texto, bloque TRANSCRIPCIÓN verbatim, estado vacío/idle. Sin LLM.
- #1009: LLM + propuestas multi-entidad (Session Log, Student, Teaching Todos), sintaxis diff, Apply/Dismiss por tarjeta, Apply All, context detection.
- #1010: Modify-in-place — edición inline de una propuesta + refinamiento por chat sin reenviar desde cero.

**The Atelier Assistant — voice input (#1004)**
- Icono de micrófono en la barra de input, siempre visible
- Tap-to-start / tap-to-stop; waveform índigo, temporizador, cancel (X)
- Al parar: transcripción → proposals; mismo pipeline que el texto

**New student via assistant (#1005)**
- Crear un nuevo estudiante desde el panel con voz o texto, sin tocar el formulario

**Atelier design system tokens (#998–#1001)**
- Token `--primary`: indigo-800 + fuente Inter (#998)
- No-line rule + tonal-layering en toda la app (#999) — ⚠️ requiere validación visual antes de merge
- CEFR badges: forma cuadrada + colores por nivel (#1000)
- CTAs primarios con gradiente 135deg (#1001)

**Carry-over polish from last sprint**
- #1006 (DS token/button fixes), #1007 (DS per-screen UX), #990 (code hardening), #991 (e2e fixes), #992 (navigation UX), #993 (infra), #997 (3-button header)

## Architecture constraint

**No new fields. No new data structures. No new extraction schemas.**

The Atelier Assistant is a UX unification layer over existing functionality. Everything it writes goes to fields that already exist on Student, SessionLog, and TeachingTodo, through endpoints that already exist. The teacher gains nothing they could not do before — they just do all of it from one place, in one input, without navigating between screens.

## What we are NOT building

- Navegación por voz ("abre el perfil de Carmen")
- New fields on any existing entity
- New session creation via the assistant (the session must already exist; the assistant updates its log)
- Transcripción en tiempo real durante la grabación (la transcripción ocurre al parar)
- Reproducción del audio grabado
- STT multilingüe tuning avanzado (reuse del endpoint existente)
- Propuesta automática de nueva sesión desde la voz (la sesión debe existir para que el asistente actualice su log)

## Smoke Test Appendix

*(Written at sprint close after issue coverage audit)*
