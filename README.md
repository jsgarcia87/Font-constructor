# Forja Heráldica: generador de fuente gótica pixel art

Generador de fuentes con estilo **heráldico y medieval-gótico** (textura, inspirado en el rótulo *Blanc IX*) y estética **pixel art**. El abecedario ya viene dibujado, con acentos y símbolos. No hace falta instalar nada: abre `index.html` en el navegador. Funciona sin conexión.

## Qué incluye

**241 glifos dibujados a mano** sobre una rejilla de 22 filas. Tienen fustes de 3 px, contraformas de 2 px, remates en rombo y hombros rotos a 45°:

| Grupo | Caracteres |
|---|---|
| Mayúsculas | `A–Z`, `Æ Œ` |
| Minúsculas | `a–z`, `ß æ œ ı ȷ` |
| Cifras | `0–9` |
| Acentos | `á à â ä ã å ā ă ą ç ć č é è ê ë ě ē ė ę ğ í ì î ï ī ñ ń ó ò ô ö õ ō ø ř š ś ş ú ù û ü ů ū ý ÿ ž ź ż` y sus mayúsculas (español, catalán, gallego, portugués, francés, alemán, italiano, checo, polaco, turco…) |
| Puntuación | `. , ; : ! ¡ ? ¿ ' " ‘ ’ “ ” « » ‹ › - – — _ ( ) [ ] { } / \ | … · • ^ ~` |
| Símbolos | `+ = * < > & @ # % $ € £ ¢ ¥ § ¶ ° ª º © ® ™ † ‡` |
| Ornamentos heráldicos | `⚜ ✠ ☩ ✝ ✚ ☨ ♔ ♛ ⚔ ⚑ ⛨ ♜ ♞ ♝ ☀ ☾ ★ ✶ ✦ ⚓ ⚖ ♦ ♣ ♥ ❦ ☙` |
| Figuras de blasón | León rampante, águila explayada, dragón, castillo, yelmo, espada, hacha de guerra, llave, cáliz, escudo, escudo cuartelado, campana, rosa heráldica, venera (concha de Santiago), cruz de Santiago y granada |

### Figuras de blasón

Unicode no tiene caracteres para estas figuras, así que están en el **área de uso privado**, de `U+E000` a `U+E00F`:

| Código | Figura | Código | Figura |
|---|---|---|---|
| `E000` | León rampante | `E008` | Cáliz |
| `E001` | Águila explayada | `E009` | Escudo |
| `E002` | Dragón | `E00A` | Escudo cuartelado |
| `E003` | Castillo | `E00B` | Campana |
| `E004` | Yelmo | `E00C` | Rosa heráldica |
| `E005` | Espada | `E00D` | Venera |
| `E006` | Hacha de guerra | `E00E` | Cruz de Santiago |
| `E007` | Llave | `E00F` | Granada |

* **En el generador:** pulsa su miniatura, debajo del cuadro de texto.
* **En la web**, con el kit CSS: escribe `&#xE003;` para el castillo, o usa `content: "\E003"` en CSS.
* **En Illustrator o Figma**, con la fuente instalada: usa el panel de glifos.

## Transformar todo el abecedario

Este panel aparece en el Generador y en el Abecedario, y modifica **todas las letras a la vez** sin perder el dibujo original. Los cambios se aplican a la vista previa, a las miniaturas y a todas las exportaciones (OTF, kit web, sprite sheet y PNG).

* **Grosor de los fustes:** de −1 (fina) a +3.
* **Grosor de los trazos horizontales:** de +0 a +2.
* **Pixelado:** bloques de 2×2 o 3×3, con un umbral ajustable. Para que las letras sigan siendo legibles, cada una prueba las posibles alineaciones de la rejilla gruesa y se queda con la que más se parece al dibujo original.
* **Anchura:** condensada, normal, ancha, expandida o muy expandida.
* **Inclinación:** cursiva en tres niveles, con el espaciado corregido.
* **Trazo:** macizo, hueco, grabado o sombreado.
* **Atajos:** Original, Negrita, Extra negra, Fina, 8 bits, Mosaico, Expandida, Condensada, Cursiva, Hueca, Grabada y Sombreada.
* **Fijar en los glifos:** convierte la transformación en el nuevo dibujo de cada letra, para seguir retocándola en el editor.

## Las tres pestañas

### Generador
Escribe el texto (admite varias líneas) y elige un estilo:

* **8 estilos predefinidos:** Blanc IX, Oro sobre gules, Manuscrito iluminado, Sable y argén, Grimorio, Torneo, Plata azur y Sello de lacre.
* **Composición:** tamaño de píxel, grosor (normal, negrita o extra negra), espaciado, interlineado, alineación y márgenes.
* **Esmalte de la letra:** paleta de esmaltes heráldicos (oro, argén, gules, azur, sable, sinople, púrpura…). El relleno puede ser liso, metálico, degradado por bandas, *cortado* (dos esmaltes) o alterno letra a letra. Hay una opción de relieve.
* **Contorno y sombra** en píxeles enteros.
* **Campo (fondo):** transparente, liso, cuero repujado, pergamino, ajedrezado, losanjado o estandarte con cola de golondrina. Se le puede añadir un marco doble con rombos.
* **Capitular iluminada:** la primera letra va en una caja diaprada.
* **Exportación:** PNG al tamaño elegido, SVG vectorial y copia al portapapeles.

### Abecedario
Muestra el repertorio completo. Pulsa un glifo para editarlo. Desde aquí se exporta la fuente:

* **.OTF** instalable. Sirve en Illustrator, Figma, Photoshop, Word, etc. Los contornos son limpios, trazados a partir de los píxeles.
* **Kit web:** un `.css` con `@font-face` que lleva la fuente incrustada. Para que se vea *pixel perfect*, usa tamaños múltiplos de 22 px.
* **Sprite sheet** en PNG, con su mapa `.json` para motores de juego.
* **Proyecto** `.json` para guardar y cargar tus ediciones.
* **Prueba en vivo:** la fuente se compila en el navegador y puedes escribir con ella.

### Editor de glifos
Es un editor de píxeles con guías de acentos, altura de mayúsculas, altura de x, línea base y descendentes.

* Tiene lápiz y goma, y permite cambiar el ancho, mover, hacer espejo, vaciar, copiar de otro carácter o restaurar el original.
* Si editas una letra base, **los acentos se actualizan solos**. Por ejemplo, al editar la `a` cambian también `á à â ä…`.
* Puedes escribir cualquier carácter nuevo en el selector para crearlo desde cero.
* Las ediciones se guardan automáticamente en el navegador.

## Estructura

```
index.html            interfaz
css/styles.css        estilos
js/glyphs.js          dibujos de los glifos (ASCII '#'/'.') y marcas diacríticas
js/engine.js          motor: matrices, composición de acentos, grosor y maquetación
js/render.js          efectos pixel art (esmaltes, contorno, sombra, fondos, capitular)
js/export.js          OTF (opentype.js), kit web, sprite sheet y proyecto
js/app.js             lógica de la interfaz y editor
js/vendor/            opentype.js 1.3.4 (licencia MIT)
```

Para retocar un glifo directamente en el código, edita su dibujo en `js/glyphs.js`. En el dibujo, `#` es un píxel encendido y `.` uno apagado.
