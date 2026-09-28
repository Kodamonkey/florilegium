/* Florilegio — fichas (segunda parte) */
(function () {
  'use strict';
  const F = window.FL.flowers;

  F.push({
    id: 'camelia', name: 'Camelia', sci: '<i>Camellia japonica</i>', family: 'Teáceas',
    art: 'camellia', hue: '#e3778a', size: 1, stemK: 0.95,
    pal: { a: '#b8425c', b: '#ec8a9a', c: '#fbd3d6', e: '#94304a', y: '#f0cf6a' },
    colors: ['rosa'], seasons: ['invierno', 'primavera'], meanings: ['Admiración', 'Amor'],
    hint: 'Tócala y verás cómo cada pétalo vuelve a su lugar.',
    poetic: 'Todo en ella es orden y calma, como si hubiera aprendido a florecer en invierno sin quejarse del frío.',
    culture: {
      symbol: 'Admiración, perfección, anhelo y amor fiel. En el lenguaje victoriano de las flores, la camelia blanca expresaba «belleza perfecta».',
      history: 'En Japón (<i>tsubaki</i>) se aprecia desde hace siglos. Como la flor cae entera en lugar de deshojarse, se cuenta que algunos samuráis la veían como un mal presagio, y aún hoy se evita llevarla a un enfermo. En Europa inspiró <i>La dama de las camelias</i> de Alexandre Dumas hijo (1848) y, a través de ella, <i>La Traviata</i> de Verdi. Coco Chanel la adoptó como emblema de su casa.',
      note: 'En Japón conviene considerar el contexto antes de regalarla.',
      gift: 'Una admiración profunda y un cariño constante.'
    },
    science: {
      origin: 'Japón, Corea y el este de China.',
      growth: 'Arbusto o árbol pequeño de hojas perennes, gruesas y brillantes, que florece entre el final del invierno y la primavera.',
      pollination: 'En Japón la visitan aves como el anteojitos japonés (<i>mejiro</i>), que se alimentan de su néctar cuando hay pocos insectos activos.',
      curiosity: 'El té es una camelia: <i>Camellia sinensis</i>. La flor cae entera porque sus pétalos están unidos en la base con los estambres.'
    }
  });

  F.push({
    id: 'gardenia', name: 'Gardenia', sci: '<i>Gardenia jasminoides</i>', family: 'Rubiáceas',
    art: 'gardenia', hue: '#d8cfa6', size: 0.95, stemK: 0.95,
    pal: { a: '#d6cfa8', b: '#f5f0df', c: '#fffdf6', e: '#a69d78', y: '#e3cf7a' },
    colors: ['blanco'], seasons: ['verano'], meanings: ['Amor'],
    hint: 'Tócala: su perfume se extiende en ondas.',
    poetic: 'Su perfume llega antes que ella, como un nombre dicho en voz baja en la habitación de al lado.',
    culture: {
      symbol: 'Pureza, dulzura y amor secreto; en el lenguaje victoriano, ese amor se confiaba a su perfume.',
      history: 'Se cultiva en China desde hace más de mil años, y sus frutos dan un tinte amarillo usado en telas y alimentos. Su nombre honra al médico y naturalista Alexander Garden. En Japón se llama <i>kuchinashi</i>, «sin boca», porque sus frutos no se abren. Billie Holiday la hizo parte de su imagen al llevarla en el cabello.',
      gift: 'Un gesto íntimo: admiración callada, un amor que todavía no se dice.'
    },
    science: {
      origin: 'Sur de China, Taiwán, Japón y el sudeste asiático.',
      growth: 'Arbusto perenne de hojas coriáceas y brillantes; prefiere suelos ácidos.',
      pollination: 'Polillas esfinge, atraídas al anochecer por su aroma intenso y su largo tubo floral.',
      curiosity: 'Pertenece a la misma familia que el café. Sus pétalos blancos y cerosos se vuelven color crema a medida que envejecen.'
    }
  });

  F.push({
    id: 'jazmin', name: 'Jazmín', sci: '<i>Jasminum officinale</i> y <i>J. sambac</i>', family: 'Oleáceas',
    art: 'jasmine', hue: '#efe6d2', size: 1, stemK: 0.85,
    pal: { a: '#e8c9cf', b: '#f8f2ec', c: '#ffffff', e: '#b3a79a', bud: '#e3a0b4', lf: '#3f5a2e', x: '#d7d59a' },
    colors: ['blanco'], seasons: ['verano'], meanings: ['Amor', 'Calma'],
    hint: 'Cae la tarde: tócalo y sus flores se abrirán una a una.',
    poetic: 'Guarda su perfume para cuando cae la noche. Como las cosas más íntimas, que se dicen mejor en voz baja.',
    culture: {
      symbol: 'Amor, sensualidad, amabilidad y gracia. Su nombre viene del persa <i>yāsaman</i>.',
      history: 'El jazmín sambac es la flor nacional de Filipinas (<i>sampaguita</i>) y una de las flores nacionales de Indonesia (<i>melati</i>). En India y el sur de Asia se trenza en guirnaldas para bodas, templos y el cabello. Damasco es conocida como la ciudad del jazmín, y en China se usa para aromatizar el té.',
      gift: 'Ternura y cercanía. En muchas culturas, un collar de jazmines es una bienvenida.'
    },
    science: {
      origin: 'El jazmín común, del Cáucaso al Himalaya y China; el sambac, del sur de Asia.',
      growth: 'Arbusto trepador de ramas volubles, con flores blancas en pequeños racimos.',
      pollination: 'Sobre todo polillas: muchas especies se abren al atardecer y liberan su aroma de noche.',
      curiosity: 'Es pariente del olivo. Para perfumería se cosecha a mano antes del amanecer, cuando su aroma es más intenso. Contiene trazas de indol, una molécula que en concentración alta huele mal y en la flor aporta profundidad.'
    }
  });

  F.push({
    id: 'dalia', name: 'Dalia', sci: '<i>Dahlia × hortensis</i>', family: 'Asteráceas',
    art: 'dahlia', hue: '#e46a4a', size: 1.1, stemK: 1,
    pal: { a: '#a3302a', b: '#e56d4c', c: '#f8b791', e: '#7f221d' },
    colors: ['naranja'], seasons: ['verano', 'otoño'], meanings: ['Gratitud', 'Admiración'],
    hint: 'Tócala: sus anillos giran hasta encontrar su lugar.',
    poetic: 'Cada pétalo en su sitio, como si alguien hubiera ordenado la alegría con paciencia infinita.',
    culture: {
      symbol: 'Dignidad, elegancia, gratitud y compromiso duradero; también la diversidad, por sus incontables formas.',
      history: 'Es nativa de México, donde los mexicas la llamaban <i>cocoxóchitl</i>; se comían sus tubérculos y los tallos huecos de algunas especies servían como conductos de agua. En 1963 fue declarada flor nacional de México. El botánico Antonio José Cavanilles la nombró en Madrid, en 1791, en honor al sueco Anders Dahl.',
      gift: 'Agradecer, felicitar un logro o celebrar un vínculo que se mantiene.'
    },
    science: {
      origin: 'Montañas de México y Centroamérica.',
      growth: 'Perenne con raíces tuberosas que almacenan reservas; florece de verano a otoño.',
      pollination: 'Abejas y mariposas; las formas dobles ofrecen menos acceso al polen.',
      curiosity: 'La dalia de jardín es octoploide: tiene ocho juegos de cromosomas. Esa riqueza genética explica que existan decenas de miles de variedades, de pompones diminutos a flores del tamaño de un plato.'
    }
  });

  F.push({
    id: 'crisantemo', name: 'Crisantemo', sci: '<i>Chrysanthemum × morifolium</i>', family: 'Asteráceas',
    art: 'chrysanthemum', hue: '#d9962f', size: 1, stemK: 1,
    pal: { a: '#8a4d12', b: '#d9962f', c: '#f6d27c', e: '#6a3a0c' },
    colors: ['naranja', 'amarillo'], seasons: ['otoño'], meanings: ['Recuerdo', 'Admiración'],
    hint: 'Tócalo: sus pétalos estallan como fuegos lentos.',
    poetic: 'Florece cuando casi todo lo demás se despide. Nos recuerda que el otoño también sabe ser luminoso.',
    culture: {
      symbol: 'Longevidad, nobleza y alegría en Asia oriental; recuerdo y homenaje a los difuntos en buena parte de Europa y Latinoamérica. Su significado cambia mucho según el lugar.',
      history: 'En China se cultiva desde hace más de dos mil años: es otro de los «cuatro caballeros» y protagonista del Festival del Doble Nueve, cuando se bebe vino de crisantemo. En Japón (<i>kiku</i>), un crisantemo de dieciséis pétalos es el emblema de la familia imperial. En Francia, Italia, España o Chile se lleva a los cementerios en el Día de Todos los Santos.',
      note: 'En gran parte de Europa y Latinoamérica conviene no regalarlo en ocasiones festivas.',
      gift: 'En Asia suele desear larga vida; en Estados Unidos es una flor alegre de otoño.'
    },
    science: {
      origin: 'China.',
      growth: 'Perenne de hojas lobuladas y aromáticas.',
      pollination: 'Abejas, moscas y mariposas; los cultivares muy dobles se multiplican por esquejes.',
      curiosity: 'Es una planta de día corto: florece cuando las noches se alargan en otoño. Su nombre significa «flor de oro» en griego, y un pariente cercano (<i>Tanacetum cinerariifolium</i>) es la fuente de las piretrinas, insecticidas naturales.'
    }
  });

  F.push({
    id: 'cerezo', name: 'Flor de cerezo', sci: '<i>Prunus serrulata</i> y <i>Prunus × yedoensis</i>', family: 'Rosáceas',
    art: 'cherry', hue: '#f2b6c8', size: 1.15, stemK: 0.8,
    pal: { a: '#e48aa7', b: '#f8cbd8', c: '#fff4f7', e: '#c9869b', y: '#e8c34a', br: '#5b4038', br2: '#8a6a5c', lf: '#8a7a3e' },
    colors: ['rosa', 'blanco'], seasons: ['primavera'], meanings: ['Nuevos comienzos', 'Esperanza'],
    hint: 'Quédate un momento: los pétalos se sueltan solos.',
    poetic: 'Florece unos pocos días y se va sin despedirse. Aun así, cada primavera, un país entero se detiene a mirarla.',
    culture: {
      symbol: 'Belleza efímera, renovación y nuevos comienzos. En Japón (<i>sakura</i>) encarna el <i>mono no aware</i>, la emoción ante lo que pasa.',
      history: 'El <i>hanami</i>, la costumbre de reunirse a contemplar las flores, se consolidó en Japón durante el periodo Heian; antes se prefería la flor del ciruelo. Como el año escolar y laboral japonés empieza en abril, los cerezos acompañan inicios y despedidas. En 1912, Tokio regaló 3.000 cerezos a Washington, que desde entonces celebra su propio festival.',
      gift: 'Desear un buen comienzo y recordar el valor del presente.'
    },
    science: {
      origin: 'Japón, China y Corea.',
      growth: 'Árbol caducifolio que florece antes de que broten las hojas o a la vez que ellas.',
      pollination: 'Abejas. Muchos cerezos ornamentales dan frutos pequeños y amargos, o ninguno.',
      curiosity: 'Casi todos los cerezos Somei-yoshino son clones de un mismo árbol, multiplicados por injerto: por eso florecen a la vez. En Kioto hay registros de su floración desde el siglo IX, y muestran que hoy florece antes que en casi toda esa historia.'
    }
  });

  F.push({
    id: 'nomeolvides', name: 'Nomeolvides', sci: '<i>Myosotis sylvatica</i>', family: 'Boragináceas',
    art: 'forgetmenot', hue: '#6f97e0', size: 0.9, stemK: 0.62,
    pal: { a: '#4f78cf', b: '#86aaeb', c: '#c4d8f8', e: '#3d5fa8', y: '#f2c94c', bud: '#e59ab8' },
    colors: ['azul'], seasons: ['primavera'], meanings: ['Recuerdo', 'Amor'],
    hint: 'Tócala: sus flores aparecen una a una, como recuerdos.',
    poetic: 'Es pequeña para que tengas que acercarte a mirarla. Y cuando la encuentras, entiendes por qué su nombre es un ruego.',
    culture: {
      symbol: 'Recuerdo, amor verdadero y fidelidad. Su nombre dice lo mismo en muchas lenguas: <i>forget-me-not</i>, <i>Vergissmeinnicht</i>, <i>ne m\'oubliez pas</i>, <i>wasurenagusa</i>.',
      history: 'Una leyenda alemana cuenta que un caballero, al recoger estas flores para su amada a la orilla de un río, cayó al agua con su armadura; antes de hundirse le lanzó el ramo y gritó «¡no me olvides!». Es la flor del estado de Alaska, y en 2015 fue símbolo del centenario del genocidio armenio.',
      gift: 'A quien se va lejos, a quien se quiere recordar o a quien se le promete memoria.'
    },
    science: {
      origin: 'Europa y Asia templada.',
      growth: 'Planta pequeña, anual o perenne de vida corta, que se resiembra sola en lugares húmedos y sombreados.',
      pollination: 'Abejas pequeñas, moscas y mariposas. El anillo amarillo del centro indica dónde está el néctar.',
      curiosity: '<i>Myosotis</i> significa «oreja de ratón», por sus hojas pequeñas y peludas. Sus flores se abren a lo largo de una inflorescencia enroscada que se desenrolla poco a poco, y muchas pasan de rosadas a azules al madurar.'
    }
  });

  F.push({
    id: 'loto', name: 'Loto', sci: '<i>Nelumbo nucifera</i>', family: 'Nelumbonáceas',
    art: 'lotus', hue: '#e07a9a', size: 1.1, stemK: 0.55,
    pal: { a: '#f7ecd9', b: '#f3bccb', c: '#d9557c', e: '#b8506f', y: '#f1c24a', pod: '#c9cf6a', v: '#d86a8c' },
    colors: ['rosa'], seasons: ['verano'], meanings: ['Esperanza', 'Nuevos comienzos', 'Calma'],
    hint: 'Tócalo y volverá a emerger del agua.',
    poetic: 'Nace del barro y aun así sale limpio a la luz. No reniega de dónde viene: simplemente florece.',
    culture: {
      symbol: 'Pureza, renacimiento e iluminación. Es la flor nacional de India.',
      history: 'En el hinduismo se asocia a Lakshmi, Brahma y Vishnu; en el budismo representa la mente que surge del barro sin mancharse, y da nombre a la postura del loto. En China, el ensayo «Amor por el loto» de Zhou Dunyi (siglo XI) celebró que crezca en el lodo sin ensuciarse.',
      note: 'El «loto» del antiguo Egipto era en realidad un nenúfar (<i>Nymphaea</i>), una planta distinta.',
      gift: 'Se ofrece en templos y ceremonias; regalarlo desea claridad, renovación y paz.'
    },
    science: {
      origin: 'Asia tropical y templada, y el norte de Australia.',
      growth: 'Planta acuática con rizomas en el fango; hojas y flores se elevan por encima del agua.',
      pollination: 'Escarabajos y abejas. La flor se calienta sola: mantiene unos 30–35 °C durante días, lo que atrae y abriga a los insectos.',
      curiosity: 'Sus hojas se limpian solas: una microestructura cerosa hace que el agua ruede arrastrando la suciedad (el «efecto loto»). Se han hecho germinar semillas de unos 1.300 años. Sus parientes vivos más cercanos son los plátanos de sombra y las proteas.'
    }
  });

  F.push({
    id: 'diente-de-leon', name: 'Diente de león', sci: '<i>Taraxacum officinale</i>', family: 'Asteráceas',
    art: 'dandelion', hue: '#cfc8b0', size: 1, stemK: 1.05,
    pal: { a: '#9d967f', c: '#fffdf6', core: '#8a7a4a' },
    colors: ['blanco'], seasons: ['primavera', 'verano'], meanings: ['Esperanza', 'Nuevos comienzos'],
    hint: 'Toca para soplar. Pide un deseo.',
    poetic: 'Nadie la plantó y aun así llegó. Sopla, y deja que cada deseo decida dónde echar raíces.',
    culture: {
      symbol: 'Deseos, esperanza, resiliencia y libertad.',
      history: 'Soplar su cabeza de semillas mientras se pide un deseo es una costumbre infantil presente en muchos países; en algunos lugares se juega a adivinar la hora según los soplos que hacen falta para dejarla vacía. Su nombre viene del francés <i>dent de lion</i>, por los dientes de sus hojas, que también se comen en ensalada.',
      gift: 'No se suele regalar en ramos. Se regala el gesto de soplarla juntos.'
    },
    science: {
      origin: 'Eurasia; hoy crece en casi todo el mundo.',
      growth: 'Perenne con una roseta de hojas dentadas y una raíz pivotante profunda que rebrota aunque se corte.',
      pollination: 'Abejas y moscas, aunque muchas plantas producen semillas sin fecundación (apomixis), como clones de sí mismas.',
      curiosity: 'Cada semilla viaja con un paracaídas de filamentos, el vilano, que genera sobre ella un pequeño anillo de aire estable: una forma de vuelo que no se conocía en ningún otro objeto. Así puede recorrer kilómetros.'
    }
  });

  F.push({
    id: 'amapola', name: 'Amapola', sci: '<i>Papaver rhoeas</i>', family: 'Papaveráceas',
    art: 'poppy', hue: '#d8291c', size: 0.95, stemK: 1.15,
    pal: { a: '#8f1410', b: '#d8291c', c: '#f0553a', e: '#6f0d0a', bl: '#1d0f10', cap: '#8fa08a' },
    colors: ['rojo'], seasons: ['primavera', 'verano'], meanings: ['Recuerdo', 'Esperanza'],
    hint: 'Tócala: sus pétalos se desarrugan al sol.',
    poetic: 'Sale del capullo arrugada, como una carta guardada mucho tiempo en un bolsillo. Y aun así se estira hacia el sol, sin pedir perdón por sus pliegues.',
    culture: {
      symbol: 'Recuerdo, consuelo, sueño e imaginación.',
      history: 'Tras la Primera Guerra Mundial, el poema <i>In Flanders Fields</i> (John McCrae, 1915) convirtió a la amapola roja en símbolo del recuerdo de los caídos; en los países de la Commonwealth se lleva en la solapa cada 11 de noviembre. En la mitología grecorromana se asociaba a Deméter y a los dioses del sueño, por su pariente la adormidera.',
      gift: 'Recordar y consolar; en otros contextos, desear buenos sueños.'
    },
    science: {
      origin: 'Eurasia y el norte de África; acompaña a la agricultura desde hace milenios.',
      growth: 'Anual de tallos peludos. Cada flor dura apenas uno o dos días.',
      pollination: 'Abejas, que recogen su abundante polen. La flor no produce néctar.',
      curiosity: 'Sus semillas pueden pasar años dormidas y germinan cuando la tierra se remueve: por eso cubrieron los campos de Flandes tras las batallas. Los pétalos se forman plegados dentro del capullo y se alisan en pocas horas.'
    }
  });

  F.push({
    id: 'iris', name: 'Iris', sci: '<i>Iris germanica</i>', family: 'Iridáceas',
    art: 'iris', hue: '#7457c2', size: 1, stemK: 0.95,
    pal: { a: '#3a2170', b: '#6844ad', c: '#9170d6', d: '#7a64c7', e2: '#b3a2ee', f: '#dcd2fb', e: '#2d1a58', y: '#f0b23c', w: '#f7f2ff' },
    colors: ['morado', 'azul'], seasons: ['primavera'], meanings: ['Esperanza', 'Admiración'],
    hint: 'Tócalo para verlo desplegar sus tres mensajes.',
    poetic: 'Lleva el nombre de un arcoíris y el oficio de un mensajero: llegar a tiempo, decir lo importante y seguir su camino.',
    culture: {
      symbol: 'Mensaje, esperanza, fe y sabiduría. Debe su nombre a Iris, la diosa griega del arcoíris y mensajera de los dioses.',
      history: 'La flor de lis de la monarquía francesa suele interpretarse como un iris estilizado, aunque también se la ha relacionado con el lirio. El emblema de Florencia es un iris, y Van Gogh pintó sus <i>Lirios</i> en 1889, durante su estancia en Saint-Rémy.',
      note: 'En España y parte de Latinoamérica también se lo llama lirio.',
      gift: 'Un mensaje de esperanza o de admiración por la sabiduría de alguien.'
    },
    science: {
      origin: 'Regiones templadas del hemisferio norte; el iris barbado de jardín, de la cuenca mediterránea.',
      growth: 'Rizoma grueso del que brotan hojas en forma de espada.',
      pollination: 'Abejas y abejorros. Los tres sépalos caídos llevan una «barba» de pelos que guía al insecto hacia dentro; para llegar al néctar debe pasar bajo el estigma y rozar el polen.',
      curiosity: 'Del rizoma seco de algunos iris se obtiene la raíz de lirio de la perfumería: se deja envejecer varios años hasta que desarrolla un aroma parecido al de la violeta.'
    }
  });

  F.push({
    id: 'jacinto', name: 'Jacinto', sci: '<i>Hyacinthus orientalis</i>', family: 'Asparagáceas',
    art: 'hyacinth', hue: '#8b6fd0', size: 0.9, stemK: 0.42,
    pal: { a: '#4a2f86', b: '#8468cc', c: '#c6b3f1', e: '#35205f' },
    colors: ['morado'], seasons: ['primavera'], meanings: ['Perdón', 'Recuerdo'],
    hint: 'Tócalo: sus flores se abren de abajo hacia arriba.',
    poetic: 'Hay gestos que llegan después de una tormenta. No borran lo que pasó, pero perfuman el aire donde volver a empezar.',
    culture: {
      symbol: 'En el lenguaje de las flores, el jacinto morado expresa pesar y el deseo de ser perdonado; en otros colores, alegría y juego.',
      history: 'Su nombre viene del mito griego de Jacinto, el joven amado por Apolo que murió alcanzado por un disco; según Ovidio, de su sangre brotó una flor, aunque probablemente no era el jacinto actual. En Irán, el jacinto (<i>sonbol</i>) es uno de los elementos de la mesa del Nouruz, el año nuevo persa.',
      gift: 'Un jacinto morado es la forma clásica de decir «lo siento» con flores.'
    },
    science: {
      origin: 'Turquía, Siria, Líbano y otras zonas del oeste de Asia.',
      growth: 'Bulbo que produce, a comienzos de la primavera, una espiga densa de flores acampanadas y muy perfumadas.',
      pollination: 'Abejas y otros insectos.',
      curiosity: 'Sus flores se abren de abajo hacia arriba a lo largo de la espiga. El bulbo contiene cristales de oxalato de calcio que pueden irritar la piel al manipularlo.'
    }
  });

  // Colores y estaciones visibles en el explorador
  window.FL.meanings = ['Amor', 'Amistad', 'Admiración', 'Gratitud', 'Recuerdo', 'Esperanza', 'Perdón', 'Nuevos comienzos', 'Alegría', 'Calma'];
  window.FL.colors = [
    ['rojo', '#b3202f'], ['rosa', '#e58aa6'], ['blanco', '#f4f0e4'], ['amarillo', '#f0b429'],
    ['naranja', '#e46a4a'], ['morado', '#7d69bb'], ['azul', '#6f97e0']
  ];
  window.FL.seasons = ['primavera', 'verano', 'otoño', 'invierno'];
})();
