# Abismo — Lo que la luz olvidó

RPG de exploración en 2.5D al estilo HD-2D (*Octopath Traveler 2*): una maqueta 3D con luces puntuales, focos con sombra, rayos de luz que bajan de la superficie, polvo que brilla al cruzarlos, profundidad de campo y resplandor. Los personajes son sprites de pixel art de pie dentro de la maqueta. Los combates pasan a un plano lateral en 2D, lentos y telegrafiados, a la manera de *The Dark Queen of Mortholme*.

No usa assets, dependencias ni paso de compilación. El pixel art está escrito como texto, la música se sintetiza en vivo con WebAudio (arpa, cuerdas, flauta, coro, campanas y taiko) y la fuente es bitmap propia. Solo three.js se carga desde un CDN.

## Jugar

Abre `index.html` en el navegador; no necesita servidor, pero la primera vez sí necesita internet para cargar three.js. Funciona en PC y en móvil. En móvil conviene jugar en horizontal.

| Acción | Teclado | Mando | Móvil |
|---|---|---|---|
| Moverse | WASD / flechas | Stick / cruceta | Joystick |
| Hablar / examinar / golpe | Z · Espacio · Enter | A | A |
| Volver / menú | X · Esc | B · Start | B · ≡ |
| Esquivar (combate) | Shift · C | RB | ESQ |
| Habilidades (combate) | 1 2 3 4 5 | LB + A B X Y RB | Botones |
| Habilidad que pide el sello | Q | Y | Y |

## El combate

El protagonista no mata: purifica. Cada infectado lleva **sellos** del pilar, y cada sello solo cede ante su habilidad: **Mente**, **Recuerdos**, **Cuerpo**, **Alma** o **Ser**. El golpe físico llena la **Resistencia** del enemigo hasta aturdirlo, y aturdido cede antes. Los ataques enemigos se ven venir (avisos en el suelo, columnas de luz, círculos de runas), y la esquiva te hace intocable mientras ruedas. Entre fases se habla. Si caes, la pelea se repite desde la fase en la que estabas.

- **Tharn, guardián del Claro**: 2 fases. En la segunda despiertas *Recuerdos*.
- **Oren, el antiguo líder**: inmune al daño físico. Se le libera con las cinco habilidades en orden, y cada una te devuelve un **fragmento de memoria** (5 en total). Al final cuenta la verdad.

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
js/art.js         pixel art: protagonista (3 vistas), planta-alma, hongos, hierba roja, farol
js/actors.js      habitantes como variantes del protagonista (marcas, cristales, colores)
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
