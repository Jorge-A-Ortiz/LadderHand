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
check('LD doble sin combinar → ANB implícito en serie con warning',
  a4.errors.length === 0 && a4.warnings.length === 1 &&
  a4.rungs.length === 1 && a4.rungs[0].expr.kind === 'series');
const a5 = Parser.parse('LD X0\nOUT Y0\nOUT T0 K50\nEND');
check('multi-bobina (OUT Y0 + OUT T0): 1 rung, 2 bobinas',
  a5.errors.length === 0 && a5.rungs.length === 1 && a5.rungs[0].coils.length === 2);

console.log('— Caso real de usuario: dos grupos ORB en cadena (ANB implícito) —');
const u1 = Parser.parse('LD X0\nAND X1\nLDI X2\nAND X3\nORB\nANI X4\nLD X5\nLD X6\nAND X7\nORB\nOUT Y0\nEND');
check('netlist del usuario: sin errores (solo 1 warning)', u1.errors.length === 0 && u1.warnings.length === 1,
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
