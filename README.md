# Florilegio

Un jardín digital interactivo para descubrir lo que las flores han aprendido a decir por nosotros. Veinticinco flores ilustradas a mano en SVG, cada una con su propia animación y tres lecturas: poética, cultural y científica.

Incluye una sección especial, **«Esos días que no hubo»**: una sola rosa amarilla que se abre despacio, acompañada de un texto breve sobre el significado de las flores amarillas.

## Cómo abrirlo

No necesita instalación ni compilación. Hay dos formas:

1. **Directo:** abre `index.html` con doble clic en cualquier navegador moderno.
2. **Con servidor local** (útil para probar en otros dispositivos de la misma red):

   ```bash
   python -m http.server 5173
   ```

   Luego visita <http://localhost:5173>.

Las tipografías (Cormorant, Newsreader y Jost) se cargan desde Google Fonts. Sin conexión, la página sigue funcionando con las fuentes de respaldo del sistema.

## Qué contiene

- **Jardín vivo:** las flores crecen al cargar, se mecen con la brisa, se inclinan cuando el cursor se acerca y se mueven en capas de profundidad (parallax). Pétalos y polen flotan de fondo.
- **Una animación por especie:** la rosa abre sus anillos, el girasol sigue al cursor, el tulipán se inclina antes de abrirse, la margarita se deshoja («me quiere, no me quiere»), el diente de león suelta semillas, la hortensia cambia de color según la acidez del suelo, el loto emerge del agua, el nomeolvides despliega sus flores una a una, el jazmín se abre al anochecer, entre otras.
- **Ficha de cada flor:** significado poético, significado cultural (con notas cuando cambia según la cultura) y mirada científica (nombre científico, familia, origen, crecimiento, polinización y una curiosidad).
- **Explorar:** búsqueda y filtros por significado, color y estación. Las flores coincidentes se resaltan en el jardín.
- **Enlaces directos:** `index.html#girasol` abre esa flor; `index.html#esos-dias` abre la sección especial.
- **Modo oscuro** automático (jardín nocturno), según la preferencia del sistema.
- **Accesibilidad:** navegación con teclado (Tab, Enter, Esc, flechas ← →) y respeto por `prefers-reduced-motion`.
- **Responsive:** en móvil el jardín se vuelve una composición vertical que se recorre con scroll.

## Estructura

```
index.html          Estructura de la página
css/styles.css      Estilos, temas claro/oscuro y animaciones de cada especie
js/core.js          Utilidades y primitivas de dibujo (pétalos, hojas, degradados)
js/data-a.js        Fichas de las flores (primera parte)
js/data-b.js        Fichas de las flores (segunda parte), significados, colores y estaciones
js/art-a.js         Ilustraciones: rosa, tulipán, girasol, peonía, lirio, orquídea,
                    margarita, lavanda, hortensia, clavel, camelia, gardenia
js/art-b.js         Ilustraciones: jazmín, dalia, crisantemo, cerezo, nomeolvides,
                    loto, diente de león, amapola, iris, jacinto
js/art-stems.js     Tallos, hojas y agua de cada planta
js/particles.js     Pétalos, polen, semillas y aromas en canvas
js/garden.js        Composición del jardín, brisa, parallax y reacción al cursor
js/focus.js         Vista en primer plano, comportamiento de cada especie y ficha
js/explore.js       Buscador y filtros
js/days.js          Sección «Esos días que no hubo»
js/main.js          Arranque, bucle de animación, teclado y enlaces directos
```

Los scripts son clásicos (sin módulos) y comparten el espacio de nombres `window.FL`, por eso la página funciona también desde `file://`.

## Agregar una flor

1. Añade su ficha con `F.push({...})` en `js/data-a.js` o `js/data-b.js`. Copia la forma de una existente: `id`, `name`, `sci`, `family`, `art`, `pal`, `colors`, `seasons`, `meanings`, `poetic`, `culture` y `science`.
2. Si su forma es nueva, dibuja su cabeza en `FL.art.<nombre>` (en `art-a.js` o `art-b.js`) y define su tallo en `FL.stemCfg` (`art-stems.js`). También puede reutilizar un dibujo existente con otra paleta, como hacen las cuatro rosas.
3. Define sus estados de reposo y apertura en `css/styles.css` (bloque `.sp-<nombre>`).
4. Ubícala en una fila del jardín: listas `BACK`, `MID` o `FRONT` en `js/garden.js`.

## Navegadores compatibles

Versiones recientes de Chrome, Edge, Safari y Firefox. La página usa propiedades de transformación individuales (`rotate`, `scale`, `translate`), `color-mix()` y `:has()`. Como referencia: Chrome/Edge 111+, Safari 16.4+ y Firefox 121+.

## Sobre el contenido

Los significados culturales resumen tradiciones documentadas; cuando una lectura depende del lugar o la época, la ficha lo indica. Algunos relatos se presentan como tradición contada («se cuenta que…») porque su origen histórico es incierto. Si vas a difundir la página, conviene revisar las fichas contra fuentes primarias.
