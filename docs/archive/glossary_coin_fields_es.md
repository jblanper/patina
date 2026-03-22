# Glosario de Campos de Monedas

Referencia profesional para cada campo del registro de monedas en Patina. Los campos marcados como **obligatorios** deben tener un valor; todos los demás son opcionales. Para los campos con un vocabulario estandarizado, se enumeran todos los valores reconocidos con sus descripciones.

---

## Identidad y Clasificación

### `title` — obligatorio
**Tipo:** Texto

El nombre personal o descripción breve que el coleccionista asigna a esta moneda. Es la etiqueta principal que se muestra en todo el Gabinete. Debe ser suficientemente descriptivo para identificar la moneda de un vistazo (p. ej., *«Denario de Adriano — Felicitas»* o *«Morgan Dollar 1921»*).

---

### `issuer`
**Tipo:** Texto

La autoridad responsable de emitir la moneda — generalmente un gobernante, emperador, república o estado. Para monedas antiguas, es el nombre completo del emperador y su dinastía (p. ej., *«Marcus Aurelius Antoninus»*). Para monedas modernas, es la nación o institución emisora (p. ej., *«Estados Unidos de América»*). Corresponde al concepto `authority` de Nomisma.

---

### `denomination`
**Tipo:** Texto

La unidad monetaria oficial o valor nominal de la moneda según lo definido por su autoridad emisora. Las denominaciones varían considerablemente según la cultura y el período:

| Denominación | Cultura / Período | Notas |
|---|---|---|
| Aureus | Imperial Romano | Oro; peso promedio 7–9 g |
| Denarius | Imperial Romano | Plata; peso promedio 3–4 g |
| Antoninianus | Imperial Romano | Bronce plateado; doble denario |
| Sestertius | Imperial Romano | Gran latón; peso promedio 25 g |
| Dupondius | Imperial Romano | Latón; peso promedio 12 g |
| As | Imperial Romano | Cobre; peso promedio 9 g |
| Quadrans | Imperial Romano | Cuarto de as; aprox. 3 g |
| Drachm | Griego | Plata; peso promedio 3–5 g |
| Tetradrachm | Griego | Cuatro dracmas |
| Solidus | Bizantino | Oro; peso promedio 4–5 g |
| Follis | Bizantino | Bronce |
| Dirham | Islámico | Plata |
| Dinar | Islámico | Oro |
| Penny / Denarius | Medieval Europeo | Plata |
| Florin | Medieval Europeo | Oro |
| Ducat | Medieval/Renacimiento | Oro |
| Dollar | Moderno | Diversos metales |
| Crown | Británico Moderno | Plata o cuproníquel |

---

### `era` — obligatorio
**Tipo:** Texto

El sistema de era calendárica o histórica utilizado para fechar esta moneda. Determina cómo deben interpretarse `year_display` y `year_numeric`.

| Valor | Nombre Completo | Notas |
|---|---|---|
| `AD` | Anno Domini | Años después del 1 a. C.; `year_numeric` es un entero positivo (p. ej., `134` para el año 134 d. C.) |
| `BC` | Before Christ (Antes de Cristo) | Años antes del 1 d. C.; `year_numeric` es un entero negativo (p. ej., `-44` para el 44 a. C.) |
| `AH` | Anno Hegirae (Hégira) | Calendario lunar islámico; el año 1 AH = 622 d. C. Conversión aproximada: `d. C. ≈ 0,97 × AH + 622` |
| `Byzantine` | Cómputo Bizantino | Utiliza ciclos de indicción y años de reinado imperial |
| `Regnal` | Años de Reinado | Fechado por el año del reinado de un gobernante (p. ej., TR P III para el año 3 del poder tribunicio) |
| `Undated` | Sin fecha en la moneda | Usar `year_display` para una estimación académica aproximada (p. ej., «c. 330–340 d. C.») |

---

## Datación

### `year_display`
**Tipo:** Texto

Una fecha legible por humanos o un intervalo de fechas tal como aparece en un catálogo o debe presentarse al espectador. Este es el valor de **visualización** — admite incertidumbre, rangos y notación de calendario:

- `«134 d. C.»` — año único, anno domini
- `«44 a. C.»` — año único, antes de Cristo
- `«c. 119–122 d. C.»` — rango aproximado
- `«AH 76 (c. 694 d. C.)»` — Hégira con conversión d. C.
- `«TR P III (119 d. C.)»` — año de reinado con conversión
- `«Sin fecha, c. 330–340 d. C.»` — estimación académica

---

### `year_numeric`
**Tipo:** Entero

Un único entero para ordenación y filtrado. Convertir siempre a la escala de la Era Cristiana/Común:

- **d. C. / EC:** entero positivo — p. ej., `134` para el 134 d. C.
- **a. C. / AEC:** entero negativo — p. ej., `-44` para el 44 a. C.
- **Sin fecha:** usar el punto medio o el año más temprano de la estimación académica
- **AH:** convertir al año d. C. aproximado antes de almacenar

---

## Descripción Física

### `mint`
**Tipo:** Texto

La ciudad, taller o instalación donde se acuñó la moneda. Para monedas romanas, suele ser una abreviatura de ciudad en el exergo (p. ej., *«Roma»*, *«Lugdunum»*, *«Antioquía»*). Para monedas modernas puede ser una letra de marca de ceca (p. ej., *«Filadelfia»*, *«San Francisco»*). Corresponde al vocabulario de ceca de Nomisma.

---

### `metal`
**Tipo:** Texto

El metal o aleación principal de la moneda. Utilizar la abreviatura numismática estándar o el nombre completo:

| Código | Nombre Completo | Descripción |
|---|---|---|
| `AV` | Oro (Aurum) | Oro puro o de alta pureza |
| `AR` | Plata (Argentum) | Plata pura o aleada |
| `AE` | Bronce / Cobre (Aes) | Aleaciones de cobre, bronce o latón — el metal base antiguo más común |
| `BI` | Billón | Aleación de cobre con baja proporción de plata, típicamente < 50%; usada en antoninianos tardorromanos |
| `EL` | Electro | Aleación natural de oro y plata; usada en la temprana acuñación lidia y algunas griegas |
| `OR` | Oricalco | Antigua aleación de cobre y zinc de color dorado similar al latón; usada en sestercios y dupondios romanos |
| `POT` | Potin | Aleación de bronce y estaño con alto contenido en estaño; usada en monedas galas y algunas celtas tempranas |
| `PB` | Plomo (Plumbum) | Usado en teseras, fichas y algunas emisiones provinciales |
| `Ni` | Níquel | Aleación de acuñación moderna |
| `Cu-Ni` | Cuproníquel | 75% cobre, 25% níquel; metal de acuñación moderno común |
| `Brass` | Latón | Aleación de cobre y zinc; acuñación moderna |
| `Steel` | Acero | Base de hierro; algunas emisiones de la Segunda Guerra Mundial y modernas |
| `Platinum` | Platino | Metal precioso escaso; monedas de inversión y conmemorativas |

---

### `fineness`
**Tipo:** Texto

La proporción de metal precioso en la aleación, expresada como fracción decimal (fineza milésimal). Aplicable a monedas de oro y plata donde la pureza es un factor diagnóstico o de valor.

| Expresión | Significado | Monedas de ejemplo |
|---|---|---|
| `.999` | 99,9% puro | Lingotes modernos (Gold Eagle, Maple Leaf) |
| `.9999` | 99,99% puro (cuatro nueves) | Royal Canadian Mint (lingotes) |
| `.958` | 95,8% — plata Britannia | Britannia británica |
| `.950` | 95% | Aurei romanos de alta calidad |
| `.925` | 92,5% — plata esterlina | Monedas británicas anteriores a 1920, algunas mundiales |
| `.900` | 90% | Monedas de plata de EE. UU. anteriores a 1965; la mayoría de la plata europea |
| `.835` | 83,5% | Plata europea (muchas posteriores a la Primera Guerra Mundial) |
| `.800` | 80% | Plata suiza y escandinava; algunos denarios romanos |
| `.500` | 50% | Plata británica posterior a 1920; algunas emisiones romanas tardías |
| `.417` | 41,7% | Algunos billones medievales |
| `< .400` | Rango de billón | Antoninianos tardorromanos (bronce plateado) |

Para monedas antiguas, la fineza varía significativamente según el período y el emperador — el contenido de plata del denario romano descendió desde ~95% bajo Augusto hasta menos del 5% hacia el año 280 d. C.

---

### `weight`
**Tipo:** Decimal (gramos)

El peso de la moneda en **gramos con dos decimales** (p. ej., `3,28`). El peso es una herramienta diagnóstica primaria para la autenticidad y la atribución. Pesar con una balanza digital; para monedas de alto valor se recomienda una balanza de precisión.

- Las monedas antiguas presentan variación natural por el corte del cospel y el desgaste; comparar con los estándares publicados para el tipo.
- 1 onza troy = 31,1035 g (referencia para monedas de inversión).

---

### `diameter`
**Tipo:** Decimal (milímetros)

El diámetro de la moneda en **milímetros con un decimal** (p. ej., `18,5`). Medir en el punto más ancho con un calibre digital. Si el cospel es significativamente ovalado (común en monedas antiguas acuñadas a mano), medir ambos ejes y registrar el valor mayor, anotando la variación en `obverse_desc` o `story`.

---

### `die_axis`
**Tipo:** Texto (notación de horas del reloj)

La relación rotacional entre el cuño de anverso y el cuño de reverso, expresada como **posición horaria (1h–12h)**. Para medirla: sostener la moneda con el anverso hacia arriba y el retrato erguido; girar la moneda de izquierda a derecha sobre su eje vertical; la posición horaria hacia donde apunta la parte superior del diseño del reverso es el eje de cuño.

Cada hora del reloj = 30 grados de rotación (en sentido horario desde las 12h).

| Valor | Grados | Nombre Común | Notas |
|---|---|---|---|
| `12h` | 0° / 360° | Alineación de medalla | Reverso en posición correcta; estándar en Francia, Alemania, griego antiguo y muchas naciones europeas |
| `1h` | 30° | — | Ligera rotación horaria |
| `2h` | 60° | — | |
| `3h` | 90° | Cuarto de vuelta | |
| `4h` | 120° | — | |
| `5h` | 150° | — | |
| `6h` | 180° | Alineación de moneda | Reverso boca abajo; estándar en el Reino Unido (histórico), EE. UU. y muchas emisiones imperiales romanas |
| `7h` | 210° | — | |
| `8h` | 240° | — | |
| `9h` | 270° | Cuarto de vuelta antihoraria | Estándar para muchos tetradracmas atenienses |
| `10h` | 300° | — | |
| `11h` | 330° | — | |

**Nota para monedas antiguas:** La variación del eje de cuño es normal en la acuñación a mano y no constituye un error. Registrar la posición medida real. En monedas modernas acuñadas a máquina, un eje de cuño distinto de 12h o 6h constituye un *error de rotación de cuño*, que puede afectar a la rareza.

---

## Inscripciones y Descripciones

### `obverse_legend`
**Tipo:** Texto

La inscripción en el **anverso (cara delantera/cara)** de la moneda, transcrita exactamente tal como aparece. Usar **mayúsculas** para las leyendas en latín, griego y árabe. Expandir abreviaturas entre corchetes solo cuando sea seguro (p. ej., `IMP[ERATOR] CAES[AR] HADRIANVS AVG[VSTVS]`). Usar un punto `.` para separar palabras cuando no aparecen divisores en la moneda.

Elementos comunes de la leyenda de anverso romana:

| Abreviatura | Latín | Significado |
|---|---|---|
| `IMP` | Imperator | Emperador / Comandante Supremo |
| `CAES` | Caesar | Título del heredero o el emperador |
| `AVG` | Augustus | Majestuoso / Venerable |
| `TR P` | Tribunicia Potestas | Poder Tribunicio (indica el año de reinado) |
| `COS` | Consul | Cónsul (+ numeral = n.º consulado) |
| `P M` | Pontifex Maximus | Sumo Sacerdote |
| `P P` | Pater Patriae | Padre de la Patria |
| `D N` | Dominus Noster | Nuestro Señor |
| `S P Q R` | Senatus Populusque Romanus | El Senado y el Pueblo de Roma |

---

### `obverse_desc`
**Tipo:** Texto

Una descripción concisa en español del diseño, motivo y retrato del anverso. Seguir la fórmula: **[sujeto] [orientación], [descripción]**.

- *«Busto de Adriano, laureado, a la derecha»*
- *«Busto de Faustina II, drapeado, a la derecha»*
- *«Águila de pie de frente, alas extendidas»*
- *«Libertad, drapeada, de frente a la izquierda, con gorro frigio»*

Términos de orientación estándar: **derecha** (mirando a la derecha), **izquierda** (mirando a la izquierda), **de frente** (mirando al espectador). Calificadores de retrato estándar: **laureado** (corona de laurel), **radiado** (corona radiada), **diademado** (diadema simple), **con casco**, **drapeado**, **acorazado** (con armadura).

---

### `reverse_legend`
**Tipo:** Texto

La inscripción en el **reverso (cara trasera/cruz)** de la moneda. Seguir las mismas reglas de transcripción que `obverse_legend`. La leyenda del reverso frecuentemente nombra la personificación, deidad o concepto representado, o indica la fecha y la marca de ceca.

| Abreviatura | Latín | Significado |
|---|---|---|
| `S C` | Senatus Consulto | Por Decreto del Senado (en bronce romano) |
| `FELICITAS` | Felicitas | Buena Fortuna |
| `PROVIDENTIA` | Providentia | Providencia |
| `VICTORIA` | Victoria | Victoria |
| `CONCORDIA` | Concordia | Armonía |
| `PIETAS` | Pietas | Piedad / Deber |
| `VIRTVS` | Virtus | Coraje / Valor |
| `FIDES` | Fides | Fe / Lealtad |
| `AEQVITAS` | Aequitas | Equidad / Justicia |
| `INVICTVS` | Invictus | Invicto |

---

### `reverse_desc`
**Tipo:** Texto

Una descripción concisa en español del diseño y motivo del reverso. Seguir la misma fórmula que `obverse_desc`:

- *«Felicitas de pie a la izquierda, sosteniendo caduceo y cornucopia»*
- *«Roma sentada a la izquierda sobre coraza, sosteniendo Victoria y lanza; escudo al lado»*
- *«Águila de pie sobre rayo, alas extendidas; S C en campo»*
- *«Campana de la Libertad; Independence Hall al fondo»*

Incluir el contenido del exergo (marca de ceca, letra de officina) si es relevante: *«…; en exergo: SMANT»* (Sagrada Ceca de Antioquía).

---

### `edge_desc`
**Tipo:** Texto

Una descripción del canto de la moneda (el tercer lado). Para monedas antiguas suele ser *«liso»*. Para monedas modernas es frecuentemente una característica distintiva.

| Valor | Descripción |
|---|---|
| `Plain` | Liso, sin decoración ni tratamiento |
| `Reeded` | Surcos verticales paralelos (canto moldurado); el más común en monedas modernas de plata y bimetálicas |
| `Lettered` | Palabras, frases o inscripciones en el canto |
| `Interrupted reeded` | Secciones alternadas de acanalado y liso |
| `Scalloped` | Canto ondulado o festoneado; decorativo |
| `Grained` | Acanalado diagonal fino o moldurado |
| `Security edge` | Acanalado interrumpido como medida antifalsificación (p. ej., algunas monedas de euro) |
| `Cable` | Patrón de cuerda retorcida |
| `Ornamented` | Patrón decorativo distinto del acanalado (estrellas, puntos, etc.) |

---

## Catalogación y Referencia

### `catalog_ref`
**Tipo:** Texto

La cita bibliográfica estándar para el tipo de esta moneda. Formato: `[Abreviatura] [Volumen/Parte] [Número]`. Indicar primero la referencia principal; separar referencias múltiples con punto y coma.

**Ejemplos:** `RIC II 218`, `Crawford 432/1`, `DOC 4`, `RIC VI 121; BMC 45`

| Abreviatura | Referencia Completa | Cobertura |
|---|---|---|
| `RIC` | Roman Imperial Coinage | Imperial Romano, 31 a. C. – 491 d. C. (10 volúmenes) |
| `RRC` / `Crawford` | Roman Republican Coinage (Crawford) | República Romana, c. 280–31 a. C. |
| `RPC` | Roman Provincial Coinage | Emisiones cívicas/provinciales romanas no imperiales |
| `BMC` | British Museum Catalogue | Griego, Romano, Bizantino |
| `SNG` | Sylloge Nummorum Graecorum | Moneda griega |
| `DOC` | Dumbarton Oaks Catalogue | Bizantino |
| `Sear` / `SBCV` | Sear Byzantine Coins & Their Values | Bizantino |
| `North` | English Hammered Coinage (North) | Medieval británico |
| `Cohen` | Description des monnaies… (Cohen) | Imperial Romano (referencia secundaria más antigua) |

Recursos en línea: OCRE (`numismatics.org/ocre`) para Imperial Romano; CRRO (`numismatics.org/crro`) para Republicano.

---

### `rarity`
**Tipo:** Texto

Una evaluación de la escasez de este tipo específico en el mercado numismático. Las calificaciones de rareza en los principales catálogos reflejan los ejemplares conocidos **en el momento de la publicación** — tratar como guía aproximada, no como dato absoluto.

#### Escala RIC (Roman Imperial Coinage)
La escala de referencia principal para monedas romanas; la notación varía según el volumen:

| Valor | Ejemplares Conocidos Aprox. | Descripción |
|---|---|---|
| `C3` | > 41 conocidos | Muy Común |
| `C2` | 31–40 conocidos | Común |
| `C1` | 22–30 conocidos | Común (extremo inferior) |
| `C` | > 22 conocidos | Común (general) |
| `S` | 16–21 conocidos | Escaso |
| `R1` | 11–15 conocidos | Raro |
| `R2` | 7–10 conocidos | Raro |
| `R3` | 4–6 conocidos | Raro |
| `R4` | 2–3 conocidos | Muy Raro |
| `R5` | 1 conocido | Único (en el momento de la publicación) |

#### Escala Cohen (catálogos de referencia romana más antiguos)

| Valor | Descripción |
|---|---|
| `C` | Común |
| `R` | Raro — disponible pero no frecuente en el mercado |
| `RR` | Muy Raro — aparece ocasionalmente en el mercado |
| `RRR` | Extremadamente Raro — quizá una vez por decenio |
| `RRRR` | Único o casi único |

#### Escala General / Moderna (Sear, catálogos de marchantes)

| Valor | Descripción |
|---|---|
| `Common` | Fácilmente disponible |
| `Scarce` | Disponible pero requiere cierta búsqueda |
| `Rare` | Difícil de encontrar; cotiza con prima |
| `Very Rare` | Aparece en el mercado con poca frecuencia |
| `Extremely Rare` | Muy pocos conocidos; adquisición de primer nivel |
| `Unique` | Solo se conoce un ejemplar |

---

### `grade`
**Tipo:** Texto

El estado de conservación de la moneda en una escala de clasificación reconocida. La escala adecuada depende del tipo y la antigüedad de la moneda.

#### Escala Adjetival (Monedas Antiguas)
Utilizada para monedas griegas, romanas, bizantinas y medievales por NGC Ancients, Heritage, CNG y el comercio especializado:

| Grado | Abreviatura | Descripción |
|---|---|---|
| Poor (Pobre) | P | Apenas identificable; tipo o fecha ilegibles |
| Fair (Aceptable) | FR | Contornos de los principales elementos apenas visibles; casi completamente desgastada |
| About Good (Casi Buena) | AG | Contornos del elemento principal visibles; casi todo el detalle interior obliterado |
| Good (Buena) | G | Contorno del diseño claro; poco detalle interior; tipo identificable |
| Very Good (Muy Buena) | VG | Cierto detalle interior visible en zonas protegidas; leyendas parcialmente legibles |
| Fine (Fina) | F | Desgaste moderado y uniforme; todos los elementos principales presentes; zonas de alto relieve aplanadas |
| Very Fine (Muy Fina) | VF | Desgaste leve a moderado; la mayoría del detalle presente; todos los elementos nítidos |
| Extremely Fine (Extremadamente Fina) | EF / XF | Desgaste leve solo en los puntos más altos; detalle casi completo |
| About Uncirculated (Casi Sin Circular) | AU / aEF | Traza de desgaste solo en los puntos absolutamente más altos; detalle virtualmente completo |
| Uncirculated (Sin Circular) | Unc | Sin desgaste; superficie original completa tal como fue acuñada |
| Fleur de Coin (Flor de Cuño) | FDC | Perfecta; sin desgaste, totalmente acuñada, superficies impecables — la designación antigua más alta |

#### Escala Sheldon de 70 Puntos (Monedas Modernas / Mundiales)
Desarrollada por el Dr. William Sheldon (1949); estandarizada por PCGS (1986) y NGC (1987):

**Grados circulados:**

| Grado | Código | Descripción |
|---|---|---|
| 1 | P-1 | Apenas identificable; desgastada casi hasta ser lisa |
| 2 | FR-2 | Contornos principales visibles; leyenda casi desaparecida |
| 3 | AG-3 | Muy desgastada; fecha visible pero débil |
| 4 | G-4 | Contorno del diseño visible; bordes planos; leyenda desgastada |
| 6 | G-6 | Ligeramente más detalle; leyenda periférica completa |
| 8 | VG-8 | Cierto detalle interior; elementos principales distintos |
| 10 | VG-10 | La mayoría de la leyenda nítida; campos desgastados |
| 12 | F-12 | Todos los elementos principales nítidos; zonas de alto relieve muestran aplanamiento |
| 15 | F-15 | Como F-12 con ligeramente más detalle |
| 20 | VF-20 | Todos los elementos principales nítidos; desgaste leve a moderado uniforme |
| 25 | VF-25 | Ligeramente más detalle que VF-20 |
| 30 | VF-30 | Desgaste uniforme leve; toda la leyenda y elementos principales nítidos |
| 35 | VF-35 | Posibles trazas de brillo de acuñación en zonas protegidas |
| 40 | EF-40 / XF-40 | Desgaste leve solo en los puntos altos; todos los elementos nítidos |
| 45 | EF-45 / XF-45 | Desgaste leve en los puntos más altos; la mitad o más del brillo presente |
| 50 | AU-50 | Trazas de desgaste en puntos altos; al menos la mitad del brillo visible |
| 53 | AU-53 | Mínima traza de desgaste; tres cuartas partes del brillo presentes |
| 55 | AU-55 | Solo pequeña traza de desgaste; tres cuartas partes o más del brillo |
| 58 | AU-58 | Mínima fricción en los puntos más altos; brillo casi completo |

**Estado de Ceca / Sin Circular (sin desgaste — distinciones basadas en marcas de contacto y brillo):**

| Grado | Código | Descripción |
|---|---|---|
| 60 | MS-60 | Muchas marcas de contacto; brillo puede estar deteriorado |
| 61 | MS-61 | Numerosas marcas evidentes; brillo apagado o lavado |
| 62 | MS-62 | Marcas de contacto notables; brillo ligeramente deteriorado |
| 63 | MS-63 | Sin Circular de Elección — marcas moderadas; brillo superior a la media |
| 64 | MS-64 | Varias marcas de contacto; ninguna gravemente desfavorable; brillo superior a la media |
| 65 | MS-65 | Sin Circular Gema — brillo intenso; solo unas pocas marcas menores |
| 66 | MS-66 | Acuñación superior a la media; marcas escasas y menores, no en zonas focales |
| 67 | MS-67 | Gema Suprema — solo imperfecciones mínimas apenas visibles sin aumento |
| 68 | MS-68 | Superficies casi perfectas; imperfecciones detectables solo con aumento |
| 69 | MS-69 | Prácticamente perfecta; cualquier imperfección es imperceptible |
| 70 | MS-70 | Sin Circular Perfecta — sin imperfecciones post-producción a 5× de aumento |

Las **monedas proof** utilizan la misma escala numérica con el prefijo **PR** (PCGS) o **PF** (NGC). Un sufijo «+» (p. ej., MS-64+) indica un atractivo visual excepcional para el grado. Las designaciones **CAM** / **DCAM** indican contraste cameo en monedas proof.

---

## Procedencia y Adquisición

### `provenance`
**Tipo:** Texto

El historial documentado de propiedad de la moneda antes de que ingresara a la colección actual. La procedencia es importante para la autenticación, el cumplimiento legal y la credibilidad académica. Registrar colecciones nombradas, ventas en casas de subastas y lugares de hallazgo documentados cuando se conozcan.

**Ejemplos:**
- *«Ex Naville Numismatics, Subasta 58, Lote 312 (2020)»*
- *«Ex Spink, Londres, 1987; anteriormente colección de Sir Edward Thomas»*
- *«Hallada en Wiltshire, Reino Unido (registro PAS WILT-AB123)»*

Nota: muchos países exigen documentación de procedencia para monedas adquiridas después de 1970 (umbral de la Convención UNESCO).

---

### `story`
**Tipo:** Texto (formato largo)

Campo de texto libre para contexto histórico, notas personales, comentario académico o la narrativa propia del coleccionista sobre esta moneda. Esta es la «nota del curador» — usar para registrar lo que hace significativa a esta moneda, leyendas interesantes sobre el personaje representado, o notas sobre matices de autenticidad y conservación no recogidos en otros campos.

---

### `purchase_price`
**Tipo:** Decimal

El precio pagado para adquirir esta moneda, en la moneda de la transacción. Usado para valoración de seguros y contabilidad de la colección. Para monedas recibidas como regalo o heredadas, registrar el valor de mercado estimado en el momento de la adquisición.

---

### `purchase_date`
**Tipo:** Fecha (ISO 8601 — `AAAA-MM-DD`)

La fecha en que se adquirió la moneda. Usar el formato `AAAA-MM-DD` para consistencia (p. ej., `2024-03-15`).

---

### `purchase_source`
**Tipo:** Texto

Dónde o de quién se adquirió la moneda. Incluir el nombre de la casa de subastas, marchante, feria o vendedor privado según corresponda.

**Ejemplos:**
- *«Heritage Auctions, NYINC 2024»*
- *«Classical Numismatic Group (CNG), Mail Bid Sale 112»*
- *«Roma Numismatics, E-Sale 94»*
- *«Spink, Londres»*
- *«Compra privada a coleccionista particular»*

---

## Lecturas Recomendadas

- **RIC Online (OCRE):** `numismatics.org/ocre` — tipos imperiales romanos con referencias RIC
- **Republican Coinage (CRRO):** `numismatics.org/crro` — referencias Crawford
- **NGC Coin Grading Scale:** `ngccoin.com/coin-grading/grading-scale/`
- **NGC Ancients Grading:** `ngccoin.com/specialty-services/ancient-coins/grading.aspx`
- **PCGS Grading Standards:** `pcgs.com/grades`
- **Portable Antiquities Scheme:** `finds.org.uk/database` — base de datos de hallazgos del Reino Unido
- **Forum Ancient Coins / NumisWiki:** Referencia comunitaria para terminología de monedas antiguas

---

*Última actualización: 2026-03-21 — Catalogador Sénior de Patina*
