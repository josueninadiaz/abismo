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

## El combate: cada enemigo pelea a su manera

El protagonista no mata: purifica. Al final de cada fase el enemigo queda en trance y sale **¡PURIFÍCALO!**: se remata con la habilidad de su sello.

- **El habitante perdido (Senda), lucha tipo Mortal Kombat** (`js/combat.js`). Barras de Luz y Corrupción, combos de puño (Z), patada (X), barrido, patada aérea, bloquear manteniendo atrás, rodar (Shift) y especiales con 1-5 o con giros de joystick (↓→ + Z = Mente…).
- **Tharn, el guardián gigante del Claro, tiro tipo Cuphead** (`js/combat_tiro.js`). Mantén Z para disparar chispas de luz (↑ apunta arriba, ↓ agacharse), Espacio para saltar y **parar** los cristales cian en el aire (cargan cartas de Resonancia), X para el disparo potente y Shift para embestir. Tres golpes y caes. Dos fases con patrones distintos (pisotones, esquirlas, zarpazo; raíces, lluvia de cristal, salto de lado a lado) y aspecto de película antigua.
- **Oren, el antiguo líder, por turnos tipo Expedition 33** (`js/combat_turnos.js`). En tu turno eliges Golpe (da PA) o una habilidad (cuesta PA) y pulsas Z cuando el anillo se cierra para un golpe perfecto. En el suyo: Shift esquiva, Z **para** justo en el golpe (da PA; si paras todos, contraatacas) y Espacio salta las ondas. Un destello blanco avisa de cada golpe. Cinco sellos, cinco fragmentos de memoria.

El estilo de cada enemigo está en `G.FIGHT_STYLE` (`js/story.js`).

## Caminos sutiles

Piedrecitas doradas muy tenues en el suelo laten en la dirección a seguir: en la gruta, hacia el mapa y luego hacia la salida (no se puede salir sin el mapa); en la aldea, hacia Suen, luego hacia Varek y después hacia el paso del norte. Se definen con `guides` en `js/zones.js`.

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
