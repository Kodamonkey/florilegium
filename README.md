# Florilegio

Florilegio nace para todas las personas que quieren regalar flores o un ramo y no saben cómo armarlo, ni por dónde empezar: para quien simplemente no sabe y necesita ayuda.

Es un jardín digital interactivo: treinta y una flores ilustradas a mano en SVG, cada una con su propia animación y cuatro lecturas: poética, cultural, científica y de cuidados. Además, un taller para armar ramos propios y leer lo que dicen, un mostrador de ramos tradicionales de Occidente y una vista para quien recibe un ramo por enlace.

Incluye una sección especial, **«Esos días que no hubo»**, para quien alguna vez esperó algo que nunca llegó: lo que se desea y no se tiene, lo que se anhela aunque quizá no llegue. Una sola rosa amarilla se abre despacio con un texto breve que le dice que no desespere, que todo saldrá bien, y cierra con una dedicatoria de Rainer Maria Rilke sobre el amor: la flor nunca fue lo importante, lo importante es el gesto.

## Cómo abrirlo

La página no necesita instalación ni compilación:

1. **Directo:** abre `index.html` con doble clic en cualquier navegador moderno. Funciona todo salvo el agente de IA.
2. **Con servidor local** (útil para probar en otros dispositivos de la misma red):

   ```bash
   python tools/serve.py 5173
   ```

   Luego visita <http://localhost:5173>. Es igual a `python -m http.server`, pero sin caché, así cada recarga usa los archivos recién editados.

3. **Con el agente de IA** (opcional). Requiere Python 3.10+ y una clave de la API de Anthropic:

   ```bash
   python -m venv .venv
   .venv/Scripts/python -m pip install -r requirements.txt   # en macOS/Linux: .venv/bin/python
   cp .env.example .env                                      # y completa ANTHROPIC_API_KEY
   .venv/Scripts/python -m uvicorn server.app:app --port 5173
   ```

   El mismo servidor entrega la página y la API en <http://localhost:5173>. Si no hay clave, los botones de IA no aparecen y la página usa la lectura local.

Las tipografías (Cormorant, Newsreader y Jost) vienen en `fonts/`, servidas desde el mismo sitio: no hay que esperar a otro servidor y funcionan sin conexión. Son fuentes variables de Google Fonts (licencia OFL, en `fonts/OFL.txt`).

## Qué contiene

- **Jardín vivo:** las flores crecen al cargar, se mecen con la brisa, se inclinan cuando el cursor se acerca y se mueven en capas de profundidad (parallax). Pétalos y polen flotan de fondo.
- **Cada flor completa:** la composición separa las cabezas florales con un algoritmo de relajación (`js/layout.js`) para que ninguna tape a otra más de la cuenta (cada una queda al menos 85 % visible) y ninguna quede bajo el título. La flor que miras pasa al frente. Con `?debug=layout` se dibuja la silueta de cada cabeza con su porcentaje visible.
- **Una animación por especie:** la rosa abre sus anillos, el girasol sigue al cursor, el tulipán se inclina antes de abrirse, la margarita se deshoja, el diente de león suelta semillas, la hortensia cambia de color según la acidez del suelo, la fresia abre sus flores de la base a la punta, la anémona se recoge y se vuelve a abrir, entre otras.
- **Ficha de cada flor:** significado poético, cultural (con notas cuando cambia según la cultura), mirada científica y **cuidados**: cuánto dura en florero, cuánta agua quiere, pasos específicos y toxicidad para gatos y perros. Desde la ficha se puede agregar la flor a un ramo.
- **Taller de ramos** (`#armar`): elige flores, rellenos y follajes tallo por tallo, o escribe lo que quieres decir y pide una propuesta. Elige envoltorio y cinta, escribe una tarjeta y lee en vivo qué dice el ramo: significados ponderados, notas culturales y advertencias (mascotas, números pares, flores de luto en algunas culturas). Los ramos se guardan en **Mis ramos** y se comparten con un enlace.
- **Descargar el ramo** como imagen (PNG) o PDF, con todos los detalles: el dibujo, la tarjeta, de qué está hecho, qué dice (con la lectura de la IA si la hay) y cómo cuidarlo. La imagen es una sola lámina larga, para guardar o enviar por mensaje; el PDF reparte lo mismo en páginas A4, listo para imprimir. Está en el taller y en la vista de un ramo recibido. Se arma en el navegador, sin enviar nada a ningún servidor, y siempre en papel claro, aunque la página esté en modo oscuro.
- **Mostrador** (`#ramos`): veinte ramos tradicionales de Occidente por temporada y por temática (San Valentín, Día de la Madre, bodas, condolencias…). La temporada se calcula según el hemisferio, detectado por la zona horaria (Chile, Argentina, Australia… → sur) y ajustable a mano. Muestra las próximas fechas del calendario. Cada ramo se puede personalizar en el taller.
- **Un ramo recibido** (`#ramo=…`): quien abre el enlace ve el ramo, la tarjeta, lo que dice cada flor y cómo cuidarlo, con un calendario `.ics` de recordatorios para cambiar el agua.
- **Receta para la florería:** desde el taller, el ramo se convierte en una lista para pedirlo en una florería: cuántos tallos de cada flor (y de qué color, cuando la flor se vende en varios), envoltorio, cinta, total y el texto de la tarjeta. Se copia o se envía por mensaje con el enlace al dibujo, y avisa cuando una flor casi nunca se encuentra en florerías. Quien recibe un ramo también ve la receta, sin la tarjeta. El botón «Florerías cerca» abre Google Maps con la búsqueda «florería»: Maps pide la ubicación por su cuenta y la página no envía nada más.
- **Agente de IA** (opcional): interpreta un ramo y propone uno a partir de lo que sientes, siempre con flores del catálogo. Sin servidor, un motor local (`js/meaning.js`) hace ambas cosas con reglas.
- **Propuesta desde lo que escribes:** además de los sentimientos y la ocasión, el motor local entiende el tamaño («un ramo grande», «algo pequeño», «una sola flor»), la cantidad («unas 15 flores», «una docena de rosas»), las flores que se piden o se rechazan («le encantan los tulipanes», «sin rosas», «nada de lirios ni claveles»), los colores («algo amarillo», «nada rojo») y un estilo sobrio. El duelo manda sobre lo demás, y los nombres propios («mi amiga Margarita») no se leen como flores. La propuesta dice qué tomó en cuenta.
- **Explorar:** búsqueda y filtros por significado, color y estación. Las flores coincidentes se resaltan en el jardín.
- **Modo oscuro** automático (jardín nocturno), según la preferencia del sistema.
- **Accesibilidad:** navegación con teclado (Tab, Enter, Esc, flechas ← →), foco atrapado en cada ventana y respeto por `prefers-reduced-motion`.
- **Responsive:** en móvil el jardín se vuelve una composición vertical que se recorre con scroll, y el taller se apila en una sola columna.

## Enlaces directos

`index.html#girasol` abre esa flor; `#esos-dias`, la sección especial; `#armar`, el taller; `#ramos`, el mostrador; `#ramo=…`, un ramo compartido.

## Estructura

```
index.html              Estructura de la página
css/styles.css          Estilos, temas claro/oscuro y animaciones de cada especie
css/atelier.css         Taller, mostrador, vista de regalo, cuidados y dibujo de ramos
css/fonts.css           Tipografías propias (@font-face de fonts/)
fonts/                  Cormorant, Jost y Newsreader en woff2 (alfabetos latinos) y su licencia
data/flowers.json       Fichas de las flores (fuente única de datos)
data/fillers.json       Rellenos y follajes de ramo
data/taxonomy.json      Significados y su léxico, colores, estaciones por hemisferio, ocasiones,
                        envoltorios, cintas, cuidados generales, límites y el vocabulario con que
                        se lee lo que se escribe (alias de flores, palabras de ocasiones y colores)
data/popular.json       Ramos tradicionales del mostrador
data/schema/            Esquemas JSON: ramo, catálogo y proveedores (este último, solo diseño)
tools/build_data.py     Valida los JSON y genera js/gen/data.js
tools/serve.py          Servidor estático de desarrollo sin caché
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
js/bouquet-model.js     Modelo de ramo: normalizar, validar, enlaces y «Mis ramos»
js/bouquet-art.js       Dibujo de un ramo: cúpula, tallos, envoltorio y cinta
js/meaning.js           Lectura local: qué dice un ramo y qué ramo dice lo que sientes
js/ai.js                Cliente del agente de IA
js/plate.js             Lámina descargable de un ramo: imagen (PNG) y PDF hecho a mano, sin bibliotecas
js/atelier.js           Taller de ramos
js/showcase.js          Mostrador de ramos populares
js/gift.js              Vista de un ramo recibido
js/main.js              Arranque, bucle de animación, teclado y enlaces directos
server/                 API opcional (FastAPI) con el agente de IA
tests/                  Pruebas (Node y navegador) y páginas de revisión visual
```

Los scripts son clásicos (sin módulos) y comparten el espacio de nombres `window.FL`, por eso la página funciona también desde `file://`. Los datos viven en JSON y se envuelven en `js/gen/data.js` porque un navegador no puede leer JSON desde `file://`; el servidor lee los mismos JSON.

## Datos y personalizaciones

Un ramo se guarda como una receta, no como una imagen (`data/schema/bouquet.schema.json`, versión 1): qué ítems del catálogo lleva y cuántos tallos de cada uno, envoltorio, cinta, tarjeta, ocasión, la intención escrita y una semilla que hace que el dibujo salga siempre igual. `js/bouquet-model.js` normaliza cualquier ramo que llegue de afuera (ítems desconocidos, límites de 12 tipos, 24 tallos por tipo y 48 en total, textos largos) y deja lugar a migraciones futuras.

- **Mis ramos** se guarda solo en el navegador (`localStorage`); no viaja a ningún servidor.
- **Los enlaces** llevan el ramo comprimido en el fragmento `#ramo=…`, que el navegador no envía a los servidores. Quien tenga el enlace puede leer la tarjeta. La lectura de la IA y la intención escrita no viajan en el enlace: quien lo recibe ve la lectura local.
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
.venv/Scripts/python -m pytest server/tests -q   # API con un cliente de Claude simulado
```

Con el servidor andando, `tests/index.html` corre las mismas pruebas en el navegador y además revisa la visibilidad del jardín en seis tamaños de pantalla. `tests/gallery.html` y `tests/bouquets.html` muestran todos los dibujos y los ramos del mostrador para revisarlos a ojo.

## Agente de IA

`server/` expone `GET /api/health`, `POST /api/bouquet/interpret` y `POST /api/bouquet/compose`. Cada pedido es una sola llamada a Claude con salida estructurada: los ítems quedan restringidos a los ids del catálogo, así que el modelo no puede inventar flores, y el servidor vuelve a validar límites, mascotas, exclusiones y totales antes de responder. El catálogo va en un prompt de sistema estable y cacheado; el texto que escribe quien usa la página se trata como descripción de sentimientos, nunca como instrucciones.

Variables (ver `.env.example`):

- `ANTHROPIC_API_KEY`: clave de la API. También sirve un perfil de `ant auth login` con `FLORILEGIO_AI=1`.
- `FLORILEGIO_MODEL`: modelo, `claude-opus-5` por defecto.
- `FLORILEGIO_EFFORT`: esfuerzo de razonamiento (`low`, `medium`, `high`…), `medium` por defecto.
- `FLORILEGIO_AI=0`: apaga el agente aunque haya clave.
- `FLORILEGIO_FALLBACKS=0`: apaga el modelo de respaldo. Por defecto, si el modelo declina un pedido, la API lo reintenta en el modelo que Anthropic recomienda para ese caso (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
- `FLORILEGIO_HOSTS`: nombres de host extra permitidos; por defecto solo `localhost`, `127.0.0.1` y `[::1]`.
- `FLORILEGIO_RATE`: pedidos a la IA por cliente cada 10 minutos, 30 por defecto.

El servidor solo atiende pedidos dirigidos a este computador y rechaza los POST que no son JSON o que vienen de otro origen, para que una página ajena no pueda gastar la clave (por ejemplo, con «DNS rebinding»). `tools/serve.py` tampoco entrega `.env`, `.git`, `server/` ni `tools/`.

Si toda la cadena de modelos rechaza un pedido o la respuesta llega cortada, la API responde con un error y la página usa la lectura local. Al usar el agente se envían a la API de Anthropic el ramo, la intención escrita y el mensaje de la tarjeta; los nombres de «Para» y «De» no se envían.

## Navegadores compatibles

Versiones recientes de Chrome, Edge, Safari y Firefox. La página usa propiedades de transformación individuales (`rotate`, `scale`, `translate`), `color-mix()`, `:has()`, `inert` y `CompressionStream` para acortar los enlaces (sin él, los enlaces salen más largos pero funcionan). Como referencia: Chrome/Edge 111+, Safari 16.4+ y Firefox 121+.

## Sobre el contenido

Los significados culturales resumen tradiciones documentadas; cuando una lectura depende del lugar o la época, la ficha lo indica. Algunos relatos se presentan como tradición contada («se cuenta que…») porque su origen histórico es incierto. Los datos de toxicidad para mascotas siguen las listas de la ASPCA y fuentes veterinarias, pero no reemplazan la consulta a un veterinario. Si vas a difundir la página, conviene revisar las fichas contra fuentes primarias.
