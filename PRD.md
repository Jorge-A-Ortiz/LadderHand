# PRD — LadderHand
**Documento de Requerimientos de Producto · Versión 1.0 (MVP)**
Estado: Aprobado para implementación · Fecha: 2026 · Propietario: Jorge

---

## 1. Resumen ejecutivo

**LadderHand** es una aplicación web de archivo único (HTML), 100 % offline, que emula un **programador de mano (handheld) de PLC**: el usuario escribe instrucciones en texto (netlist estilo Mitsubishi: `LD`, `AND`, `OR`, `OUT`, `ANB`, `ORB`, temporizadores y contadores) y, al pulsar Enter, la app **genera y redibuja en vivo el diagrama ladder** equivalente, como se haría en GX Works pero sin licencias ni instalaciones.

Incluye **simulación interactiva** (interruptores ON/OFF y flujo de energía animado), **exportación** (SVG/PNG/PDF), **biblioteca de proyectos con ejemplos precargados** y **guardado en disco con autoguardado**. Su propósito principal es la **docencia y el aprendizaje** de lógica ladder en aulas de automatización.

---

## 2. Problema y oportunidad

| Hoy | Con LadderHand |
|---|---|
| GX Works / Studio 5000 son licencias caras y pesadas para enseñar ladder básico | Gratis, ligero (< 1 MB), corre en el PC del laboratorio con doble clic |
| Escribir instrucciones y "ver" el ladder exige instalar y configurar software | La traducción netlist → ladder es inmediata y visual, refuerza la conexión texto↔diagrama |
| No hay forma segura de "jugar" con la lógica sin hardware | Simulación con interruptores virtuales: el estudiante ve la energía fluir |
| Compartir ejercicios implica archivos propietarios | Proyectos en JSON plano + export a imagen/PDF para apuntes y entregas |

Oportunidad: convertir la experiencia retro del handheld (escribir `LD X0` → Enter) en una herramienta didáctica moderna, sin fricción de instalación.

---

## 3. Usuarios objetivo

1. **Estudiante de automatización (primario).** Aprende ladder desde cero. Necesita: sintaxis estricta que enseñe disciplina, errores explicados en lenguaje simple, simulación para verificar su lógica. Corre la app en PCs de laboratorio, a veces viejos.
2. **Docente (secundario).** Prepara ejercicios, guarda una biblioteca de prácticas, proyecta el diagrama en clase y exporta imágenes para guías y exámenes.

**Anti-usuarios (fuera de v1):** ingenieros que programan PLCs reales (necesitan dialecto completo y export a formatos de fabricante), técnicos de mantenimiento en campo.

---

## 4. Objetivos y métricas de éxito

| Objetivo | Métrica | Meta |
|---|---|---|
| Cero fricción de arranque | Tiempo desde doble clic hasta poder escribir | < 1 s |
| Primer éxito rápido | Tiempo hasta que un estudiante nuevo dibuja su primer rung | < 2 min |
| Errores pedagógicos, no frustrantes | % de errores con mensaje explicativo + sugerencia | 100 % |
| Portabilidad | Funciona en Chrome/Edge actuales sin instalación, sin red, sin permisos especiales | Sí |
| Rendimiento | Redibujado en vivo de un programa de 100 rungs sin bloqueo perceptible (> 30 fps) | Sí |
| Recursos | RAM en uso | < 50 MB |

---

## 5. Alcance de la v1.0 (MVP)

**Dentro del alcance:**
- Consola de comandos (editor de texto multilínea, "netlist") con generación de ladder **en vivo** con cada Enter.
- Dialecto Mitsubishi reducido: `LD LDI AND ANI OR ORI ANB ORB MPS MRD MPP OUT SET RST` + temporizadores `OUT T# K#` + contadores `OUT C# K#` + `END` + comentarios con `;`.
- Validación estricta por línea (rechaza la línea inválida con mensaje) **y** panel lateral de errores de todo el programa con número de línea.
- Simulación interactiva: panel de interruptores para dispositivos X, ciclo de scan de 100 ms, resaltado de energía, RUN/PAUSE/RESET.
- Persistencia: guardar/abrir proyecto JSON en disco (File System Access API, con respaldo por descarga) + **autoguardado** con recuperación de sesión.
- Biblioteca de proyectos con listar/renombrar/duplicar/eliminar + **5 ejemplos precargados**.
- Exportación: SVG nativo, PNG (2x) y PDF vía impresión con hoja de estilos dedicada.
- Panel de ayuda con chuleta de instrucciones (cheat-sheet).

**Fuera del alcance v1.0 (v2+):** otros dialectos (Allen-Bradley, Siemens), conexión a PLC real o OpenPLC, colaboración en la nube, cuentas de usuario, zoom/pan avanzado, edición directa del diagrama con el ratón (arrastrar contactos), modo móvil táctil.

---

## 6. Requerimientos funcionales

| ID | Requerimiento | Prioridad |
|---|---|---|
| RF-01 | **Consola netlist**: editor multilínea monoespaciado con números de línea; acepta escritura tecla a tecla y pegado de bloques; normaliza espacios/tabs/CRLF; admite comentarios con `;`. | Debe |
| RF-02 | **Generación en vivo**: con cada Enter (o pegado) se re-parsea y re-renderiza el ladder completo en el panel SVG derecho, sin pulsar botones. | Debe |
| RF-03 | **Dialecto v1**: instrucciones del §9 con operandos `X/Y/M/T/C 0–255` y constantes `K 0–9999`. Instrucción no soportada = error claro. | Debe |
| RF-04 | **Validación estricta + panel de errores**: la línea inválida se marca en rojo en la consola y NO entra al modelo; el panel lista todos los errores (línea, texto, causa, sugerencia); clic en un error hace scroll a la línea. | Debe |
| RF-05 | **Simulación**: ciclo de scan cada 100 ms; interruptores ON/OFF para cada X usada; contactos/bobinas energizados se resaltan; timers acumulan tiempo (base 100 ms, no retentivos); contadores cuentan flanco de subida y se resetean con `RST`; RUN/PAUSE/RESET visibles. | Debe |
| RF-06 | **Guardar/abrir en disco**: Chrome/Edge usan File System Access (`.json`); en navegadores sin soporte, descarga + carga manual. El archivo de proyecto es JSON legible (§10). | Debe |
| RF-07 | **Autoguardado y recuperación**: cada cambio se guarda con debounce 800 ms en el navegador; al reabrir, banner "¿Recuperar la última sesión?" | Debe |
| RF-08 | **Biblioteca de proyectos**: modal con lista de proyectos guardados; crear, renombrar, duplicar, eliminar, abrir. Incluye 5 ejemplos precargados e inborrables (restaurables). | Debe |
| RF-09 | **Exportar**: SVG (vector), PNG (2x, fondo blanco) y PDF (impresión del diagrama solo, ocultando la UI). | Debe |
| RF-10 | **Ayuda**: panel lateral con chuleta de instrucciones (sintaxis + mini-ejemplo + qué dibuja). | Debe |
| RF-11 | **Estados vacíos**: con consola vacía el panel muestra un placeholder ilustrativo (rung de ejemplo fantasma) en vez de un lienzo vacío. | Debe |
| RF-12 | **Aviso de escala**: al superar ~100 rungs se avisa de posible degradación (no se bloquea nada). | Podría |

---

## 7. Requerimientos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | **Offline-first radical**: cero peticiones de red, cero CDN, cero fuentes remotas; el archivo HTML funciona desde `file://` con doble clic. |
| RNF-02 | **Vanilla JS sin frameworks ni build**: HTML5 + CSS3 + JavaScript ES2020 en un solo archivo; sin transpilación. |
| RNF-03 | **Ultraligero**: < 50 MB RAM, archivo < ~200 KB, arranque < 1 s en PC de laboratorio. |
| RNF-04 | **Navegadores objetivo**: Chrome y Edge actuales (≥ 100). Firefox funciona con degradación elegante (sin guardar a disco directo). |
| RNF-05 | **Permisos**: ninguno del sistema operativo; solo los permisos nativos del navegador para elegir archivos al guardar/abrir (a petición del usuario). |
| RNF-06 | **Accesibilidad básica**: contraste AA, foco visible, todo operable con teclado (atajos: F5 simular, Ctrl+S guardar, F1 ayuda). |
| RNF-07 | **Datos locales**: ningún dato sale del equipo; sin telemetría. |

---

## 8. Experiencia de usuario

### 8.1 Layout (pantalla única dividida)

```
┌──────────────────────────────────────────────────────────────────────┐
│ LadderHand   [Nuevo] [Guardar] [Abrir] [Biblioteca] [Exportar ▾] [Ayuda] │
├───────────────────────────────┬──────────────────────────────────────┤
│ CONSOLA (netlist)             │ DIAGRAMA LADDER (SVG, en vivo)       │
│ 1  LD X0                      │   ──┤X0├──┬──( Y0 )──                 │
│ 2  OR Y0                      │   ──┤Y0├──┘                            │
│ 3  ANI X1                     │   ──┤X1├─────────/────────            │
│ 4  OUT Y0                     │                                      │
│ 5  END                        │ ┌─────────────── Simulación ───────┐ │
│                               │ │ X0 ○──ON  X1 ●──OFF   [▶ RUN]    │ │
│ (borde rojo + msg si línea    │ └──────────────────────────────────┘ │
│  inválida)                    │ Panel de errores (si hay)            │
├───────────────────────────────┴──────────────────────────────────────┤
│ Barra de estado: 3 rungs · 5 líneas · guardado 12:04 · autoguardado ✓ │
└──────────────────────────────────────────────────────────────────────┘
```

- Densidad: **educativa moderna** — limpio, colores suaves, tipografía del sistema, diagrama protagonista con líneas de energía en color acento.
- Consola siempre visible a la izquierda (~35 %), diagrama a la derecha (~65 %), redimensionable arrastrando el divisor.
- Estética de consola tipo terminal (monoespaciada, números de línea), pero sin imitar hardware retro: la v1 apuesta por claridad.

### 8.2 Flujo principal del usuario (feliz path)

1. Abre `ladder-hand.html` con doble clic → pantalla dividida con ejemplo precargado.
2. Escribe o pega instrucciones en la consola (`LD X0` ⏎ …).
3. Cada Enter regenera el ladder a la derecha, al instante.
4. Escribe algo mal (`LDX0` o `AND`) → la línea se marca en rojo con mensaje + el panel de errores lo explica; la app sigue funcionando con el resto del programa.
5. Pulsa **RUN**: aparecen interruptores para cada X; los activa y ve la energía recorrer contactos y bobinas; los timers muestran su cuenta.
6. **Guardar** → elige carpeta y nombre (o descarga el `.json`); a partir de ahí, Guardar sobrescribe.
7. **Exportar** → SVG/PNG/PDF para apuntes o entrega.
8. Cierra y vuelve a abrir → banner "¿Recuperar última sesión?" restaura todo.

### 8.3 Estados de la interfaz

- **Vacío**: placeholder con rung fantasma + "Escribe LD X0 y pulsa Enter".
- **Con errores**: diagrama de lo parseable + líneas rojas + panel de errores; nunca se bloquea la edición.
- **Simulando**: interruptores activos, energía animada, botón pasa a PAUSE; RESET limpia estados Y/M/T/C (los interruptores X los deja como estén).
- **Sin soporte de guardado directo**: toast informativo una sola vez ("Tu navegador guardará por descarga").

---

## 9. Dialecto soportado en v1.0

| Instrucción | Sintaxis | Semántica | Dibuja |
|---|---|---|---|
| `LD` / `LDI` | `LD X0` | Inicia rung (o bloque) con contacto NO / NC | Contacto abierto/cerrado |
| `AND` / `ANI` | `AND X1` | Contacto NO / NC en serie | Contacto en la misma fila |
| `OR` / `ORI` | `OR Y0` | Contacto NO / NC en paralelo | Rama paralela |
| `ANB` | `ANB` | Serie entre los dos últimos bloques | Une dos ramas en serie |
| `ORB` | `ORB` | Paralelo entre los dos últimos bloques | Une dos ramas en paralelo |
| `MPS` / `MRD` / `MPP` | `MPS` | Bifurcación de salidas divergentes: `MPS` guarda la condición común, `MRD` la relee sin borrarla y `MPP` la restaura. Cada rama (entre `MRD`/`MPP`) lleva sus propias bobinas. Tras `MPP`, un `AND`/`OR`/`OUT` cuelga una rama hermana del bloque cerrado (equivalente a `MRD`) **sin reabrir su nivel de pila**, así el siguiente `MPP` sube un nivel más (no re-cierra el mismo bloque) | Conductor común con ramas verticales hacia varias bobinas |
| `OUT` | `OUT Y0` | Bobina (también válida para M) | Bobina |
| `SET` / `RST` | `SET M0` / `RST C0` | Enclavamiento / reset (Válido para Y, M, T, C) | Bobina S / bobina R |
| `OUT T# K#` | `OUT T0 K50` | Temporizador TON, base 100 ms (K50 = 5 s), no retentivo | Caja de timer con valor |
| `OUT C# K#` | `OUT C0 K10` | Contador ascendente por flanco de subida | Caja de contador |
| `END` | `END` | Fin de programa (obligatorio, uno solo) | — |
| `;` | `; comentario` | Comentario hasta fin de línea | — |

Operandos: `X, Y, M, T, C` numerados 0–255 (decimal — simplificación didáctica, documentada en la ayuda) y `K` 0–9999.

---

## 10. Modelo de datos

### 10.1 Archivo de proyecto (`.json`)

```json
{
  "schema": "ladderhand-project/v1",
  "name": "Motor arranque-paro",
  "createdAt": "2026-01-15T10:00:00Z",
  "modifiedAt": "2026-01-15T12:04:00Z",
  "code": "LD X0\nOR Y0\nANI X1\nOUT Y0\nEND",
  "settings": { "scanMs": 100 }
}
```

La fuente de verdad es **el texto de la consola** (`code`); el ladder siempre se deriva de él. Esto hace el formato a prueba de futuro y legible por humanos.

### 10.2 Modelo intermedio (IR, interno)

```
Programa → [Rung] + marcador END
Rung     → { línea, expresión: Nodo, bobinas: [Bobina] }
Nodo     → contacto(NO|NC, dispositivo)
          | serie([Nodo])
          | paralelo([Nodo])
          | identidad           (nodo neutro: la rama comparte la condición común)
          | fork{ base: Nodo, ramas: [{ nodo: Nodo, bobinas: [Bobina] }] }   (MPS/MRD/MPP)
Bobina   → out|set|rst en Y/M | timer(T#, K) | contador(C#, K)
```

El bloque `MPS/MRD/MPP` se representa con un nodo `fork`: `base` es la condición común guardada por `MPS` y cada rama es un nodo **relativo** a esa base (comienza en el nodo neutro `identidad`, de modo que la base no se duplica en el diagrama). El simulador evalúa `base` una vez y cada rama con `base ∧ rama`, aplicando las bobinas propias de cada rama.

---

## 11. Manejo de errores (matriz)

| Escenario | Comportamiento |
|---|---|
| Línea con sintaxis inválida | Se rechaza esa línea: borde rojo + mensaje inline; el resto del programa sí se procesa |
| `AND`/`OR`/`OUT` sin rung abierto (`LD` previo) | Error "Falta un LD/LDI antes de esta instrucción" con línea |
| `ANB`/`ORB` sin dos bloques disponibles | Error "No hay un bloque previo para combinar" con línea |
| `MPS`/`MRD`/`MPP` mal balanceados | `MRD`/`MPP` sin `MPS` → Error; `MPS` sin `MPP` al cerrar el rung → **Warning** (el diagrama se dibuja igual) |
| Rama `MPS`/`MRD`/`MPP` sin bobina | Error "La rama no tiene bobina" |
| `OUT`/`SET`/`RST`/`AND`/`OR` tras `MPP` | **Válido**: crea una rama hermana del bloque cerrado sobre su base (equivalente a `MRD`); no se encadena en serie ni se superpone |
| `LD`/`ANB`/`ORB`/`MPS` dentro de un bloque `MPS`/`MRD`/`MPP` | Error "no se usa dentro de un bloque MPS" |
| Rung sin bobina antes del siguiente `LD` | Error "El rung de la línea N no tiene bobina (OUT/SET/RST)" |
| Bloques `LD` sin combinar al llegar la bobina | **Warning + rama abierta**: cada `LD` abre una rama nueva en la barra izquierda; los bloques sin `ANB`/`ORB` se dibujan "al aire" (un extremo colgando) y el aviso recuerda combinarlos con `ANB`/`ORB` |
| Falta `END` o hay más de uno | Error con línea y sugerencia |
| Bobina OUT duplicada del mismo dispositivo en 2 rungs | Warning (no bloquea): "Y0 se escribe en 2 rungs; en scan gana el último" |
| Dispositivo X sin interruptor (no aparece en consola) | No aplica: los interruptores se generan de las X presentes en el código |
| Pegado con CRLF/tab/mayúsculas | Se normaliza automáticamente (trim, mayúsculas de instrucción, espacios múltiples a uno) |
| Guardar sin File System Access | Fallback a descarga + toast explicativo una sola vez |
| Cuota de almacenamiento llena al autoguardar | Toast con acción "Guardar ahora a disco" |
| Programa > 100 rungs | Aviso de rendimiento, no bloqueo |
| Cierre de pestaña durante simulación | Autoguardado previo conserva el código; la simulación no se guarda |

---

## 12. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Semántica ANB/ORB implementada distinta a GX Works | Media | Alto | Suite de netlists canónicas con su ladder esperado (§13 QA) verificadas contra GX Works |
| IndexedDB no disponible en `file://` (Chrome) | Alta | Medio | Autoguardado primario en `localStorage` (sí funciona en `file://`); IndexedDB solo si está disponible |
| Rendimiento SVG con muchos rungs | Baja | Medio | Re-render solo del ladder (no la UI), virtualización futura; aviso a partir de 100 rungs |
| Confusión numeración octal (GX) vs decimal (app) | Media | Bajo | Nota visible en la ayuda y en este PRD |
| Usuarios esperando editar con el ratón | Alta | Bajo | Mensaje en ayuda: v1 es "escribe para dibujar"; edición por ratón es v2 |

---

## 13. Criterios de aceptación de la v1.0

1. Doble clic en el HTML en Chrome/Edge sin internet: la app funciona completa (salvo guardar-a-disco directo si el navegador no soporta la API).
2. Las 5 netlists canónicas (arranque-paro, interbloqueo, semáforo 2 timers, contador de piezas, retardo al soltar) producen el ladder esperado, idéntico al de GX Works.
3. Cada instrucción del §9 con caso válido e inválido → validación correcta y mensaje con sugerencia.
4. Simulación del arranque-paro: X0 ON energiza Y0 y esta se auto-mantiene (enclavamiento); X1 ON la apaga; RESET limpia.
5. Timer `OUT T0 K10`: contacto T0 cierra tras 1 s de condición verdadera; se reinicia si la condición cae.
6. Contador `OUT C0 K3`: contacto C0 cierra al 3er flanco; `RST C0` lo limpia.
7. Guardar → abrir recupera el proyecto idéntico; autoguardado restaura la sesión tras cerrar sin guardar.
8. Export SVG/PNG/PDF del ejemplo semáforo produce archivos correctos y legibles.
9. Programa de 100 rungs se redibuja en vivo sin bloqueo perceptible.
10. Cero peticiones de red durante todo el uso (verificable en DevTools).

---

## 14. Visión v2+ (aspiracional, no comprometida)

Zoom/pan con Ctrl+rueda · edición de diagrama con ratón · más dialectos · export a formatos de fabricante · conexión a simuladores externos (OpenPLC) · modo proyector (diagrama a pantalla completa).
