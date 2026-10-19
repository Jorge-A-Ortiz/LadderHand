// Tests del parser/layout de LadderHand (sección pura del archivo único)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'ladder-hand.html'), 'utf8');
const pure = src.split('// ==PURE-START==')[1].split('// ==PURE-END==')[0];
const { Parser, Ladder } = new Function(pure + '\nreturn { Dialect, Parser, Ladder };')();

let pass = 0, fail = 0;
function check(name, cond, extra){
  if (cond){ pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? ' — ' + extra : '')); }
}

console.log('— Netlists canónicas (5 ejemplos) —');

const ex1 = Parser.parse('LD X0\nOR Y0\nANI X1\nOUT Y0\nEND');
check('arranque-paro: sin errores', ex1.errors.length === 0, JSON.stringify(ex1.errors));
check('arranque-paro: 1 rung', ex1.rungs.length === 1);
check('arranque-paro: bobina OUT Y0',
  ex1.rungs[0].coils.length === 1 && ex1.rungs[0].coils[0].kind === 'out' && ex1.rungs[0].coils[0].dev === 'Y0');
check('arranque-paro: serie(paralelo(X0,Y0), NC X1)',
  ex1.rungs[0].expr.kind === 'series' &&
  ex1.rungs[0].expr.children[0].kind === 'parallel' &&
  ex1.rungs[0].expr.children[0].children[1].dev === 'Y0' &&
  ex1.rungs[0].expr.children[1].pol === 'NC');

const ex2 = Parser.parse('LD X0\nANI X2\nANI Y1\nOUT Y0\nLD X1\nANI X2\nANI Y0\nOUT Y1\nEND');
check('inversión: sin errores, 2 rungs', ex2.errors.length === 0 && ex2.rungs.length === 2);

const ex3 = Parser.parse('LD X0\nOUT M0\nLD M0\nANI T1\nOUT Y0\nOUT T0 K30\nLD T0\nOUT Y1\nOUT T1 K30\nEND');
check('semáforo: sin errores, 3 rungs', ex3.errors.length === 0 && ex3.rungs.length === 3);
check('semáforo: timer T0 K30', ex3.rungs[1].coils.some(c => c.kind === 'timer' && c.dev === 'T0' && c.preset === 30));

const ex4 = Parser.parse('LD X1\nRST C0\nLD X0\nOUT C0 K10\nLD C0\nOUT Y0\nEND');
check('contador: sin errores, 3 rungs', ex4.errors.length === 0 && ex4.rungs.length === 3);
check('contador: bobina counter K10', ex4.rungs[1].coils[0].kind === 'counter' && ex4.rungs[1].coils[0].preset === 10);
check('contador: RST C0', ex4.rungs[0].coils[0].kind === 'rst' && ex4.rungs[0].coils[0].dev === 'C0');

const ex5 = Parser.parse('LD X0\nOR Y0\nANI T0\nOUT Y0\nLDI X0\nAND Y0\nOUT T0 K50\nEND');
check('bomba off-delay: sin errores, 2 rungs', ex5.errors.length === 0 && ex5.rungs.length === 2);

console.log('— Errores esperados —');
check('AND sin LD → error', Parser.parse('AND X1\nEND').errors.some(e => /LD/.test(e.cause)));
check('ANB sin bloques → error', Parser.parse('ANB\nEND').errors.some(e => /bloque/.test(e.cause)));
check('rung sin bobina (END sin OUT) → error',
  Parser.parse('LD X0\nAND X1\nEND').errors.some(e => /no tiene bobina/.test(e.cause)));
check('dispositivo inválido X300 → error',
  Parser.parse('LD X300\nOUT Y0\nEND').errors.some(e => /dispositivo/i.test(e.cause)));
check('AND tras bobina → error',
  Parser.parse('LD X0\nOUT Y0\nAND X1\nEND').errors.some(e => /después de la bobina/.test(e.cause)));
check('OUT T0 sin K → error', Parser.parse('LD X0\nOUT T0\nEND').errors.some(e => /preset K/.test(e.cause)));
check('falta END → error', Parser.parse('LD X0\nOUT Y0').errors.some(e => /Falta END/.test(e.cause)));
check('código tras END → error',
  Parser.parse('LD X0\nOUT Y0\nEND\nOR X1').errors.some(e => /después de END/.test(e.cause)));
check('instrucción no reconocida → error',
  Parser.parse('FOO X1\nEND').errors.some(e => /no reconocida/.test(e.cause)));
check('SET sobre timer → error', Parser.parse('LD X0\nSET T0 K5\nEND').errors.length > 0);
check('END con operando → error',
  Parser.parse('LD X0\nOUT Y0\nEND X0').errors.some(e => /no lleva operandos/.test(e.cause)));

console.log('— Normalización y avisos —');
const n1 = Parser.parse('ld x0\nor    y0\nani x1\nout y0 ; enclavamiento\nend');
check('minúsculas + espacios + comentario: OK', n1.errors.length === 0 && n1.rungs.length === 1);
const w1 = Parser.parse('LD X0\nOUT Y0\nLD X1\nOUT Y0\nEND');
check('OUT duplicada → warning (sin error)', w1.warnings.length === 1 && w1.errors.length === 0);
const c1 = Parser.parse('   \n; solo comentarios\n');
check('solo comentarios → vacío sin errores', c1.empty === true && c1.errors.length === 0);

console.log('— ANB/ORB (pila de bloques) —');
const a1 = Parser.parse('LD X0\nLD X1\nORB\nOUT Y0\nEND');
check('ORB: paralelo de bloques', a1.errors.length === 0 && a1.rungs.length === 1 && a1.rungs[0].expr.kind === 'parallel');
const a2 = Parser.parse('LD X0\nLD X1\nANB\nOUT Y0\nEND');
check('ANB: serie de bloques', a2.errors.length === 0 && a2.rungs[0].expr.kind === 'series');
const a3 = Parser.parse('LD X0\nLD X1\nORB\nLD X2\nANB\nOUT Y0\nEND');
check('ANB tras ORB: serie(paralelo, X2)',
  a3.errors.length === 0 && a3.rungs[0].expr.kind === 'series' && a3.rungs[0].expr.children[0].kind === 'parallel');
const a4 = Parser.parse('LD X0\nLD X1\nOUT Y0\nEND');
check('LD doble sin combinar → rama abierta (al aire) con warning',
  a4.errors.length === 0 && a4.warnings.length === 1 &&
  a4.rungs.length === 1 &&
  a4.rungs[0].expr.kind === 'contact' && a4.rungs[0].expr.dev === 'X1' &&
  a4.rungs[0].open.length === 1 && a4.rungs[0].open[0].dev === 'X0');
check('LD doble: layout dibuja 1 banda con 1 rama abierta',
  Ladder.layout(a4).bands.length === 1 && Ladder.layout(a4).bands[0].openH === 1);
const a5 = Parser.parse('LD X0\nOUT Y0\nOUT T0 K50\nEND');
check('multi-bobina (OUT Y0 + OUT T0): 1 rung, 2 bobinas',
  a5.errors.length === 0 && a5.rungs.length === 1 && a5.rungs[0].coils.length === 2);

console.log('— MPS/MRD/MPP (bifurcación de salidas divergentes) —');
const m1 = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y1\nMRD\nAND X2\nOUT Y2\nMRD\nAND X3\nOUT Y3\nMPP\nEND');
check('MPS/MRD/MPP: sin errores, 1 rung', m1.errors.length === 0 && m1.rungs.length === 1, JSON.stringify(m1.errors));
check('MPS: expr es fork con 3 ramas', m1.rungs[0].expr.kind === 'fork' && m1.rungs[0].expr.arms.length === 3);
check('MPS: base = contacto X0', m1.rungs[0].expr.base.kind === 'contact' && m1.rungs[0].expr.base.dev === 'X0');
check('MPS: cada rama lleva su bobina (Y1|Y2|Y3)',
  m1.rungs[0].expr.arms.map(a => a.coils.map(c => c.dev).join()).join('|') === 'Y1|Y2|Y3');
check('MPS: rama = serie(identidad, X1)',
  m1.rungs[0].expr.arms[0].node.kind === 'series' &&
  m1.rungs[0].expr.arms[0].node.children[0].kind === 'identity' &&
  m1.rungs[0].expr.arms[0].node.children[1].dev === 'X1');
check('MPS: las ramas no repiten el contacto base X0', !JSON.stringify(m1.rungs[0].expr.arms).includes('X0'));
const lm = Ladder.layout(m1);
check('MPS: layout 1 banda de 3 filas y 2 celdas de ancho',
  lm.bands.length === 1 && lm.bands[0].hCells === 3 && lm.bands[0].exprW === 2);
const m2 = Parser.parse('LD X0\nMPS\nOR X1\nOUT Y1\nMRD\nAND X2\nOUT Y2\nMPP\nEND');
check('MPS: rama con OR = parallel(identidad, X1)',
  m2.errors.length === 0 && m2.rungs[0].expr.arms[0].node.kind === 'parallel' &&
  m2.rungs[0].expr.arms[0].node.children[0].kind === 'identity');
const m3 = Parser.parse('LD X0\nOR X1\nMPS\nAND X2\nOUT Y0\nOUT T0 K50\nMRD\nAND X3\nOUT Y1\nMPP\nEND');
check('MPS: base compuesta (par) y rama con 2 bobinas',
  m3.errors.length === 0 && m3.rungs[0].expr.base.kind === 'parallel' &&
  m3.rungs[0].expr.arms[0].coils.length === 2 && m3.rungs[0].expr.arms[0].coils[1].kind === 'timer');
check('MRD sin MPS → error', Parser.parse('LD X0\nMRD\nOUT Y0\nEND').errors.some(e => /MPS previo/.test(e.cause)));
check('MPP sin MPS → error', Parser.parse('LD X0\nMPP\nOUT Y0\nEND').errors.some(e => /MPS previo/.test(e.cause)));
check('MPS sin MPP → warning (no error)',
  (() => { const r = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y1\nEND');
    return r.errors.length === 0 && r.warnings.some(w => /MPP/.test(w.cause)) && r.rungs.length === 1; })());
check('rama MPS sin bobina → error',
  Parser.parse('LD X0\nMPS\nAND X1\nMRD\nAND X2\nOUT Y2\nMPP\nEND').errors.some(e => /rama MPS anterior no tiene bobina/.test(e.cause)));
check('LD dentro de MPS: sub-bloque de la rama (no error)',
  (() => { const r = Parser.parse('LD X0\nMPS\nLD X1\nAND X2\nANB\nOUT Y1\nMPP\nEND');
    const f = r.rungs[0] && r.rungs[0].expr;
    return r.errors.length === 0 && f && f.kind === 'fork' && f.arms.length === 1 &&
      f.arms[0].coils[0].dev === 'Y1' && f.base.dev === 'X0'; })(),
  JSON.stringify(Parser.parse('LD X0\nMPS\nLD X1\nAND X2\nANB\nOUT Y1\nMPP\nEND').errors));
check('ANB/ORB dentro de MPS: ejemplo oficial Mitsubishi (3 ramas)',
  (() => { const r = Parser.parse(
      'LD X0\nMPS\nLD X1\nOR X2\nANB\nOUT Y0\nMRD\nLD X3\nAND X4\nLD X5\nAND X6\nORB\nANB\nOUT Y1\nMPP\nAND X7\nOUT Y2\nEND');
    const f = r.rungs[0] && r.rungs[0].expr;
    const devs = f ? f.arms.map(a => a.coils[0] && a.coils[0].dev) : [];
    return r.errors.length === 0 && f && f.kind === 'fork' && f.arms.length === 3 &&
      f.base.dev === 'X0' && devs.join(',') === 'Y0,Y1,Y2'; })(),
  JSON.stringify(Parser.parse('LD X0\nMPS\nLD X1\nOR X2\nANB\nOUT Y0\nMRD\nLD X3\nAND X4\nLD X5\nAND X6\nORB\nANB\nOUT Y1\nMPP\nAND X7\nOUT Y2\nEND').errors));
check('MPS tras bobina → error',
  Parser.parse('LD X0\nOUT Y0\nMPS\nAND X1\nOUT Y1\nMPP\nEND').errors.some(e => /antes de la primera bobina/.test(e.cause)));
check('OUT tras MPP: rama hermana sobre la base (no error)',
  (() => { const r = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y1\nMPP\nOUT Y0\nEND');
    const f = r.rungs[0] && r.rungs[0].expr;
    return r.errors.length === 0 && f && f.kind === 'fork' && f.arms.length === 2 &&
      f.arms[0].coils[0].dev === 'Y1' && f.arms[1].coils[0].dev === 'Y0'; })(),
  JSON.stringify(Parser.parse('LD X0\nMPS\nAND X1\nOUT Y1\nMPP\nOUT Y0\nEND').errors));
check('MPS con operando → error',
  Parser.parse('LD X0\nMPS X1\nOUT Y0\nEND').errors.some(e => /no lleva operandos/.test(e.cause)));
check('MRD/MPP con operando → error',
  Parser.parse('LD X0\nMPS\nOUT Y1\nMRD X1\nEND').errors.some(e => /no lleva operandos/.test(e.cause)));

console.log('— MPS anidado (punto de guardado dentro de una rama) —');
const nn1 = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y0\nMRD\nAND X2\nMPS\nOUT Y1\nMRD\nAND X3\nOUT Y2\nEND');
check('MPS anidado: sin errores (solo avisa de MPP faltante)',
  nn1.errors.length === 0 && nn1.warnings.some(w => /MPP/.test(w.cause)), JSON.stringify(nn1.errors));
check('MPS anidado: 1 rung con fork externo de 2 ramas',
  nn1.rungs.length === 1 && nn1.rungs[0].expr.kind === 'fork' && nn1.rungs[0].expr.arms.length === 2);
check('MPS anidado: la 2ª rama contiene un fork interno',
  nn1.rungs[0].expr.arms[1].node.kind === 'fork' && nn1.rungs[0].expr.arms[1].node.arms.length === 2);
check('MPS anidado: bobinas Y0|Y1|Y2 en las hojas',
  (() => { const f = nn1.rungs[0].expr; return f.arms[0].coils[0].dev === 'Y0' &&
    f.arms[1].node.arms[0].coils[0].dev === 'Y1' && f.arms[1].node.arms[1].coils[0].dev === 'Y2'; })());
check('MPS anidado: la base interna reusa la identidad externa (X0 no se duplica)',
  !JSON.stringify(nn1.rungs[0].expr.arms[1].node.base).includes('X0'));
const dn1 = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y0\nMRD\nAND X2\nMPS\nOUT Y1\nMRD\nAND X3\nOUT Y2\nMPP\nMPP\nEND');
check('MPS anidado con MPP doble: sin errores ni warnings',
  dn1.errors.length === 0 && dn1.warnings.length === 0, JSON.stringify(dn1.warnings));
check('MPS anidado: layout dibuja 1 banda y ancho 3 celdas',
  (() => { const l = Ladder.layout(nn1); return l.bands.length === 1 && l.bands[0].exprW === 3; })());

// Tras MPP, un AND/OR/OUT posterior es una rama hermana del bloque cerrado (equivale a MRD),
// no una continuación en serie: evita que X5/Y4 se superpongan con Y1.
const pm1 = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y0\nMRD\nAND X2\nMPS\nOUT Y1\nMRD\nAND X3\nOUT Y2\nMRD\nAND X4\nOUT Y3\nMPP\nAND X5\nOUT Y4\nEND');
check('MPP + AND/OUT: sin errores', pm1.errors.length === 0, JSON.stringify(pm1.errors));
check('MPP + AND/OUT: 1 rung con fork externo de 2 ramas',
  pm1.rungs.length === 1 && pm1.rungs[0].expr.kind === 'fork' && pm1.rungs[0].expr.arms.length === 2);
const inner = pm1.rungs[0].expr.arms[1].node;
check('MPP + AND/OUT: el fork interno gana una 4ª rama hermana (Y1|Y2|Y3|Y4)',
  inner.kind === 'fork' && inner.arms.length === 4 &&
  ['Y1', 'Y2', 'Y3', 'Y4'].every((y, i) => inner.arms[i].coils[0].dev === y), JSON.stringify(inner.arms.map(a => a.coils)));
check('MPP + AND/OUT: X5 vive en la rama nueva, no en la base interna',
  inner.arms[3].node.kind === 'series' && inner.arms[3].node.children[1].dev === 'X5' &&
  !JSON.stringify(inner.base).includes('X5'));
check('MPP + AND/OUT: layout 1 banda de 5 filas (rama hermana en fila propia)',
  (() => { const l = Ladder.layout(pm1); return l.bands.length === 1 && l.bands[0].hCells === 5; })());

// El 2º MPP debe subir al nivel del 1er MPS: AND X6 cuelga de X0 (hermano de X2), no del fork interno.
const pm2 = Parser.parse('LD X0\nMPS\nAND X1\nOUT Y0\nMRD\nAND X2\nMPS\nOUT Y1\nMRD\nAND X3\nOUT Y2\nMRD\nAND X4\nOUT Y3\nMPP\nAND X5\nOUT Y4\nMPP\nAND X6\nOUT Y5\nEND');
check('MPP anidado doble: sin errores ni warnings (MPS/MPP balanceados)',
  pm2.errors.length === 0 && pm2.warnings.length === 0, JSON.stringify({ e: pm2.errors, w: pm2.warnings }));
const f1b = pm2.rungs[0].expr;
check('MPP doble: el fork externo gana una 3ª rama (X2-fork | X6)',
  f1b.kind === 'fork' && f1b.arms.length === 3 && f1b.arms[1].node.kind === 'fork' &&
  f1b.arms[0].coils[0].dev === 'Y0' && f1b.arms[2].coils[0].dev === 'Y5');
check('MPP doble: Y5 cuelga de la base X0 (X6 en serie, no en la base interna)',
  f1b.arms[2].node.kind === 'series' && f1b.arms[2].node.children[1].dev === 'X6');
check('MPP doble: el fork interno conserva Y1|Y2|Y3|Y4',
  f1b.arms[1].node.arms.length === 4 &&
  ['Y1', 'Y2', 'Y3', 'Y4'].every((y, i) => f1b.arms[1].node.arms[i].coils[0].dev === y));
check('MPP doble: layout 1 banda de 6 filas (Y5 en fila propia bajo X0)',
  (() => { const l = Ladder.layout(pm2); return l.bands.length === 1 && l.bands[0].hCells === 6; })());

console.log('— Caso real de usuario: dos grupos ORB en cadena (ANB explícito) —');
const u1 = Parser.parse('LD X0\nAND X1\nLDI X2\nAND X3\nORB\nANI X4\nLD X5\nLD X6\nAND X7\nORB\nANB\nOUT Y0\nEND');
check('netlist del usuario: sin errores ni warnings', u1.errors.length === 0 && u1.warnings.length === 0,
  JSON.stringify({ e: u1.errors, w: u1.warnings }));
check('netlist del usuario: 1 rung', u1.rungs.length === 1);
const eU = u1.rungs[0].expr;
check('netlist del usuario: serie(par(X0X1 ∥ /X2X3, /X4), par(X5, serie(X6,X7)))',
  eU.kind === 'series' &&
  eU.children[0].kind === 'series' && eU.children[0].children[0].kind === 'parallel' &&
  eU.children[0].children[1].pol === 'NC' &&
  eU.children[1].kind === 'parallel' && eU.children[1].children[1].kind === 'series');
check('netlist del usuario: bobina OUT Y0', u1.rungs[0].coils[0].dev === 'Y0');
check('netlist del usuario: layout genera 1 banda', Ladder.layout(u1).bands.length === 1);

console.log('— MC / MCR (control maestro) —');
const mc1 = Parser.parse('LD X0\nMC N0 M100\nLD X1\nOUT Y0\nLD X2\nOUT Y1\nMCR N0\nEND');
check('MC/MCR simple: sin errores ni warnings', mc1.errors.length === 0 && mc1.warnings.length === 0,
  JSON.stringify({ e: mc1.errors, w: mc1.warnings }));
check('MC/MCR simple: 4 rungs (cond MC, 2 de zona, MCR)',
  mc1.rungs.length === 4 && mc1.rungs[0].mcOpen.level === 0 && mc1.rungs[0].mcOpen.dev === 'M100' &&
  mc1.rungs[0].coils.length === 0 && mc1.rungs[3].mcrClose === 0);
check('MC/MCR: el rung de MC lleva la condición (X0) y sin bobina',
  mc1.rungs[0].expr.kind === 'contact' && mc1.rungs[0].expr.dev === 'X0');
check('MC/MCR: layout 1 barra que abarca toda la zona',
  (() => { const l = Ladder.layout(mc1); return l.spans.length === 1 && l.spans[0].level === 0 &&
    l.spans[0].yBottom > l.spans[0].yTop; })());
check('MC/MCR: los rungs de la zona arrancan desplazados (x0 > RAIL_L)',
  (() => { const l = Ladder.layout(mc1); return l.bands[1].x0 > Ladder.RAIL_L &&
    l.bands[1].x0 === l.spans[0].barX; })());
check('MC sin operando → N0',
  (() => { const r = Parser.parse('LD X0\nMC\nLD X1\nOUT Y0\nMCR\nEND');
    return r.errors.length === 0 && r.rungs[0].mcOpen.level === 0 && r.rungs[2].mcrClose === 0; })(),
  JSON.stringify(Parser.parse('LD X0\nMC\nLD X1\nOUT Y0\nMCR\nEND').errors));
check('MC sin condición → error',
  Parser.parse('MC N0 M100\nLD X1\nOUT Y0\nMCR N0\nEND').errors.some(e => /Falta la condición/.test(e.cause)));
check('MC tras bobina → error',
  Parser.parse('LD X0\nOUT Y0\nMC N0\nEND').errors.some(e => /antes de cualquier bobina|Falta la condición/.test(e.cause)));
check('MC N1 sin N0 → error de orden',
  Parser.parse('LD X0\nMC N1\nLD X1\nOUT Y0\nMCR N1\nEND').errors.some(e => /fuera de orden/.test(e.cause)));
check('MC con operando inválido → error',
  Parser.parse('LD X0\nMC X1\nLD X2\nOUT Y0\nMCR N0\nEND').errors.some(e => /operando inválido/.test(e.cause)));
check('MCR sin MC → error',
  Parser.parse('LD X0\nOUT Y0\nMCR N0\nEND').errors.some(e => /sin un MC N0 abierto/.test(e.cause)));
check('MC sin MCR → warning (no error)',
  (() => { const r = Parser.parse('LD X0\nMC N0\nLD X1\nOUT Y0\nEND');
    return r.errors.length === 0 && r.warnings.some(w => /MCR/.test(w.cause)); })());
check('MC dentro de MPS → error',
  Parser.parse('LD X0\nMPS\nMC N0\nLD X1\nOUT Y0\nMPP\nEND').errors.some(e => /dentro de un bloque MPS/.test(e.cause)));

const mcN = Parser.parse('LD X0\nMC N0\nLD X1\nOUT Y0\nLD X2\nMC N1\nLD X3\nOUT Y1\nMCR N1\nLD X4\nOUT Y2\nMCR N0\nEND');
check('MC anidado: sin errores', mcN.errors.length === 0, JSON.stringify(mcN.errors));
check('MC anidado: profundidades 0,1,1,2,2,1,1',
  (() => { const d = Ladder.layout(mcN).bands.map(b => b.depth); return d.join(',') === '0,1,1,2,2,1,1'; })());
check('MC anidado: 2 barras (N1 dentro de N0, más a la derecha)',
  (() => { const l = Ladder.layout(mcN);
    const s0 = l.spans.find(s => s.level === 0), s1 = l.spans.find(s => s.level === 1);
    return l.spans.length === 2 && s0.barX < s1.barX && s1.yTop > s0.yTop && s1.yBottom < s0.yBottom; })());
check('MCR N0 con dos niveles abiertos cierra ambos (sin warning)',
  (() => { const r = Parser.parse('LD X0\nMC N0\nLD X1\nMC N1\nLD X2\nOUT Y0\nMCR N0\nEND');
    return r.errors.length === 0 && r.warnings.length === 0; })(),
  JSON.stringify({ e: Parser.parse('LD X0\nMC N0\nLD X1\nMC N1\nLD X2\nOUT Y0\nMCR N0\nEND').errors }));

console.log('— Layout y rendimiento —');
const lay = Ladder.layout(ex1);
check('layout: 1 banda con medidas', lay.bands.length === 1 && lay.width > 0 && lay.height > 0);

const lines = [];
for (let i = 0; i < 120; i++){ lines.push('LD X0', 'AND X1', 'OUT Y0'); }
lines.push('END');
const big = Parser.parse(lines.join('\n'));
check('120 rungs parsean sin error', big.errors.length === 0 && big.rungs.length === 120);
const t0 = Date.now();
Ladder.layout(big);
const dt = Date.now() - t0;
check('layout de 120 rungs < 50 ms', dt < 50, dt + ' ms');

console.log('\nResultado: ' + pass + ' ✓ · ' + fail + ' ✗');
process.exit(fail ? 1 : 0);
