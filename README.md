# Abismo — Lo que la luz olvidó

RPG de exploración en 2.5D al estilo HD-2D (*Octopath Traveler 2*): una maqueta 3D con luces puntuales, focos con sombra, rayos de luz que bajan de la superficie, polvo que brilla al cruzarlos, profundidad de campo y resplandor. Los personajes son sprites de pixel art de pie dentro de la maqueta. Los combates pasan a un plano lateral en 2D, lentos y telegrafiados, a la manera de *The Dark Queen of Mortholme*.

No usa assets, dependencias ni paso de compilación. El pixel art está escrito como texto, la música se sintetiza en vivo con WebAudio (arpa, cuerdas, flauta, coro, campanas y taiko) y la fuente es bitmap propia. Solo three.js se carga desde un CDN.

## Jugar

Abre `index.html` en el navegador; no necesita servidor, pero la primera vez sí necesita internet para cargar three.js. Funciona en PC y en móvil. En móvil conviene jugar en horizontal.

| Acción | Teclado | Mando | Móvil |
|---|---|---|---|
| Moverse | WASD / flechas | Stick / cruceta | Joystick |
| Hablar / examinar / golpe | Z · Enter | A | A |
| Saltar | Espacio | X | SALTO |
| Volver / menú | X · Esc | B · Start | B · ≡ |
| Esquivar (combate) | Shift · C | RB | ESQ |
| Habilidades (combate) | 1 2 3 4 5 | LB + A B X Y RB | Botones |
| Habilidad que pide el sello | Q | Y | Y |

## El combate

Lucha lateral en 2D al estilo de los juegos de pelea (*Mortal Kombat*, *Street Fighter*), con cámara que sigue a los dos luchadores. El protagonista no mata: purifica. Arriba están tu **Luz** y la **Corrupción** del infectado. Cuando la Corrupción llega a cero, queda en trance y sale **¡PURIFÍCALO!**: hay que rematarlo con la habilidad de su sello (el medallón de arriba). Cada ronda es un sello, y entre rondas se habla.

- **Z** puño: púlsalo seguido y encadenas tres golpes; el tercero es un gancho que lo levanta.
- **X** patada · **↓ + Z** barrido · **en el aire, Z** patada aérea.
- **Espacio / ↑** saltar (esquiva ondas del suelo y embestidas) · **Shift** rodar · **mantén ←** (atrás) para bloquear, agachado para los golpes bajos.
- **Especiales**: botones **1-5**, o giros de joystick: ↓→ + Z = Mente · ↓← + Z = Recuerdos · ←→ + X = Cuerpo · →↓→ + Z = Alma · ↓↓ + X = Ser (necesita la **Resonancia** llena, que se carga golpeando y recibiendo golpes).
- Congelado breve al impactar, chispas, contador de golpes y barras que bajan con retardo.
- **Tharn, guardián del Claro**: 2 rondas (Mente y Recuerdos).
- **Oren, el antiguo líder**: inmune al daño físico; solo le afectan las habilidades. Cinco rondas, una por habilidad, y cada una te devuelve un **fragmento de memoria**. Al final cuenta la verdad.

## Escena 1: el despertar

Soren despierta a oscuras, solo con su respiración y las gotas. Abre los ojos poco a poco, con la vista borrosa, en una cueva de plantas de luz azules, verdes y moradas. Más adelante hay una zona de plantas y hongos rojos que le dan mala espina. En la pared del fondo cuelga el **mapa**, y a su lado una inscripción: «Él nos dará un nuevo futuro. Acéptalo, ámalo y entiéndelo...». Justo al salir de la cueva está el primer **artefacto de viaje**.

## Mapa y artefactos de viaje

Con el mapa, el menú muestra las zonas conocidas y dónde estás. Cada artefacto de viaje que actives aparece en el Mapa, y desde ahí puedes viajar a cualquiera de ellos. Hay tres en el prólogo (`G.ARTIFACTS`, en `js/scene.js`).

## Plantas-alma

En todo el Abismo hay 10 puntos de guardado. Cada uno es una planta que guarda una pequeña parte del alma de un ser, y solo en ellas se puede guardar. Al terminar la partida, el título ofrece **Regresar a una planta-alma** para volver a cualquiera de las que hayas despertado sin perder el progreso. En este prólogo hay tres; las otras siete están reservadas en `G.PLANTS` (en `js/scene.js`).

## Opciones visuales

Modo retro (CRT curvo, 320p, tramado y chiptune), líneas de barrido, tramado de color, píxel grueso, profundidad de campo, resplandor, calidad y volúmenes. Se guardan en el navegador.

## Estructura

```
index.html        lienzo, controles táctiles y carga de scripts
js/core.js        utilidades y entrada (teclado, táctil, mando)
js/font.js        fuente bitmap con tildes, ñ, ¿ y ¡
js/gfx.js         sprites desde texto, capa emisiva, fotogramas de caminar, marcos
js/art.js         pixel art: planta-alma, hongos, hierba roja, farol, fauna
js/prota.js       Soren desde su hoja de sprites (frente, espalda, perfil, agachado) partida en piezas animadas
js/actors.js      habitantes como variantes del mismo esqueleto (marcas, cristales, colores)
js/ambient.js     luciérnagas, esporas, niebla, gotas y fauna (polillas, grillos, peces, murciélagos)
js/audio.js       orquesta sintetizada, secuenciador, ambiente, efectos, modo chiptune
js/render.js      cadena de post-proceso: tilt-shift, bloom, gradación, viñeta, CRT
js/world3d.js     el mapa convertido en maqueta 3D: agua, pilar, luces, rayos, polvo
js/zones.js       las cuatro zonas del prólogo (mapas de texto, NPC, salidas)
js/scene.js       escenas como generadores, tareas y partida guardada
js/ui.js          diálogos con retrato, elecciones, carteles, memoria, menú
js/explore.js     exploración: movimiento, colisiones, hablar, salidas
js/combat.js      combate lateral 2D, sellos, ataques telegrafiados, interfaz
js/story.js       toda la historia y los diálogos
js/touch.js       joystick y botones para móvil
js/main.js        bucle principal, título y arranque
```

Los nombres de Mira, Suen, Varek, Tharn y Oren son provisionales: se cambian en `js/story.js` y en `G.WHO` (en `js/ui.js`).

## Modo de prueba

- `index.html?zona=aldea&x=5&y=13&flags=permiso` empieza en cualquier zona.
- `index.html?combate=oren&skills=mente,recuerdos,cuerpo,alma,ser` empieza directamente en un combate.
- `&turbo=8` acelera el juego (solo para pruebas automáticas).
