# Blueprint Técnico — LadderHand
**Implementación de la v1.0 descrita en `PRD.md` · Archivo único HTML · Vanilla JS · Offline**

---

## 1. Stack tecnológico exacto

| Capa | Elección | Justificación |
|---|---|---|
| Marcado | HTML5 estándar, un solo archivo `ladder-hand.html` | Doble clic y funciona; portabilidad por USB/aula virtual |
| Estilos | CSS3 puro con custom properties (design tokens) | Sin preprocesadores ni build; tema claro educativo |
| Lógica | JavaScript vanilla ES2020, `<script>` clásico inline (NO módulos ES) | Los módulos ES fallan por CORS en `file://`; script clásico siempre funciona |
| Render del ladder | SVG generado por DOM (`createElementNS`) | Nítido a cualquier zoom, cada elemento es un nodo (resaltar errores/energía = cambiar clases), export SVG nativo |
| Persistencia a disco | File System Access API (`showSaveFilePicker`/`showOpenFilePicker`) | Guardar/sobrescribir directo en Chrome/Edge |
| Persistencia fallback | `<a download>` con Blob + `<input type="file">` | Cualquier navegador |
| Autoguardado | `localStorage` (clave `ladderhand.autosave`) → IndexedDB si está disponible | `localStorage` funciona en `file://`; IndexedDB en Chrome está bloqueado en `file://` |
| Simulación | `setInterval` a 100 ms + máquina de estados en memoria | Suficiente para docencia; sin Web Workers en v1 |
| Dependencias externas | **Ninguna**. Sin CDN, sin fuentes remotas (system-ui / ui-monospace), sin librerías | RNF-01/03 |

**Explicitamente NO usamos:** frameworks (React/Vue), TypeScript, bundlers, jQuery, librerías de diagramas (mermaid/d3), fuentes/iconos remotos.

---

## 2. Restricciones de `file://` y decisiones derivadas

| Capacidad en `file://` (Chrome/Edge) | Estado | Decisión |
|---|---|---|
| Script clásico inline | ✔ Funciona | Único mecanismo de carga de JS |
| Módulos ES (`import`) | ✘ Bloqueado por CORS | Código organizado en IIFE/namespaces, no módulos |
| `localStorage` | ✔ Funciona | Autoguardado primario |
| IndexedDB | ✘ Bloqueado (SecurityError) | Detección de capacidad; si existe (servido por http) se usa para historial de versiones |
| File System Access API | ✔ Disponible (contexto seguro) | Guardar/abrir directo; fallback si falta |
| Descarga de Blob | ✔ Funciona | Fallback universal de export/guardado |

---

## 3. Arquitectura de módulos y flujo de datos

Un solo `<script>` con módulos por namespace IIFE, comunicados por funciones puras:

```
texto consola
   │  (evento input/Enter/pegado, debounce corto)
   ▼
Parser.parse(code) ──► { program: IR, errors: [], warnings: [] }
   │
   ▼
Ladder.compile(program) ──► layout de rungs (posiciones)
   │
   ▼
Renderer.render(layout) ──► nodos SVG (solo el panel derecho)
   │
Simulator.tick() cada 100 ms ──► lee estados X (UI), evalúa rungs en orden,
   │                             escribe Y/M/T/C y actualiza CLASES CSS del SVG
   │                             (no re-render completo)
Storage / Library / Exporter ──► sobre `code` (fuente de verdad) y el nodo SVG
```

**Módulos (en orden dentro del archivo):**

1. `Dialect` — tabla de instrucciones, regex de operandos, normalización de texto.
2. `Parser` — texto → tokens → IR con algoritmo de pila de bloques (§6); devuelve errores por línea.
3. `Ladder` — IR → estructura de layout (calcula filas/columnas/ramas por rung).
4. `Renderer` — layout → SVG (símbolos §7); expone `setState()` para la simulación.
5. `Simulator` — ciclo de scan §8; panel de interruptores; RUN/PAUSE/RESET.
6. `Storage` — adaptador de guardado (§9) y autoguardado con recuperación.
7. `Library` — biblioteca + 5 ejemplos embebidos (strings constantes).
8. `Exporter` — SVG/PNG/print-PDF (§10).
9. `UI` — consola con números de línea, panel de errores, toolbar, toasts, atajos, estados vacíos.
10. `App` — estado global (`{ code, project, sim }`), cableado de eventos, init.

**Regla de oro:** `code` (texto de la consola) es la única fuente de verdad; IR y SVG son derivados siempre regenerables.

---

## 4. Estructura del archivo único (mapa de secciones)

```
ladder-hand.html
├─ <head>
│  ├─ meta charset/viewport + <title>LadderHand</title>
│  └─ <style>
│     ├─ tokens: --bg, --panel, --ink, --accent(energía), --error, --ok
│     ├─ layout: grid toolbar | consola | divisor | diagrama | statusbar
│     ├─ consola: monoespaciada, números de línea, línea inválida
│     ├─ svg: .contact .nc .coil .timer .counter .wire .energized .error
│     ├─ toasts, modales (biblioteca, ayuda), panel de errores
│     └─ @media print → solo el SVG a página completa
└─ <script> (IIFE, sin módulos)
   ├─ 01 Dialect        (tabla + regex + normalize)
   ├─ 02 Parser         (tokenize → bloques → IR + errores)
   ├─ 03 Ladder         (IR → layout de rungs)
   ├─ 04 Renderer       (layout → SVG; API de estado)
   ├─ 05 Simulator      (scan 100 ms; panel X; run/pause/reset)
   ├─ 06 Storage        (FS Access / descarga; autosave; recuperación)
   ├─ 07 Library        (biblioteca + EXAMPLES[5])
   ├─ 08 Exporter       (svg/png/print)
   ├─ 09 UI             (consola+gutter, panel errores, toolbar, toasts, atajos)
   └─ 10 App            (estado, eventos, init: cargar ejemplo 1 + recuperar sesión)
```

Convención de desarrollo: cada bloque se abre con `/* ===== 04 RENDERER ===== */` para que los prompts de la hoja de ruta apunten a secciones concretas.

---

## 5. Modelo de datos

### 5.1 Proyecto (persistencia) — ver PRD §10.1. Validar `schema === "ladderhand-project/v1"` al abrir; si difiere, error amable.

### 5.2 IR interna (en memoria, no persistida)

```js
Program  = { rungs: Rung[], endLine: number|null }
Rung     = { line: number, expr: Node, coils: Coil[] }
Node     = { kind: 'contact', pol: 'NO'|'NC', dev: 'X12' }
         | { kind: 'series',   children: Node[] }
         | { kind: 'parallel', children: Node[] }
Coil     = { kind: 'out'|'set'|'rst', dev: 'Y0'|'M3' }
         | { kind: 'timer',   dev: 'T0', preset: 50 }   // ×100 ms
         | { kind: 'counter', dev: 'C0', preset: 10 }
Error    = { line: number, text: string, cause: string, hint: string, severity: 'error'|'warning' }
```

---

## 6. Semántica del dialecto y algoritmo de parseo

### 6.1 Tabla de parseo (una instrucción por línea)

| Token | Acción sobre la máquina de parseo |
|---|---|
| `LD d` / `LDI d` | Si `current` existe → `stack.push(current)`; `current = contacto(d, NO/NC)` |
| `AND d` / `ANI d` | `current = serie(current, contacto(d,NO/NC))` · error si `current == null` |
| `OR d` / `ORI d` | `current = paralelo(current, contacto(d,NO/NC))` · error si `current == null` |
| `ANB` | `b2 = current; b1 = stack.pop()` → `current = serie(b1, b2)` · error si no hay 2 bloques |
| `ORB` | ídem → `current = paralelo(b1, b2)` |
| `OUT d` (Y/M) | Adjunta bobina al rung abierto (varias OUT consecutivas = bobinas en paralelo al final) |
| `SET d` / `RST d` | Ídem, bobinas de enclavamiento/reset |
| `OUT T# K#` / `OUT C# K#` | Bobina timer/contador con preset; validar K 0–9999 |
| `END` | Cierra rung y programa; error si hay código después |
| `; …` | Ignorado (comentario) |

Cierre de rung: cuando llega un `LD/LDI` **con bobina ya colocada** (rung nuevo), un `END`, o fin de texto. Un `LD/LDI` sin bobina previa **no cierra el rung**: apila el bloque actual (sub-bloque para `ANB`/`ORB`), igual que GX Works.

**Completación implícita (ANB implícito):** al cerrar un rung, si la pila de bloques no está vacía, los bloques pendientes se combinan en serie con el resultado actual (`serie(bloque1, serie(bloque2, …, current))`) y se emite **warning** (no error) indicando que en GX Works conviene escribir `ANB`/`ORB` explícito. Así, `… ORB · ANI X4 · LD X5 · LD X6 · AND X7 · ORB · OUT Y0` dibuja el ladder natural (dos grupos paralelos en serie con `/X4`) sin bloquear al estudiante.

Al cerrar: si tras la completación `coils == []` → error "rung sin bobina". Al final del parseo se valida `END` único y presente.

### 6.2 Verificación semántica (después del parseo)

- Bloques `LD` pendientes al cerrar el rung → **warning** + ANB implícito en serie (ver §6.1).
- Bobina `OUT` del mismo dispositivo en 2+ rungs → **warning** (en scan gana el último).
- `SET`/`RST` sobre `T#`/`C#` → válido (reset de timer/contador).
- Dispositivos válidos: `X|Y|M|T|C` + número 0–255; `K` 0–9999. Numeración decimal (simplificación didáctica vs octal de GX — documentada en la ayuda).

### 6.3 Normalización de entrada (antes de tokenizar)

`trim` por línea → colapsar espacios múltiples → instrucción a mayúsculas → operandos tal cual (validar patrón) → ignorar líneas vacías/comentarios para el IR pero conservarlas para mapear números de línea.

### 6.4 Timer (TON no retentivo) y contador en simulación

- **Timer**: cada tick (100 ms) con condición verdadera: `acc += 100 ms`; `acc >= K×100 ms` → contacto `T#` cerrado. Condición falsa → `acc = 0` y contacto abierto.
- **Contador**: flanco de subida de la condición (comparar estado previo del rung) → `count += 1`; `count >= K` → contacto `C#` cerrado. `RST C#` → `count = 0`. `RST T#` → `acc = 0`.

---

## 7. Render SVG (convenciones)

- **Rejilla**: celda base 64×80 px. Barra eléctrica izquierda (`x=40`) y derecha (`x=ancho-40`); cada rung ocupa una banda vertical; etiqueta de número de rung a la izquierda.
- **Símbolos** (grupos `<g>` con clase):
  - Contacto NO: dos trazos paralelos verticales; NC: igual + barra diagonal encima.
  - Bobina: paréntesis `( )` (dos arcos); `SET`: bobina con `S`; `RST`: con `R`.
  - Timer/Contador: caja rectangular con `T0 K50` y **valor vivo** (`acc`/`count`) en texto `<tspan class="value">`.
- **Cables**: `<path>` ortogonales (`stroke-width: 2`); ramas paralelas en columnas desplazadas 72 px. La **unión de un grupo paralelo se dibuja exactamente donde termina su rama más larga**; toda rama más corta recibe un cable de extensión hasta ese punto (registrado como salida de esa rama, se resalta con su flujo). Todo nodo termina en un límite de celda (`RAIL_L + (col + ancho)·CELL_W`), lo que garantiza que la columna de bobinas nunca se solape con el circuito.
- **Estados**: clase `.energized` (color acento + glow suave) aplicada por el simulador sobre nodos/cables ya creados — **el render nunca se reconstruye por tick**.
- **Errores**: los rungs con error grave no se dibujan; se dibuja un rectángulo rojo tenue con el mensaje resumido. Las warnings sí dibujan.
- Escala: el SVG crece en altura con scroll del contenedor (sin zoom en v1).

---

## 8. Simulador (ciclo de scan)

```
Cada 100 ms (si state === RUN):
 1. entradas  ← interruptores de la UI (X)
 2. por cada rung EN ORDEN:
      cond = evaluar(expr)        // contactos leen estado ACTUAL de X/Y/M/T/C
      para cada bobina del rung: escribir efecto (OUT/SET/RST/T/C)
 3. actualizar clases .energized y textos de valor en el SVG
 4. refrescar interruptores si algún M/T/C aparece (solo X tiene interruptor)
```

- `evaluar(nodo)`: contacto NO → `estado[dev]`; NC → `!estado[dev]`; serie → AND; paralelo → OR.
- Estados iniciales: RESET pone `Y/M = false`, `T.acc = 0`, `C.count = 0`; los interruptores X quedan como el usuario los dejó.
- Botones: `▶ RUN / ⏸ PAUSE / ⟲ RESET` + indicador de estado. Cambiar el código mientras corre → re-parseo y la simulación continúa con el nuevo IR (los estados persisten si los dispositivos siguen existiendo).

---

## 9. Persistencia (adaptador `Storage`)

```
capacidades = { fsAccess: 'showSaveFilePicker' in window,
                idb: intento de apertura silencioso }
guardarComo()  → fsAccess ? showSaveFilePicker(.json) + conservar handle
                          → <a download> proyecto.json
guardar()      → si hay handle: reescribir; si no: guardarComo()
abrir()        → fsAccess ? showOpenFilePicker : <input type=file>
autosave()     → debounce 800 ms → localStorage['ladderhand.autosave']
                 (si idb disponible: además historial de 5 versiones)
al iniciar     → si autosave existe y ≠ proyecto actual → banner "¿Recuperar última sesión?"
```

- Errores capturados (`AbortError` del picker = cancelación silenciosa; `SecurityError`/cuota → toast con acción "Guardar a disco").
- Nombres de archivo sugeridos: slug del nombre del proyecto + `.json`.

---

## 10. Exportación (`Exporter`)

| Formato | Procedimiento |
|---|---|
| SVG | `new XMLSerializer().serializeToString(svg)` → Blob `image/svg+xml` → descarga `.svg` |
| PNG | SVG → Blob URL → `<Image>` → canvas a **2x** con fondo blanco → `toBlob` → descarga |
| PDF | `window.print()` con `@media print` que oculta todo menos el SVG (el usuario elige "Guardar como PDF") |

---

## 11. Manejo de errores y estados límite

- **Nunca se bloquea la edición**: cualquier error deja la app usable y el diagrama muestra lo parseable.
- Parser total: try/catch defensivo; si explota, toast genérico + el texto del usuario intacto (nunca se pierde).
- Pegado gigante (miles de líneas): parseo síncrono con límite blando de 2.000 líneas → aviso.
- Codificación: el archivo siempre se lee/escribe como UTF-8.
- `beforeunload`: si hay cambios sin guardar respecto al último guardado → confirmación nativa del navegador.

---

## 12. Presupuesto de recursos

| Concepto | Presupuesto |
|---|---|
| Tamaño del HTML | < 200 KB |
| RAM en uso | < 50 MB (objetivo ~15 MB con 20 rungs) |
| Arranque en frío | < 1 s |
| Re-render en vivo (100 rungs) | < 50 ms por pulsación de Enter |
| Tick de simulación | < 2 ms por scan (solo cambios de clase/texto) |
| Red | 0 bytes (verificable en DevTools) |

---

## 13. Hoja de ruta — 10 prompts ejecutables (vibe coding)

> Uso: entrega los prompts **en orden** a tu asistente de código. Cada prompt es autocontenido: pide mostrar el archivo completo si el contexto se pierde, y verifica la "aceptación" antes de pasar al siguiente. El proyecto vive en `LadderHand/ladder-hand.html`.

---

### PROMPT 1 — Esqueleto y layout
```
Crea el archivo LadderHand/ladder-hand.html: un único archivo HTML autocontenido
(HTML5 + CSS + JS inline en <script> clásico, SIN módulos ES ni dependencias externas,
debe funcionar con doble clic en file://). Es una app educativa llamada LadderHand.

Layout de pantalla única con CSS Grid:
- Barra superior: título "LadderHand" + botones [Nuevo] [Guardar] [Abrir] [Biblioteca]
  [Exportar ▾] [Ayuda] (por ahora solo decorativos, con :disabled según se implementen).
- Zona dividida redimensionable arrastrando un divisor vertical:
  izquierda (35%): panel "CONSOLA" con <textarea> monoespaciado + columna de números
  de línea sincronizada con el scroll;
  derecha (65%): panel "DIAGRAMA" con un <svg> que llena el espacio.
- Barra inferior de estado: "0 rungs · 0 líneas · sin cambios".
Tema: educativo moderno, claro, con custom properties (--bg, --panel, --ink, --accent,
--error, --ok), tipografía system-ui y ui-monospace, contraste AA, foco visible.
Botones ◀ ▶ ⏸ ⟲ de simulación en la esquina del panel derecho (decorativos por ahora).

ACEPTACIÓN: el archivo abre con doble clic en Chrome/Edge, se ve el layout completo,
el divisor redimensiona, escribir en la consola muestra números de línea correctos,
y en DevTools → Network no hay ninguna petición de red.
```

### PROMPT 2 — Dialecto y Parser con validación estricta
```
Sobre LadderHand/ladder-hand.html, añade dentro del <script> los módulos IIFE
/* ===== 01 DIALECT ===== */ y /* ===== 02 PARSER ===== */.

Dialect: tabla de instrucciones válidas (LD, LDI, AND, ANI, OR, ORI, ANB, ORB, OUT,
SET, RST, END; OUT T# K# y OUT C# K# para timer/contador), operandos X/Y/M/T/C 0–255,
constantes K 0–9999, comentarios con ';'. Función normalize(linea): trim, colapsar
espacios, instrucción a mayúsculas, tolerar CRLF y tabs.

Parser.parse(code) devuelve { program, errors, warnings } donde program es
{ rungs: [...], endLine } y cada rung tiene { line, expr, coils }. Implementa la
máquina de pila de bloques exacta de BLUEPRINT.md §6.1 (LD abre bloque, AND/OR
combinan, ANB/ORB sacan dos bloques de la pila, OUT/SET/RST/T/C cierran con bobina,
nuevo LD cierra el rung anterior). Errores por línea con { line, text, cause, hint,
severity }: instrucción inválida, operando mal formado, AND/OR/OUT sin LD previo,
ANB/ORB sin bloques, rung sin bobina, END ausente o múltiple, código tras END.
Warnings: bobina OUT duplicada del mismo dispositivo en 2+ rungs.

Añade un panel lateral plegable "Errores" bajo la consola que lista los errores
(línea, causa, sugerencia) con clic → scroll a esa línea del textarea, y marca la
línea inválida en el gutter con fondo rojo. La consola rechaza (no aplica) líneas
inválidas pero NUNCA bloquea la edición del resto.

ACEPTACIÓN: al pegar este netlist no hay errores:
LD X0 / OR Y0 / ANI X1 / OUT Y0 / LD X2 / OUT T0 K50 / END
y al borrar el OUT Y0 aparece "rung sin bobina" con la línea correcta.
```

### PROMPT 3 — Compilador de ladder + render SVG en vivo
```
Añade /* ===== 03 LADDER ===== */ y /* ===== 04 RENDERER ===== */ a
LadderHand/ladder-hand.html.

Ladder.compile(program) convierte el IR a un layout: para cada rung calcula filas y
columnas usando la estructura serie/paralelo del árbol (regla BLUEPRINT.md §7: celda
64×80, rieles izquierdo/derecho, ramas paralelas en columnas desplazadas 72 px,
varias bobinas del mismo rung en paralelo al final).

Renderer.render(layout) genera el SVG con createElementNS:
- contacto NO (dos trazos verticales) y NC (con barra diagonal), con la etiqueta
  del dispositivo debajo (X0, Y0…);
- bobina paréntesis ( ) para OUT, con S o R para SET/RST;
- caja para timer (T0 · K50) y contador (C0 · K10) con tspan.value para el valor vivo;
- cables ortogonales (path) conectando todo, número de rung a la izquierda;
- rung con error grave → rectángulo rojo tenue con mensaje resumido, no se dibuja.

Engancha la consola: cada Enter o pegado (evento input) re-parsea y re-renderiza el
diagrama completo EN VIVO (debounce 50 ms). Actualiza la barra de estado con rungs
y líneas. Con consola vacía muestra un placeholder: rung fantasma de ejemplo en
opacidad 0.3 + texto "Escribe LD X0 y pulsa Enter".

ACEPTACIÓN: el netlist del Prompt 2 dibuja el rung arranque-paro con rama paralela
correcta (X0 arriba, Y0 en paralelo, X1 en serie, bobina Y0), y un segundo rung con
la caja del timer; modificar texto redibuja al instante sin errores de consola.
```

### PROMPT 4 — Simulación interactiva
```
Añade /* ===== 05 SIMULATOR ===== */ a LadderHand/ladder-hand.html.

Implementa el ciclo de scan de BLUEPRINT.md §8 con setInterval de 100 ms:
- Extrae del programa las X usadas y genera interruptores ON/OFF en un panel de
  simulación sobre el diagrama (uno por X, con etiqueta).
- evaluar(nodo): contacto NO → estado[dev]; NC → !estado[dev]; serie → AND;
  paralelo → OR. Los rungs se evalúan EN ORDEN (semántica de scan real).
- Bobinas: OUT escribe, SET/RST enclavan/des-enclavan, timer TON no retentivo
  (acumula 100 ms por tick con condición verdadera; contacto T# cierra al llegar
  a K×100 ms; condición falsa resetea), contador por flanco de subida (RST lo limpia).
- Botones funcionales ▶ RUN / ⏸ PAUSE / ⟲ RESET (RESET limpia Y/M/T/C pero deja
  los interruptores X como estén).
- Resaltado de energía: clase .energized (color --accent + glow) sobre contactos,
  bobinas y cables energizados, y actualiza los tspan.value de timers/contadores.
- NUNCA re-renderices el SVG por tick: solo cambia clases y textos.

ACEPTACIÓN: con el netlist arranque-paro, al activar X0 la bobina Y0 se energiza y
el contacto Y0 del enclavamiento se cierra (auto-mantenimiento); al activar X1 se
apaga; RESET la limpia. Con OUT T0 K10 el valor cuenta 0→10 y el contacto T0 cierra.
```

### PROMPT 5 — Persistencia: guardar, abrir, autoguardado y recuperación
```
Añade /* ===== 06 STORAGE ===== */ a LadderHand/ladder-hand.html según BLUEPRINT.md §9.

- Formato de proyecto JSON: { schema: "ladderhand-project/v1", name, createdAt,
  modifiedAt, code, settings: { scanMs: 100 } }. El código de la consola es la
  fuente de verdad.
- Guardar: si 'showSaveFilePicker' in window → picker .json y conserva el handle
  para que "Guardar" posterior sobrescriba sin diálogo; si no → <a download> con
  Blob. AbortError (cancelar) se ignora en silencio.
- Abrir: picker o <input type=file>; valida schema; si difiere → toast de error
  amable y no carga.
- Autoguardado: debounce 800 ms en cada cambio → localStorage["ladderhand.autosave"];
  detecta IndexedDB disponible (si no, omite en silencio; NO debe lanzar errores en
  file://). Cuota llena o SecurityError → toast con acción "Guardar a disco".
- Al iniciar: si hay autosave → banner superior "¿Recuperar la última sesión?"
  [Recuperar] [Descartar].
- Marca "sin cambios / cambios sin guardar" en la barra de estado y beforeunload
  con confirmación nativa si hay cambios sin guardar.

ACEPTACIÓN: guardar en disco y abrir recupera el proyecto idéntico; cerrar la
pestaña y reabrir muestra el banner de recuperación que restaura el código exacto;
en file:// no aparece ningún error de IndexedDB en consola.
```

### PROMPT 6 — Biblioteca de proyectos + 5 ejemplos
```
Añade /* ===== 07 LIBRARY ===== */ a LadderHand/ladder-hand.html.

- Modal "Biblioteca" (desde el botón y con Ctrl+L): lista de proyectos guardados
  en localStorage (ladderhand.projects[]) con nombre, fecha de modificación y
  acciones: Abrir, Renombrar, Duplicar, Eliminar (con confirmación).
- 5 ejemplos PRECARGADOS como constantes de texto, marcados "ejemplo" (no se
  eliminan; acción "Restaurar ejemplos"):
  1) Motor arranque-paro con enclavamiento (LD X0 / OR Y0 / ANI X1 / OUT Y0 / END)
  2) Motor con inversión de giro e interbloqueo (X0 gira derecha, X1 izquierda,
     X2 paro; contactos NC cruzados como interbloqueo)
  3) Semáforo 2 tiempos con 2 timers (T0 y T1 alternando Y0/Y1)
  4) Contador de piezas: X0 sensor cuenta, X1 resetea, Y0 alarma al llegar a K10
  5) Bomba con retardo al soltar (timer arranca cuando X0 se apaga)
  Verifica que cada netlist parsea SIN errores y dibuja el ladder correcto con la
  máquina del Parser (corrige el netlist, no el parser).
- [Nuevo] crea un proyecto vacío con END; el nombre editable en el modal y en la
  barra de título; guardar desde la biblioteca también es posible.

ACEPTACIÓN: las 5 netlists de ejemplo abren, parsean sin errores y se simulan con
comportamiento coherente a su nombre; renombrar/duplicar/eliminar funciona y
sobrevive a un recargo de la página.
```

### PROMPT 7 — Exportación SVG / PNG / PDF
```
Añade /* ===== 08 EXPORTER ===== */ a LadderHand/ladder-hand.html.

Menú [Exportar ▾] con tres opciones:
- SVG: new XMLSerializer().serializeToString(svg) → Blob image/svg+xml → descarga
  con nombre = nombre-del-proyecto.svg. El SVG exportado debe verse idéntico con
  fondo blanco (clona el nodo y fija width/height explícitos).
- PNG: serializa → Blob URL → new Image() → canvas a 2x con fondo blanco →
  toBlob → descarga. Muestra toast de éxito/fracaso.
- PDF: window.print() con @media print que oculta toolbar, consola, paneles y
  deja solo el diagrama a página completa (page landscape si es ancho).
Nombre de archivo: slug del nombre del proyecto (minúsculas, guiones).

ACEPTACIÓN: los tres export del ejemplo "Semáforo" producen archivos correctos y
legibles; el PNG sale nítido a 2x con fondo blanco; la impresión muestra solo el
diagrama.
```

### PROMPT 8 — UX: ayuda, atajos y pulido
```
Añade /* ===== 09 UI ===== */ (y ajusta 10 App) a LadderHand/ladder-hand.html.

- Panel [Ayuda] (F1, modal o lateral): chuleta del dialecto del PRD §9 — cada
  instrucción con sintaxis, qué dibuja y mini-ejemplo; nota didáctica: "numeración
  decimal 0–255 (GX Works usa octal para X/Y)".
- Atajos: Ctrl+S guardar, Ctrl+L biblioteca, F1 ayuda, F5 RUN/PAUSE de simulación
  (preventDefault), Esc cierra modales.
- Toasts (esquina inferior derecha, auto-dismiss 4 s) para: guardado OK, export OK,
  recuperación descartada, avisos de rendimiento.
- Estados de interfaz: placeholder de consola vacía ya existe; añade estado
  "todo correcto" (check verde sutil en statusbar) y contador de errores/warnings.
- Accesibilidad: aria-labels en botones de icono, foco visible, contraste AA,
  orden de tabulación lógico.

ACEPTACIÓN: todos los atajos funcionan; la chuleta cubre las 12 instrucciones + K;
navegación completa por teclado; ningún botón sin aria-label.
```

### PROMPT 9 — Rendimiento y estados límite
```
Endurece LadderHand/ladder-hand.html (BLUEPRINT.md §11–12):

- Aviso de escala: al superar 100 rungs → toast "Programa grande: puede notarse
  lentitud" (no bloquea). Genera un netlist de prueba de 120 rungs y mide: el
  re-render por Enter debe tardar < 50 ms (mide con performance.now() y muéstralo
  en la consola del navegador durante esta prueba, sin UI permanente).
- Pegado masivo: normaliza CRLF/tabs, límite blando de 2.000 líneas con aviso.
- Parser defensivo: try/catch total; si algo explota, toast genérico y el texto
  del usuario NUNCA se pierde (recargar la consola desde el estado).
- Autoguardado ante cierre: beforeunload guarda síncronamente a localStorage.
- Casos límite del dialecto: rung solo con LD y nada más; ANB/ORB sueltos; OUT T0
  sin K; K negativa; operandos X256+; instrucción en minúsculas; comentario en
  línea propia y al final de instrucción. Todos deben dar el error correcto con
  línea y sugerencia, o normalizarse sin error según corresponda.

ACEPTACIÓN: la suite de casos límite pasa; un programa de 120 rungs se redibuja
en vivo sin bloqueo perceptible; cerrar la pestaña a mitad de edición no pierde
el texto.
```

### PROMPT 10 — QA final según PRD §13
```
Auditoría final de LadderHand/ladder-hand.html contra el PRD (sección 13) y este
blueprint. Recorre y corrige hasta cumplir TODO:

1. Doble clic en file://, sin internet: todas las funciones operativas.
2. Las 5 netlists canónicas dibujan el ladder idéntico al esperado (compáralas
   mentalmente con GX Works: serie/paralelo/ANB/ORB correctos).
3. Validación: cada instrucción con caso válido e inválido → mensaje + sugerencia.
4. Simulación: enclavamiento, timer no retentivo, contador con flanco, RESET.
5. Guardar/abrir/autoguardado/recuperación íntegros.
6. Export SVG/PNG/PDF correctos.
7. 100 rungs fluidos; 0 peticiones de red en DevTools; RAM razonable.
Entrega al final una LISTA de verificación marcada (✓/✗→corregido) y cualquier
desviación conocida. Si algo del PRD no está implementado, implémentalo: no lo
dejes pendiente.
```

---

## 14. Checklist de QA (contraste con PRD §13)

- [ ] Sin red (DevTools Network vacío) en todo el flujo
- [ ] 5 netlists canónicas → ladder correcto
- [ ] 12 instrucciones: válido/inválido con sugerencia
- [ ] Simulación: enclavamiento / timer / contador / RESET
- [ ] Guardar → abrir idéntico; autoguardado y recuperación
- [ ] SVG/PNG/PDF correctos
- [ ] 100 rungs < 50 ms por re-render
- [ ] file:// sin errores de consola (IndexedDB silenciado)
- [ ] Atajos y accesibilidad básica
- [ ] beforeunload + autoguardado síncrono al cerrar
