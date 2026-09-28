/* Florilegio — fichas (primera parte) */
(function () {
  'use strict';
  const F = window.FL.flowers;

  F.push({
    id: 'rosa-roja', name: 'Rosa roja', sci: '<i>Rosa</i> spp. (cultivares)', family: 'Rosáceas',
    art: 'rose', hue: '#a3182b', size: 1, stemK: 1,
    pal: { a: '#5e0b18', b: '#a3182b', c: '#d6404c', e: '#3f0610', g: '#4f6b3a' },
    colors: ['rojo'], seasons: ['primavera', 'verano'], meanings: ['Amor', 'Admiración'],
    hint: 'Toca la rosa para verla abrirse otra vez.',
    poetic: 'Hay amores que se dicen sin palabras: sosteniendo algo frágil entre los dedos, con cuidado de no herirse. La rosa roja lleva siglos haciendo ese trabajo por nosotros.',
    culture: {
      symbol: 'Es el símbolo más extendido del amor romántico y la pasión en la tradición occidental. La literatura grecorromana la vinculó con Afrodita (Venus), y el cristianismo medieval la hizo emblema de María y del martirio. La expresión latina <i>sub rosa</i>, «bajo la rosa», llegó a significar algo dicho en secreto.',
      history: 'En el siglo XIX, el llamado lenguaje de las flores fijó su sentido de declaración amorosa, el mismo que hoy sostiene San Valentín. En Cataluña, cada 23 de abril (Sant Jordi) se regala una rosa roja, tradicionalmente a cambio de un libro.',
      gift: 'Declarar amor o deseo sin rodeos. Una sola rosa suele leerse como un gesto íntimo; un ramo, como una celebración.'
    },
    science: {
      origin: 'Las especies silvestres del género viven sobre todo en Asia, con otras en Europa, Norteamérica y el norte de África. Las rosas de jardín actuales son híbridos complejos.',
      growth: 'Arbusto leñoso, a veces trepador, con hojas compuestas de folíolos dentados.',
      pollination: 'Abejas y otros insectos. En muchas rosas de flor doble hay tantos pétalos que a los polinizadores les cuesta llegar al centro.',
      curiosity: 'En rigor no tiene espinas sino aguijones: salientes de la capa externa del tallo que se desprenden con facilidad. Su rojo proviene de antocianinas, los mismos pigmentos de la uva tinta y las cerezas.'
    }
  });

  F.push({
    id: 'rosa-blanca', name: 'Rosa blanca', sci: '<i>Rosa</i> spp.; entre ellas <i>Rosa × alba</i>', family: 'Rosáceas',
    art: 'rose', hue: '#cfc6a8', size: 0.95, stemK: 1,
    pal: { a: '#c9c7a4', b: '#efeadb', c: '#fffdf6', e: '#9c9477', g: '#566f40' },
    colors: ['blanco'], seasons: ['primavera', 'verano'], meanings: ['Nuevos comienzos', 'Recuerdo'],
    hint: 'Toca la rosa para verla abrirse otra vez.',
    poetic: 'Hay silencios que no están vacíos. Son un espacio limpio, recién barrido, donde algo puede empezar sin prisa.',
    culture: {
      symbol: 'En Occidente simboliza pureza, inocencia, respeto y comienzos; por eso es habitual en ramos de novia y también en despedidas. El arte cristiano la asoció a la Virgen María.',
      history: 'En la Inglaterra del siglo XV fue emblema de la casa de York durante la Guerra de las Dos Rosas, frente a la rosa roja de Lancaster; la rosa Tudor unió ambas. En 1942, un grupo de estudiantes de Múnich que resistía al nazismo se llamó La Rosa Blanca (<i>Die Weiße Rose</i>).',
      note: 'En varias culturas de Asia oriental el blanco se asocia al luto, así que el contexto importa.',
      gift: 'Honrar algo: un comienzo, una unión, un recuerdo o un respeto profundo.'
    },
    science: {
      origin: '<i>Rosa × alba</i>, un híbrido antiguo de flores blancas, se cultiva en Europa al menos desde la Edad Media.',
      growth: 'Arbusto de ramas arqueadas. Muchas rosas blancas antiguas florecen una sola vez al año, con gran intensidad.',
      pollination: 'Insectos, sobre todo abejas, atraídas por el perfume y el polen.',
      curiosity: 'Los pétalos blancos no tienen pigmento blanco. Se ven así porque los espacios de aire entre sus células dispersan toda la luz, igual que la nieve o la espuma.'
    }
  });

  F.push({
    id: 'rosa-rosada', name: 'Rosa rosada', sci: '<i>Rosa</i> spp.; entre ellas <i>Rosa × damascena</i>', family: 'Rosáceas',
    art: 'rose', hue: '#e07a9d', size: 0.95, stemK: 1,
    pal: { a: '#b54470', b: '#e98fae', c: '#f9d3de', e: '#8f3358', g: '#4f6b3a' },
    colors: ['rosa'], seasons: ['primavera', 'verano'], meanings: ['Gratitud', 'Admiración'],
    hint: 'Toca la rosa para verla abrirse otra vez.',
    poetic: 'No todo afecto necesita arder. Hay uno que se queda cerca, tibio, y que un día cualquiera simplemente dice: gracias por estar.',
    culture: {
      symbol: 'Se asocia a gratitud, admiración, dulzura y cariño. En los códigos florales modernos, el rosa pálido suele leerse como gentileza y el rosa intenso como agradecimiento profundo.',
      history: 'La rosa de Damasco, de flores rosadas, sostiene desde hace siglos la producción de agua y aceite de rosas en Irán (Kashan) y en el Valle de las Rosas de Bulgaria. El agua de rosas perfuma dulces y rituales en buena parte de Oriente Medio y Asia meridional.',
      gift: 'Agradecer o admirar sin declarar un romance: a una madre, una amiga, una maestra.'
    },
    science: {
      origin: 'La rosa de Damasco es un híbrido antiguo cuyos ancestros provienen de Asia occidental y central.',
      growth: 'Arbusto de tallos con aguijones y flores muy perfumadas; las variedades antiguas florecen a comienzos del verano.',
      pollination: 'Abejas, abejorros y escarabajos.',
      curiosity: 'Para obtener un solo kilo de aceite esencial se necesitan varias toneladas de pétalos. Las rosas son parientes cercanas de manzanas, peras, cerezas, fresas y almendras: todas son rosáceas.'
    }
  });

  F.push({
    id: 'rosa-amarilla', name: 'Rosa amarilla', sci: '<i>Rosa</i> spp.; color heredado de <i>Rosa foetida</i>', family: 'Rosáceas',
    art: 'rose', hue: '#f0b429', size: 0.95, stemK: 1,
    pal: { a: '#c9780c', b: '#f2b62a', c: '#fde79b', e: '#9f5f0a', g: '#4f6b3a' },
    colors: ['amarillo'], seasons: ['primavera', 'verano'], meanings: ['Amistad', 'Alegría'],
    hint: 'Toca la rosa para verla abrirse otra vez.',
    poetic: 'Una rosa que no pide nada a cambio. Solo quiere que el día te encuentre un poco más luminoso.',
    culture: {
      symbol: 'Hoy se asocia sobre todo a amistad, alegría, cuidado y buenos deseos. No siempre fue así: en algunos diccionarios florales del siglo XIX significaba celos o un amor que se apaga.',
      history: 'Durante siglos, las rosas europeas casi no tuvieron tonos amarillos puros. Llegaron con especies de Asia occidental como <i>Rosa foetida</i>, y en 1900 el rosalista francés Joseph Pernet-Ducher presentó \'Soleil d\'Or\', antecesora de muchas rosas amarillas modernas.',
      gift: 'Celebrar a un amigo, desear una buena recuperación o un buen comienzo. Suele leerse como afecto sin connotación romántica.'
    },
    science: {
      origin: 'Buena parte del amarillo de las rosas modernas viene de <i>Rosa foetida</i>, nativa de Asia occidental y central.',
      growth: 'Arbusto; los híbridos actuales pueden florecer varias veces en la misma temporada.',
      pollination: 'Abejas y otros insectos. <i>Rosa foetida</i> tiene un olor fuerte que explica su nombre («fétida»).',
      curiosity: 'Su color proviene de carotenoides, los mismos pigmentos de la zanahoria, y no de las antocianinas que tiñen a las rosas rojas.'
    }
  });

  F.push({
    id: 'tulipan', name: 'Tulipán', sci: '<i>Tulipa gesneriana</i>', family: 'Liliáceas',
    art: 'tulip', hue: '#d8445f', size: 0.9, stemK: 0.95,
    pal: { a: '#8e1b3a', b: '#d8445f', c: '#f4a0a0', e: '#6d1029', x: '#e7c25c', s: '#2c1a1f' },
    colors: ['rojo', 'rosa'], seasons: ['primavera'], meanings: ['Amor', 'Perdón', 'Nuevos comienzos'],
    hint: 'Tócalo y volverá a inclinarse antes de abrirse.',
    poetic: 'Se inclina como quien escucha. Y solo cuando ha entendido, se abre.',
    culture: {
      symbol: 'Se asocia al amor declarado, sobre todo en rojo, y a la primavera como regreso. En los códigos florales actuales, el tulipán blanco suele usarse para pedir perdón. En la poesía persa, el tulipán rojo (<i>lale</i>) evoca el amor y el sacrificio.',
      history: 'Fue cultivado con devoción en el Imperio otomano, donde decoró cerámicas y dio nombre a la «Era de los Tulipanes» (1718–1730). En los Países Bajos del siglo XVII desató la tulipomanía, cuando algunos bulbos alcanzaron precios extraordinarios. Desde 1945, los Países Bajos envían tulipanes a Ottawa en gratitud por el refugio que Canadá dio a su familia real durante la guerra.',
      gift: 'En rojo, una declaración de amor; en otros colores, un deseo de alegría y de comienzos; en blanco, una disculpa.'
    },
    science: {
      origin: 'Montañas y estepas de Asia central, entre el Pamir y el Tian Shan, donde las especies silvestres florecen tras el deshielo.',
      growth: 'Geófita: pasa gran parte del año como bulbo bajo tierra y florece en primavera con seis tépalos.',
      pollination: 'Abejas y escarabajos; muchas especies se multiplican también por bulbillos.',
      curiosity: 'Sus flores se abren con el calor y se cierran con el frío o la oscuridad. Los famosos tulipanes «rotos» de la tulipomanía, con llamas de color, eran obra de un virus transmitido por pulgones.'
    }
  });

  F.push({
    id: 'girasol', name: 'Girasol', sci: '<i>Helianthus annuus</i>', family: 'Asteráceas',
    art: 'sunflower', hue: '#f2b21f', size: 1.25, stemK: 1.3,
    pal: { a: '#c8761a', b: '#f3b62a', c: '#fcd866', e: '#9a5a10', d0: '#2a170b', d1: '#4a2c12', d2: '#6b4418', d3: '#7c5520', d4: '#b98224', gr: '#6a7f3a' },
    colors: ['amarillo'], seasons: ['verano'], meanings: ['Admiración', 'Alegría', 'Amistad', 'Esperanza'],
    hint: 'Mueve el cursor o el dedo: te seguirá como al sol.',
    poetic: 'Aprendió a buscar la luz antes de saber lo que era. Quizás por eso nunca parece dudar hacia dónde mirar.',
    culture: {
      symbol: 'Se asocia a la alegría, la lealtad, la admiración y la vitalidad; en muchos lugares es sencillamente una imagen del sol.',
      history: 'Fue domesticado en Norteamérica hace miles de años por pueblos indígenas que lo usaban como alimento, aceite y tinte, y llegó a Europa en el siglo XVI. Van Gogh lo pintó una y otra vez en Arlés (1888–1889). Hoy es un símbolo muy querido en Ucrania, uno de sus grandes productores.',
      note: 'El mito griego de Clitia, la ninfa que se transformó en flor por seguir al Sol con la mirada, se ilustró siglos después con girasoles. La flor original del relato no podía serlo: el girasol es americano.',
      gift: 'Decir «me alegras el día» o «te admiro». Es un gesto de amistad luminosa, apropiado para casi cualquier ocasión.'
    },
    science: {
      origin: 'Norteamérica.',
      growth: 'Planta anual que puede superar los tres metros en pocos meses, con hojas grandes y ásperas.',
      pollination: 'Abejas, sobre todo. Lo que parece una flor es un capítulo: cientos de flores diminutas en el disco, rodeadas de flores estériles que hacen de pétalos.',
      curiosity: 'De joven sigue al sol de este a oeste y de noche vuelve a mirar al este. Ya maduro se queda mirando al este: así se calienta al amanecer y recibe más visitas de abejas. Sus semillas se ordenan en espirales que siguen la sucesión de Fibonacci.'
    }
  });

  F.push({
    id: 'peonia', name: 'Peonía', sci: '<i>Paeonia lactiflora</i>', family: 'Peoniáceas',
    art: 'peony', hue: '#e58aa6', size: 1.2, stemK: 0.9,
    pal: { a: '#c24f78', b: '#ec9cb5', c: '#fbe0e8', e: '#a3456a', y: '#efcf6a' },
    colors: ['rosa'], seasons: ['primavera'], meanings: ['Amor', 'Admiración'],
    hint: 'Tócala: sus capas se despliegan desde el centro.',
    poetic: 'Guarda tanto dentro que necesita tiempo. Se abre por capas, como quien confía de a poco.',
    culture: {
      symbol: 'En China, la peonía arbórea (<i>mudan</i>) es la «reina de las flores» y simboliza riqueza, honor y prosperidad; la ciudad de Luoyang le dedica un festival cada primavera. En Japón (<i>botan</i>) es un motivo frecuente en pintura y grabado.',
      history: 'Su nombre recuerda a Peán, médico de los dioses griegos: según el mito, Zeus lo convirtió en flor para salvarlo de la envidia de su maestro Asclepio. En Occidente se asocia al romance, la buena fortuna y los matrimonios felices.',
      gift: 'Desear abundancia y felicidad; es muy apreciada en bodas y aniversarios.'
    },
    science: {
      origin: 'Asia, Europa y el oeste de Norteamérica; la peonía china de jardín, del noreste de Asia.',
      growth: 'Hay peonías herbáceas, que desaparecen en invierno y rebrotan, y arbóreas, de tallos leñosos. Una planta puede vivir más de cincuenta años.',
      pollination: 'Abejas y escarabajos; las formas dobles se multiplican sobre todo por división.',
      curiosity: 'Es el único género de su familia. Las hormigas que recorren sus capullos buscan el néctar que estos segregan; no hacen falta para que la flor se abra, aunque así lo diga un mito de jardín muy extendido.'
    }
  });

  F.push({
    id: 'lirio', name: 'Lirio', sci: '<i>Lilium</i> spp.; la azucena es <i>Lilium candidum</i>', family: 'Liliáceas',
    art: 'lily', hue: '#e3a2b4', size: 1.1, stemK: 1.05,
    pal: { a: '#a9b56c', b: '#f1c6d2', c: '#fffaf6', e: '#b99aa4', s: '#b3355d', m: '#d9607f', an: '#8a3a1c' },
    colors: ['blanco', 'rosa'], seasons: ['verano'], meanings: ['Admiración', 'Nuevos comienzos', 'Recuerdo'],
    hint: 'Tócalo para verlo abrirse del todo.',
    poetic: 'Tiene la elegancia de lo que no se apura. Cuando por fin se abre, lo hace del todo, sin guardarse nada.',
    culture: {
      symbol: 'La azucena blanca simboliza pureza en el arte cristiano: aparece en manos del ángel en muchas pinturas de la Anunciación. Un relato griego cuenta que nació de gotas de leche de Hera, las mismas que formaron la Vía Láctea.',
      history: 'En China su nombre (<i>bǎihé</i>) evoca la expresión «cien años de unión feliz», y por eso es flor de bodas. En Occidente los lirios blancos acompañan tanto casamientos como despedidas.',
      gift: 'Admiración, respeto y deseos de renovación. Conviene evitarlo en casas con gatos.'
    },
    science: {
      origin: 'Regiones templadas del hemisferio norte; la azucena, del Mediterráneo oriental.',
      growth: 'Crece de un bulbo de escamas carnosas, sin túnica protectora, y da flores de seis tépalos con estambres largos.',
      pollination: 'Mariposas, abejas y polillas esfinge; las especies más perfumadas intensifican su aroma al anochecer.',
      curiosity: 'Es muy tóxico para los gatos: un poco de polen o el agua del florero bastan para dañar sus riñones. Las manchas de muchos tépalos son guías que señalan el néctar.'
    }
  });

  F.push({
    id: 'orquidea', name: 'Orquídea', sci: '<i>Phalaenopsis</i> spp.', family: 'Orquidáceas',
    art: 'orchid', hue: '#c0417d', size: 0.95, stemK: 0.95,
    pal: { a: '#d9709e', b: '#f7e1eb', c: '#ffffff', e: '#c49bb0', l1: '#8f1a5b', l2: '#d0488a', y: '#e8b830', v: '#c0417d' },
    colors: ['blanco', 'rosa'], seasons: ['invierno', 'primavera'], meanings: ['Admiración', 'Amor'],
    hint: 'Tócala: se abre despacio, a su ritmo.',
    poetic: 'Se toma su tiempo. Todo en ella parece recordarnos que lo verdaderamente delicado no se apura.',
    culture: {
      symbol: 'Belleza refinada, admiración y amor duradero. En China, la orquídea (<i>lán</i>) es uno de los «cuatro caballeros» de la pintura clásica, junto al ciruelo, el bambú y el crisantemo, y representa la integridad y la elegancia discreta.',
      history: 'Su nombre viene del griego <i>orchis</i>, por la forma de los tubérculos de algunas especies europeas. En la Inglaterra victoriana, la fiebre por las orquídeas exóticas envió expediciones enteras a buscarlas en los trópicos. La vainilla, cultivada por los totonacas en México, es el fruto de una orquídea.',
      gift: 'Una orquídea en maceta puede florecer durante meses, por eso se regala como deseo de algo duradero: admiración, un cariño que se cuida.'
    },
    science: {
      origin: 'Bosques tropicales del sudeste asiático, Filipinas y el norte de Australia.',
      growth: 'Epífita: vive sobre los troncos sin parasitarlos. Sus raíces aéreas están cubiertas de velamen, un tejido esponjoso que absorbe el agua de la lluvia y la niebla.',
      pollination: 'Insectos. El labelo sirve de pista de aterrizaje y el polen se entrega en paquetes llamados polinios. Algunas orquídeas engañan a sus polinizadores imitando hembras de abeja.',
      curiosity: 'Es una de las familias más grandes de plantas con flor, con unas 28.000 especies. Sus semillas son un polvo sin reservas: solo germinan si se asocian con un hongo que las alimenta.'
    }
  });

  F.push({
    id: 'margarita', name: 'Margarita', sci: '<i>Leucanthemum vulgare</i>', family: 'Asteráceas',
    art: 'daisy', hue: '#e9b31a', size: 0.8, stemK: 1.05,
    pal: { a: '#d4d6c2', b: '#f5f4ec', c: '#ffffff', e: '#a7a38b', y1: '#d08a07', y2: '#f5c93a' },
    colors: ['blanco'], seasons: ['primavera', 'verano'], meanings: ['Amistad', 'Alegría'],
    hint: 'Tócala para deshojarla.',
    poetic: 'Cabe en cualquier camino y aun así parece un pequeño sol dibujado a mano. Lo simple, cuando es sincero, también deslumbra.',
    culture: {
      symbol: 'Inocencia, alegría sencilla, lealtad y pureza. Su nombre viene del griego <i>margarítēs</i>, «perla».',
      history: 'Deshojarla pétalo a pétalo, «me quiere, no me quiere», es un juego presente en muchas lenguas (en francés, <i>effeuiller la marguerite</i>). En inglés, <i>daisy</i> viene de <i>day\'s eye</i>, «ojo del día», porque la margarita común se abre al amanecer y se cierra al atardecer.',
      gift: 'Un gesto ligero y cálido: entre amigos, a niños, para celebrar un nacimiento o simplemente para alegrar.'
    },
    science: {
      origin: 'Europa y Asia templada; se naturalizó en América y Oceanía, donde a veces se comporta como invasora.',
      growth: 'Perenne herbácea que forma matas y se extiende por rizomas en praderas y bordes de camino.',
      pollination: 'Moscas, escarabajos, abejas y mariposas: su flor abierta es un banquete para muchos.',
      curiosity: 'No es una flor sino cientos: los «pétalos» blancos son flores liguladas y el centro amarillo reúne flores diminutas. El número de lígulas varía de una flor a otra, así que el oráculo no está decidido de antemano.'
    }
  });

  F.push({
    id: 'lavanda', name: 'Lavanda', sci: '<i>Lavandula angustifolia</i>', family: 'Lamiáceas',
    art: 'lavender', hue: '#8a77c4', size: 1, stemK: 0.62,
    pal: { a: '#4b3c78', b: '#7d69bb', c: '#a896dc', st: '#7f9170' },
    colors: ['morado'], seasons: ['verano'], meanings: ['Calma'],
    hint: 'Tócala para que pase el viento.',
    poetic: 'Huele a ropa limpia, a tarde sin prisa, a alguien que te espera sin reproches. Hay calmas que florecen.',
    culture: {
      symbol: 'Calma, serenidad, limpieza y devoción. Su nombre suele relacionarse con el latín <i>lavare</i>, «lavar», por su antiguo uso en baños y ropa.',
      history: 'Los campos de Provenza la convirtieron en imagen del verano, y la perfumería la usa desde hace siglos. Una costumbre doméstica muy extendida es guardar saquitos de lavanda entre la ropa para perfumarla y alejar las polillas.',
      note: 'Algunos diccionarios florales victorianos, en cambio, la asociaban a la desconfianza.',
      gift: 'Ofrecer descanso: un deseo de paz, de sueño tranquilo, de pausa.'
    },
    science: {
      origin: 'Montañas secas y soleadas del Mediterráneo occidental.',
      growth: 'Subarbusto leñoso en la base, de hojas estrechas y gris verdosas, cubiertas de pelos finos que reducen la pérdida de agua.',
      pollination: 'Abejas y abejorros; es una fuente importante de néctar para la miel.',
      curiosity: 'Su aroma se guarda en glándulas diminutas de hojas y cálices, llenas de aceites como el linalol, que la protegen de los herbívoros y atraen a los polinizadores. Es pariente de la menta, el romero y la albahaca.'
    }
  });

  F.push({
    id: 'hortensia', name: 'Hortensia', sci: '<i>Hydrangea macrophylla</i>', family: 'Hidrangeáceas',
    art: 'hydrangea', hue: '#7f96d8', size: 1.2, stemK: 0.72,
    pal: { p1: '#f3c6d8', p2: '#d97fa8', b1: '#b9cdf3', b2: '#6f86cf', e: '#6b5f8f', lf: '#4f6a3a' },
    colors: ['azul', 'rosa'], seasons: ['verano'], meanings: ['Gratitud'],
    hint: 'Toca para cambiar la acidez del suelo.',
    poetic: 'Cambia de color según la tierra que la sostiene. Tal vez todos seamos un poco así: hechos también del lugar donde echamos raíces.',
    culture: {
      symbol: 'Gratitud, emociones sinceras y abundancia. En Japón (<i>ajisai</i>) es la flor de la temporada de lluvias de junio, y templos como el Meigetsu-in de Kamakura son famosos por sus senderos de hortensias.',
      history: 'El médico y naturalista Philipp Franz von Siebold, que la difundió en Europa, la llamó <i>Hydrangea otaksa</i>, según se cuenta en homenaje a su compañera japonesa Kusumoto Taki.',
      note: 'Por cambiar de color, en Japón también se la relaciona con la inconstancia, y algunos diccionarios victorianos la vinculaban a la frialdad.',
      gift: 'Agradecer algo sentido de verdad.'
    },
    science: {
      origin: 'Japón.',
      growth: 'Arbusto de hojas grandes y dentadas, con inflorescencias redondeadas.',
      pollination: 'Abejas y otros insectos. Lo que parecen pétalos son sépalos de flores estériles que hacen de bandera; las flores fértiles son diminutas.',
      curiosity: 'En suelo ácido la planta absorbe aluminio, que se une a sus pigmentos y los vuelve azules; en suelo alcalino las flores salen rosadas. <i>Hydrangea</i> significa «vasija de agua», por la forma de sus cápsulas de semillas.'
    }
  });

  F.push({
    id: 'clavel', name: 'Clavel', sci: '<i>Dianthus caryophyllus</i>', family: 'Cariofiláceas',
    art: 'carnation', hue: '#d8416f', size: 0.85, stemK: 1.05,
    pal: { a: '#8f1f47', b: '#dc4f7c', c: '#f7a8bf', e: '#6f1535' },
    colors: ['rosa', 'rojo'], seasons: ['primavera', 'verano'], meanings: ['Admiración', 'Gratitud', 'Amor'],
    hint: 'Tócalo y verás cómo se esponja.',
    poetic: 'Sus bordes parecen recortados a tijera por alguien que quiso hacer algo bonito con paciencia. Así se ven los afectos que duran.',
    culture: {
      symbol: 'Amor, admiración, fascinación y gratitud. Su nombre botánico, <i>Dianthus</i>, suele traducirse como «flor de los dioses».',
      history: 'En Portugal, la revolución que puso fin a la dictadura el 25 de abril de 1974 se llama Revolución de los Claveles, por las flores que los soldados llevaron en sus fusiles. Anna Jarvis eligió el clavel blanco para el primer Día de la Madre en Estados Unidos, y en Corea se regalan claveles el Día de los Padres. En España se lo considera, de manera no oficial, la flor nacional.',
      gift: 'Agradecer y admirar a madres, maestros o amigos. En rojo, también expresa amor.'
    },
    science: {
      origin: 'Cuenca mediterránea; se cultiva desde hace más de dos mil años.',
      growth: 'Perenne de tallos con nudos marcados y hojas estrechas, de un verde azulado, dispuestas en pares.',
      pollination: 'Mariposas y polillas, que alcanzan el néctar con su larga trompa.',
      curiosity: '«Clavel» viene de «clavo»: su perfume especiado contiene eugenol, el mismo compuesto del clavo de olor. Los claveles no fabrican el pigmento azul delfinidina, por eso no existen azules naturales; los violetas que se venden son fruto de la ingeniería genética.'
    }
  });
})();
