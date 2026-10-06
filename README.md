# Florilegio

Florilegio nace para todas las personas que quieren regalar flores o un ramo y no saben cómo armarlo, ni por dónde empezar: para quien simplemente no sabe y necesita ayuda.

Es un jardín digital interactivo: treinta y una flores ilustradas a mano en SVG, cada una con su propia animación y cuatro lecturas: poética, cultural, científica y de cuidados. Además, un taller para armar ramos propios y leer lo que dicen, un mostrador de ramos tradicionales de Occidente y una vista para quien recibe un ramo por enlace.

Incluye una sección especial, **«Esos días que no hubo»**, sobre los ramos que no se dieron a tiempo: el amor que no se entregó cuando se podía y las flores que llegan cuando ya no hay quien las vea. Una rosa blanca se abre despacio y deja un relato breve, escrito a mano, contra la costumbre de intelectualizar lo que se siente: las flores no se explican, se dan.

## Cómo abrirlo

La página no necesita instalación ni compilación:

1. **Directo:** abre `index.html` con doble clic en cualquier navegador moderno. Funciona todo.
2. **Con servidor local** (útil para probar en otros dispositivos de la misma red):

   ```bash
   python tools/serve.py 5173
   ```

   Luego visita <http://localhost:5173>. Es igual a `python -m http.server`, pero sin caché, así cada recarga usa los archivos recién editados.

Las tipografías (Cormorant, Newsreader y Jost) vienen en `fonts/`, servidas desde el mismo sitio: no hay que esperar a otro servidor y funcionan sin conexión. Son fuentes variables de Google Fonts (licencia OFL, en `fonts/OFL.txt`).

## Qué contiene

- **Jardín vivo:** las flores crecen al cargar, se mecen con la brisa, se inclinan cuando el cursor se acerca y se mueven en capas de profundidad (parallax). Pétalos y polen flotan de fondo.
- **Cada flor completa:** la composición separa las cabezas florales con un algoritmo de relajación (`js/layout.js`) para que ninguna tape a otra más de la cuenta (cada una queda al menos 85 % visible) y ninguna quede bajo el título. La flor que miras pasa al frente. Con `?debug=layout` se dibuja la silueta de cada cabeza con su porcentaje visible.
- **Una animación por especie:** la rosa abre sus anillos, el girasol sigue al cursor, el tulipán se inclina antes de abrirse, la margarita se deshoja, el diente de león suelta semillas, la hortensia cambia de color según la acidez del suelo, la fresia abre sus flores de la base a la punta, la anémona se recoge y se vuelve a abrir, entre otras.
- **Ficha de cada flor:** significado poético, cultural (con notas cuando cambia según la cultura), mirada científica y **cuidados**: cuánto dura en florero, cuánta agua quiere, pasos específicos y toxicidad para gatos y perros. Desde la ficha se puede agregar la flor a un ramo.
- **Taller de ramos** (`#armar`): elige flores, rellenos y follajes tallo por tallo, o escribe lo que quieres decir y pide una propuesta. Elige envoltorio y cinta, escribe una tarjeta y lee en vivo qué dice el ramo: significados ponderados, notas culturales y advertencias (mascotas, números pares, flores de luto en algunas culturas). Los ramos se guardan en **Mis ramos** y se comparten con un enlace.
- **Descargar el ramo** como imagen (PNG) o PDF, con todos los detalles: el dibujo, la tarjeta, de qué está hecho, qué dice y cómo cuidarlo. La imagen es una sola lámina larga, para guardar o enviar por mensaje; el PDF reparte lo mismo en páginas A4, listo para imprimir. Está en el taller y en la vista de un ramo recibido. Se arma en el navegador, sin enviar nada a ningún servidor, y siempre en papel claro, aunque la página esté en modo oscuro.
- **Fechas** (`#fechas`): cuándo se regalan flores, por qué y con qué especies del jardín. Las fechas fijas (San Valentín, Día de la Madre, Sant Jordi, flores amarillas, Todos los Santos…) se calculan desde hoy; si un país las mueve, se dice junto a la fecha. Un buscador arriba encuentra por mes, ocasión o flor («mayo», «mamá», «rosas rojas»). La próxima va destacada; el resto del año, en una lista de días que se abren. Las ocasiones sin día marcado (cumpleaños, boda, condolencias…) van aparte. Cada flor abre su ficha, «Armar un ramo» abre el taller con un ramo propuesto para esa ocasión y, si hay ramos de esa ocasión, «Ver ramos» pasa al mostrador.
- **Mostrador** (`#ramos`): veinte ramos tradicionales de Occidente por temporada y por temática (San Valentín, Día de la Madre, bodas, condolencias…). La temporada se calcula según el hemisferio, detectado por la zona horaria (Chile, Argentina, Australia… → sur) y ajustable a mano. Un buscador encuentra por nombre, ocasión o flor, y ocasión, temporada y hemisferio se eligen en tres desplegables con su nombre a la vista; si una búsqueda no da nada en esta temporada, se ofrece verla en todas. Cada ramo se puede personalizar en el taller.
- **Un ramo recibido** (`#ramo=…`): quien abre el enlace ve el ramo, la tarjeta, lo que dice cada flor y cómo cuidarlo, con un calendario `.ics` de recordatorios para cambiar el agua.
- **Receta para la florería:** desde el taller, el ramo se convierte en una lista para pedirlo en una florería: cuántos tallos de cada flor (y de qué color, cuando la flor se vende en varios), envoltorio, cinta, total y el texto de la tarjeta. Se copia o se envía por mensaje con el enlace al dibujo, y avisa cuando una flor casi nunca se encuentra en florerías. Quien recibe un ramo también ve la receta, sin la tarjeta. «Florerías cerca» está en el jardín, la ficha de cada flor, el taller («Cuando esté listo»), la receta y la vista de regalo (no en Ramos, Fechas ni «Esos días que no hubo»). Al tocarlo, el navegador pide la ubicación; si se acepta, se redondea a unos cien metros y abre Google Maps centrado ahí, y si no, abre la búsqueda «florería» sin ubicación. La ubicación vive solo en memoria mientras la página está abierta. El destino del botón se cambia en `js/recipe.js` (`FL.recipe.providers`).
- **Propuesta desde lo que sientes:** lee lo que escribes (palabras completas, negaciones, emociones, para quién es y la ocasión) y busca entre todas las combinaciones del catálogo el ramo cuya lectura dice lo mismo; explica qué entendió y por qué eligió cada flor. «Otra opción» busca otra flor principal para lo mismo. La ocasión que se elige a mano manda sobre la del texto; la que dejó una propuesta anterior en el selector no: si el texto cambia, se vuelve a leer (un «falleció» no queda como cumpleaños). Todo en el navegador, sin servidor ni IA.
- **Propuesta desde lo que escribes:** además de los sentimientos y la ocasión, el motor local entiende el tamaño («un ramo grande», «algo pequeño», «una sola flor»), la cantidad («unas 15 flores», «una docena de rosas»), las flores que se piden o se rechazan («le encantan los tulipanes», «sin rosas», «nada de lirios ni claveles»), los colores («algo amarillo», «nada rojo») y un estilo sobrio. El duelo manda sobre lo demás, y los nombres propios («mi amiga Margarita») no se leen como flores. La propuesta dice qué tomó en cuenta.
- **Explorar:** búsqueda y filtros por significado, color y estación. Las flores coincidentes se resaltan en el jardín.
- **Modo oscuro** automático (jardín nocturno), según la preferencia del sistema.
- **Accesibilidad:** navegación con teclado (Tab, Enter, Esc, flechas ← →), foco atrapado en cada ventana y respeto por `prefers-reduced-motion`.
- **Responsive:** en móvil el jardín se vuelve una composición vertical que se recorre con scroll, y el taller se apila en una sola columna.

## Enlaces directos

`index.html#girasol` abre esa flor; `#esos-dias`, la sección especial; `#armar`, el taller; `#ramos`, el mostrador; `#fechas`, el calendario de regalo; `#ramo=…`, un ramo compartido.

## Estructura

```
index.html              Estructura de la página
privacidad.html         Qué se guarda en el dispositivo y qué lleva un enlace #ramo=
favicon.svg, .png       Ícono de la pestaña: una nomeolvides, la flor del recuerdo, con los colores del jardín
apple-touch-icon.png    El mismo ícono, 180×180, para la pantalla de inicio del celular
css/styles.css          Estilos, temas claro/oscuro y animaciones de cada especie
css/atelier.css         Taller, mostrador, vista de regalo, cuidados y dibujo de ramos
css/fonts.css           Tipografías propias (@font-face de fonts/)
fonts/                  Cormorant, Jost y Newsreader en woff2 (alfabetos latinos) y su licencia
data/flowers.json       Fichas de las flores (fuente única de datos)
data/fillers.json       Rellenos y follajes de ramo
data/taxonomy.json      Significados, colores, estaciones por hemisferio, ocasiones, envoltorios,
                        cintas, cuidados generales, límites y el vocabulario con que se lee lo que
                        se escribe (intenciones, destinatarios, alias de flores, ocasiones y colores)
data/popular.json       Ramos tradicionales del mostrador
data/schema/            Esquemas JSON: ramo, catálogo y proveedores (este último, solo diseño)
tools/build_data.py     Valida los JSON y genera js/gen/data.js
tools/serve.py          Servidor estático de desarrollo sin caché
tools/audit.cjs         Qué sentimientos y temporadas cubre el catálogo
js/gen/data.js          Datos generados (no editar a mano)
js/core.js              Utilidades y primitivas de dibujo (pétalos, hojas, degradados)
js/catalog.js           Conecta los datos con la página; hemisferio, estaciones y fechas
js/art-a.js, art-b.js   Ilustraciones de las 25 flores originales
js/art-c.js             Gerbera, lisianthus, alstroemeria, ranúnculo, fresia, anémona y rellenos
js/art-stems.js         Tallos, hojas y agua de cada planta
js/particles.js         Pétalos, polen, semillas y aromas en canvas; la deriva del jardín, en un worker
js/layout.js            Separación de cabezas florales (jardín y ramos)
js/garden.js            Composición del jardín, brisa, parallax y reacción al cursor
js/care.js              Cuidados: ficha, plan para un ramo y recordatorios .ics
js/recipe.js            Receta para la florería y búsqueda de florerías cerca
js/focus.js             Vista en primer plano, comportamiento de cada especie y ficha
js/explore.js           Buscador y filtros
js/days.js              Sección «Esos días que no hubo»
js/fechas.js            Calendario: cuándo se regalan flores, por qué y con cuáles
js/bouquet-model.js     Modelo de ramo: normalizar, validar, enlaces y «Mis ramos»
js/bouquet-art.js       Dibujo de un ramo: cúpula, tallos, envoltorio y cinta
js/meaning.js           Qué dice un ramo (lectura local)
js/intent.js            Qué siente y qué pide el texto
js/compose.js           Qué ramo lo dice: búsqueda entre todas las combinaciones
js/plate.js             Lámina descargable de un ramo: imagen (PNG) y PDF hecho a mano, sin bibliotecas
js/atelier.js           Taller de ramos
js/showcase.js          Mostrador de ramos populares
js/gift.js              Vista de un ramo recibido
js/main.js              Arranque, bucle de animación, teclado y enlaces directos
tests/                  Pruebas (Node y navegador) y páginas de revisión visual
```

Los scripts son clásicos (sin módulos) y comparten el espacio de nombres `window.FL`, por eso la página funciona también desde `file://`. Los datos viven en JSON y se envuelven en `js/gen/data.js` porque un navegador no puede leer JSON desde `file://`.

## Datos y personalizaciones

Un ramo se guarda como una receta, no como una imagen (`data/schema/bouquet.schema.json`, versión 1): qué ítems del catálogo lleva y cuántos tallos de cada uno, envoltorio, cinta, tarjeta, ocasión, la intención escrita y una semilla que hace que el dibujo salga siempre igual. `js/bouquet-model.js` normaliza cualquier ramo que llegue de afuera (ítems desconocidos, límites de 12 tipos, 24 tallos por tipo y 48 en total, textos largos) y deja lugar a migraciones futuras.

- **Mis ramos** se guarda solo en el navegador (`localStorage`); no viaja a ningún servidor.
- **Los enlaces** llevan el ramo comprimido en el fragmento `#ramo=…`, que el navegador no envía a los servidores. Quien tenga el enlace puede leer la tarjeta. La lectura y la intención escrita no viajan en el enlace: quien lo recibe ve la lectura local.
- **Proveedores:** `data/schema/provider.schema.json` describe cómo se conectarán florerías (ítems, precios en CLP, disponibilidad por mes, zonas de despacho y cotizaciones). Aún no hay código.

## Agregar una flor

1. Añade su ficha en `data/flowers.json`. Copia la forma de una existente: `id`, `name`, `sci`, `family`, `art`, `pal`, `colors`, `seasons`, `meanings`, `poetic`, `culture`, `science`, `care` (cuidados y toxicidad para mascotas) y `bouquet` (su papel en un ramo: `focal`, `secondary`, `spike`, `filler` o `greenery`).
2. Si su forma es nueva, dibuja su cabeza en `FL.art.<nombre>` (por ejemplo en `art-c.js`) y define su tallo en `FL.stemCfg` (`art-stems.js`). También puede reutilizar un dibujo existente con otra paleta, como hacen las cuatro rosas.
3. Define sus estados de reposo y apertura en `css/styles.css` (bloque `.sp-<nombre>`).
4. Ubícala en una fila del jardín: listas `BACK`, `MID` o `FRONT` en `js/garden.js`.
5. Ejecuta `python tools/build_data.py`: valida los datos contra los esquemas, revisa que exista el dibujo, el tallo y la fila, y regenera `js/gen/data.js`.

Los rellenos (`data/fillers.json`) solo necesitan ficha, dibujo y papel en el ramo.

El taller reconoce el nombre de cada flor cuando alguien lo escribe, también en plural («tulipanes»). Si se la conoce por otros nombres, agrégalos en `aliases` de `data/taxonomy.json` (en minúsculas y sin tildes, como el resto del vocabulario).

## Pruebas

```bash
python tools/build_data.py --check      # datos válidos y js/gen/data.js al día
node tests/run.cjs                      # lógica: layout, modelo de ramo, lectura, cuidados
node tools/audit.cjs                    # cobertura del catálogo por sentimiento, temporada y mascotas
```

Con el servidor andando, `tests/index.html` corre las mismas pruebas en el navegador y además revisa la visibilidad del jardín en seis tamaños de pantalla. `tests/gallery.html` y `tests/bouquets.html` muestran todos los dibujos y los ramos del mostrador para revisarlos a ojo.

## Cómo se arma la propuesta

Cada flor suma a un vector de diez significados, el mismo que muestra «Qué dice tu ramo». El texto, los sentimientos marcados y la ocasión se convierten en una mezcla objetivo de esos significados con el vocabulario de `data/taxonomy.json`:

- `intents`: lo que se quiere decir. Cada una tiene su etiqueta, un sustantivo que se lee después de «Leí en lo que escribiste…» («arrepentimiento», «un logro», «nostalgia»), su mezcla de significados (`mix`, pesos que suman 1), a veces otra mezcla según para quién sea (`with`) y sus señales: `strong` (pesan el doble), `words` y `emoji`. `mourning`, `romance` y `self` marcan duelo, romance y un regalo para uno mismo.
- `recipients`: para quién es («mama», «jefa», «abuel*»), con su grupo, su mezcla y, si tiene, su día del calendario (`day`).
- `occasions[].words`: cómo se nombra cada ocasión en el texto («14 de febrero», «gradu*»).
- `neutral` (frases que no dicen nada por sí solas, como «vale la pena»), `names` (nombres propios que también son palabras, como Paz o Luz) y `modifiers`: intensificadores («muy», «de corazón»), atenuantes («un poco») y frases que parecen negar pero no niegan («no sabes cuánto», «no hay palabras»).

La búsqueda prueba todas las combinaciones de flor principal × acompañantes × relleno × follaje × cantidades y se queda con la que, al leerla, pone primero el mismo significado.

### Agregar palabras al vocabulario

1. Busca la intención, el destinatario o la ocasión que corresponde en `data/taxonomy.json` y agrega la palabra o frase a su lista (`words`, o `strong` si por sí sola dice claramente esa intención).
2. Escríbela en minúsculas, sin tildes y con «n» en lugar de «ñ» («companero», «te extranare»): el texto se compara así.
3. Cada forma cuenta por separado: «abrazo» no calza «abrazos». Agrega el plural o usa una raíz con «*» al final de la palabra, que acepta cualquier terminación («abraz*»). Una raíz suelta necesita al menos cuatro letras antes del «*», y conviene probar que no calce palabras ajenas («cari*» calzaría «caribe»).
4. No uses nombres de flores, sus alias ni palabras de color: esas las lee la parte que entiende qué flores y colores se piden.
5. Ejecuta `python tools/build_data.py`: valida y regenera `js/gen/data.js` (nunca lo edites a mano). Rechaza formatos inválidos, raíces cortas, palabras de flores o colores y señales repetidas entre intenciones o `neutral`, o entre destinatarios.
6. Corre `node tests/run.cjs` y prueba la frase en el taller: la propuesta dice qué leyó y por qué palabra («Leí en lo que escribiste … («…»)»).

## Navegadores compatibles

Versiones recientes de Chrome, Edge, Safari y Firefox. La página usa propiedades de transformación individuales (`rotate`, `scale`, `translate`), `color-mix()`, `:has()`, `inert` y `CompressionStream` para acortar los enlaces (sin él, los enlaces salen más largos pero funcionan). Como referencia: Chrome/Edge 111+, Safari 16.4+ y Firefox 121+.

## Sobre el contenido

Los significados culturales resumen tradiciones documentadas; cuando una lectura depende del lugar o la época, la ficha lo indica. Algunos relatos se presentan como tradición contada («se cuenta que…») porque su origen histórico es incierto. Los datos de toxicidad para mascotas siguen las listas de la ASPCA y fuentes veterinarias, pero no reemplazan la consulta a un veterinario. Si vas a difundir la página, conviene revisar las fichas contra fuentes primarias.
