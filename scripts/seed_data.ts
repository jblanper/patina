import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'patina.db');

interface Coin {
  title: string;
  issuer: string;
  denomination: string;
  year_display: string;
  year_numeric: number;
  era: string;
  mint: string;
  metal: string;
  fineness: string;
  weight: number;
  diameter: number;
  die_axis: string;
  obverse_legend: string;
  obverse_desc: string;
  reverse_legend: string;
  reverse_desc: string;
  edge_desc: string;
  catalog_ref: string;
  rarity: string;
  grade: string;
  provenance?: string;
  story?: string;
  purchase_price?: number;
  purchase_date?: string;
  purchase_source?: string;
}

const sampleCoins: Coin[] = [
  // ── Existing four ─────────────────────────────────────────────────────────
  {
    title: 'Athens Tetradrachm',
    issuer: 'Athens',
    denomination: 'Tetradrachm',
    year_display: '440 BC',
    year_numeric: -440,
    era: 'Ancient',
    mint: 'Athens',
    metal: 'Silver',
    fineness: '.999',
    weight: 17.20,
    diameter: 24.5,
    die_axis: '9h',
    obverse_legend: '',
    obverse_desc: 'Head of Athena right, wearing crested Attic helmet decorated with three olive leaves and spiral palmette.',
    reverse_legend: 'AΘE',
    reverse_desc: 'Owl standing right, head facing; olive sprig and crescent to left; all within incuse square.',
    edge_desc: 'Plain',
    catalog_ref: 'HGC 4, 1597',
    rarity: 'Common',
    grade: 'Choice XF',
    provenance: 'Ex. Stack\'s Bowers, Jan 2024',
    story: 'The classic "Owl of Athens", widely circulated throughout the ancient Mediterranean world.',
    purchase_price: 1200.00,
    purchase_date: '2024-01-15',
    purchase_source: 'Stack\'s Bowers'
  },
  {
    title: 'Hadrian Denarius',
    issuer: 'Hadrian',
    denomination: 'Denarius',
    year_display: '134 AD',
    year_numeric: 134,
    era: 'Roman Imperial',
    mint: 'Rome',
    metal: 'Silver',
    fineness: '.800',
    weight: 3.21,
    diameter: 18.0,
    die_axis: '6h',
    obverse_legend: 'HADRIANVS AVG COS III PP',
    obverse_desc: 'Laureate head of Hadrian right.',
    reverse_legend: 'CLEMENTIA AVG',
    reverse_desc: 'Clementia standing left, holding patera and vertical sceptre.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC II 265',
    rarity: 'Common',
    grade: 'EF-45',
    provenance: 'Ex. Roma Numismatics, E-Sale 82, 2020',
    story: 'Struck during the well-documented middle years of Hadrian\'s reign (117–138 AD). The reverse type, Clementia (Clemency), was programmatic — Hadrian sought to distance himself from the executions at the start of his rule and project an image of mild government.',
    purchase_price: 220.00,
    purchase_date: '2020-07-15',
    purchase_source: 'Roma Numismatics'
  },
  {
    title: 'Edward I Penny',
    issuer: 'Edward I',
    denomination: 'Penny',
    year_display: '1279',
    year_numeric: 1279,
    era: 'High Medieval',
    mint: 'London',
    metal: 'Silver',
    fineness: '.925',
    weight: 1.43,
    diameter: 18.0,
    die_axis: '12h',
    obverse_legend: 'EDW R ANGL DNS HYB',
    obverse_desc: 'Crowned facing bust within inner circle.',
    reverse_legend: 'CIVITAS LONDON',
    reverse_desc: 'Long cross pattée with three pellets in each angle.',
    edge_desc: 'Plain',
    catalog_ref: 'Spink 1380',
    rarity: 'Common',
    grade: 'VF',
    provenance: 'Found in Suffolk, 2023',
    story: 'Part of the New Coinage of 1279, establishing the long cross design to prevent clipping.',
    purchase_price: 85.00,
    purchase_date: '2023-11-20',
    purchase_source: 'Local Dealer'
  },
  {
    title: 'Morgan Dollar 1881-S',
    issuer: 'United States',
    denomination: 'Dollar',
    year_display: '1881',
    year_numeric: 1881,
    era: 'Modern',
    mint: 'San Francisco',
    metal: 'Silver',
    fineness: '.900',
    weight: 26.73,
    diameter: 38.1,
    die_axis: '6h',
    obverse_legend: 'E PLURIBUS UNUM',
    obverse_desc: 'Liberty head left wearing Phrygian cap with LIBERTY on headband.',
    reverse_legend: 'UNITED STATES OF AMERICA',
    reverse_desc: 'Eagle with wings spread holding arrows and olive branch within wreath.',
    edge_desc: 'Reeded',
    catalog_ref: 'KM 110',
    rarity: 'Common',
    grade: 'MS65',
    provenance: 'Inherited from grandfather',
    story: 'Known for its sharp strike and lustrous surfaces typical of the San Francisco mint in the early 1880s.',
    purchase_price: 0,
    purchase_date: '2020-05-10',
    purchase_source: 'Inheritance'
  },

  // ── Electrum ──────────────────────────────────────────────────────────────
  {
    title: 'Croesus Electrum Stater',
    issuer: 'Croesus of Lydia',
    denomination: 'Stater',
    year_display: 'c. 561–546 BC',
    year_numeric: -554,
    era: 'Ancient',
    mint: 'Sardis',
    metal: 'Electrum',
    fineness: '.540',
    weight: 8.10,
    diameter: 20.5,
    die_axis: '12h',
    obverse_legend: '',
    obverse_desc: 'Confronted foreparts of lion (left) and bull (right).',
    reverse_legend: '',
    reverse_desc: 'Two incuse square punches.',
    edge_desc: 'Plain',
    catalog_ref: 'Sear GCV 3395; Rosen 664',
    rarity: 'Rare',
    grade: 'VF-35',
    provenance: 'Ex. Numismatica Ars Classica, Auction 78, 2014',
    story: 'One of the earliest bimetallic trade coins of the ancient world. The confronted lion-and-bull design is attributed to Croesus (c. 561–546 BC), last king of Lydia, whose proverbial wealth gave rise to the phrase "rich as Croesus." The natural electrum alloy was mined from the Pactolus river sands near Sardis.',
    purchase_price: 2500.00,
    purchase_date: '2014-10-22',
    purchase_source: 'Numismatica Ars Classica'
  },

  // ── Roman Republic ─────────────────────────────────────────────────────────
  {
    title: 'Roman Republic Denarius — L. Calpurnius Piso Frugi',
    issuer: 'L. Calpurnius Piso Frugi (moneyer)',
    denomination: 'Denarius',
    year_display: '90 BC',
    year_numeric: -90,
    era: 'Roman Republic',
    mint: 'Rome',
    metal: 'Silver',
    fineness: '.980',
    weight: 3.89,
    diameter: 19.0,
    die_axis: '3h',
    obverse_legend: '',
    obverse_desc: 'Laureate head of Apollo right.',
    reverse_legend: 'L PISO FRVGI',
    reverse_desc: 'Horseman galloping right, holding palm branch; control mark above.',
    edge_desc: 'Plain',
    catalog_ref: 'Crawford 340/1',
    rarity: 'Common',
    grade: 'VF-30',
    provenance: 'Ex. CNG Electronic Auction 356, 2015',
    story: 'The Calpurnii Pisones were a prominent plebeian family. This series is one of the most prolific Republican denarius types, with hundreds of die variants identified by control numerals and symbols. The Apollo obverse and horseman reverse allude to the Ludi Apollinares, games instituted in 212 BC.',
    purchase_price: 180.00,
    purchase_date: '2015-03-11',
    purchase_source: 'CNG'
  },

  // ── Roman Imperial — Gold ──────────────────────────────────────────────────
  {
    title: 'Constantius II Gold Solidus — Antioch',
    issuer: 'Constantius II',
    denomination: 'Solidus',
    year_display: '355 AD',
    year_numeric: 355,
    era: 'Roman Imperial',
    mint: 'Antioch',
    metal: 'Gold',
    fineness: '.999',
    weight: 4.47,
    diameter: 21.0,
    die_axis: '6h',
    obverse_legend: 'FL IVL CONSTANTIVS PERP AVG',
    obverse_desc: 'Pearl-diademed, draped and cuirassed bust of Constantius II right.',
    reverse_legend: 'VICTORIAE DD AVGG Q NN',
    reverse_desc: 'Two Victories standing facing each other, together holding a wreath inscribed VOT / XV / MVLT / XX; ANTOB in exergue.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC VIII Antioch 165',
    rarity: 'Uncommon',
    grade: 'AU-55',
    provenance: 'Ex. Sincona AG, Auction 77, 2021',
    story: 'Constantius II (337–361 AD) was the longest-reigning son of Constantine the Great and sole emperor from 353 AD. The Antioch mint was the principal production centre for the eastern frontier. The VOT / XV / MVLT / XX legend records vow ceremonies celebrating his regnal anniversaries — a standard propagandistic formula of late Roman solidi.',
    purchase_price: 450.00,
    purchase_date: '2021-05-19',
    purchase_source: 'Sincona AG'
  },

  // ── Roman Imperial — Orichalcum ────────────────────────────────────────────
  {
    title: 'Nero Sestertius — Roma',
    issuer: 'Nero',
    denomination: 'Sestertius',
    year_display: '65 AD',
    year_numeric: 65,
    era: 'Roman Imperial',
    mint: 'Rome',
    metal: 'Orichalcum',
    fineness: 'Base',
    weight: 26.82,
    diameter: 34.5,
    die_axis: '6h',
    obverse_legend: 'NERO CLAVD CAESAR AVG GER PM TR P IMP PP',
    obverse_desc: 'Laureate head of Nero right.',
    reverse_legend: 'ROMA S C',
    reverse_desc: 'Roma seated left on cuirass, holding parazonium and spear; shields arranged around base.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC I 393',
    rarity: 'Common',
    grade: 'VF-20',
    provenance: 'Ex. Bertolami Fine Arts, Auction 82, 2019',
    story: 'Under Nero, the sestertius reached its artistic and metallurgical peak. Orichalcum — a brass-like alloy of copper and zinc — was reserved for the highest-value bronze denominations. The Roma reverse symbolised the eternal city\'s martial glory. The large S C ("Senatus Consulto") indicates the Senate\'s nominal authority over base-metal coinage.',
    purchase_price: 380.00,
    purchase_date: '2019-09-24',
    purchase_source: 'Bertolami Fine Arts'
  },

  // ── Roman Imperial — Copper ────────────────────────────────────────────────
  {
    title: 'Antoninus Pius As — Libertas',
    issuer: 'Antoninus Pius',
    denomination: 'As',
    year_display: '145 AD',
    year_numeric: 145,
    era: 'Roman Imperial',
    mint: 'Rome',
    metal: 'Copper',
    fineness: 'Base',
    weight: 10.29,
    diameter: 27.5,
    die_axis: '12h',
    obverse_legend: 'ANTONINVS AVG PIVS PP TR P COS IIII',
    obverse_desc: 'Bare head of Antoninus Pius right.',
    reverse_legend: 'LIBERTAS COS IIII S C',
    reverse_desc: 'Libertas standing left, holding pileus and sceptre.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC III 840',
    rarity: 'Common',
    grade: 'G-6',
    provenance: 'Acquired from Agora Auctions, 2019',
    story: 'The copper As was the lowest-value regular denomination of the Imperial coinage. This example shows the heavy circulation wear typical of a coin that passed through many hands over decades of daily commerce. The Libertas reverse alludes to Antoninus Pius\'s policy of clemency and the restoration of freedoms after the austere later years of Hadrian.',
    purchase_price: 35.00,
    purchase_date: '2019-04-07',
    purchase_source: 'Agora Auctions'
  },

  // ── Roman Imperial — Billon ────────────────────────────────────────────────
  {
    title: 'Gallienus Antoninianus — Stag Reverse',
    issuer: 'Gallienus',
    denomination: 'Antoninianus',
    year_display: '267 AD',
    year_numeric: 267,
    era: 'Roman Imperial',
    mint: 'Milan',
    metal: 'Billon',
    fineness: '.025',
    weight: 2.95,
    diameter: 20.5,
    die_axis: '6h',
    obverse_legend: 'GALLIENVS AVG',
    obverse_desc: 'Radiate head of Gallienus right.',
    reverse_legend: 'DIANAE CONS AVG',
    reverse_desc: 'Stag walking right; X in exergue.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC V 179',
    rarity: 'Common',
    grade: 'VF-25',
    provenance: 'Ex. Leu Numismatik, Web Auction 16, 2020',
    story: 'The CONSERVATRIX series of Gallienus (253–268 AD) features animals sacred to Roman deities. The stag — Diana\'s animal — represents one of the most sought-after types in this series. By 267 AD the antoninianus had been so debased it was essentially bronze with a superficial silver wash, reflecting the financial pressures of the Crisis of the Third Century.',
    purchase_price: 45.00,
    purchase_date: '2020-02-12',
    purchase_source: 'Leu Numismatik'
  },

  // ── Roman Imperial — Bronze ────────────────────────────────────────────────
  {
    title: 'Constantine I Follis — Sol Invictus',
    issuer: 'Constantine I',
    denomination: 'Follis',
    year_display: '313 AD',
    year_numeric: 313,
    era: 'Roman Imperial',
    mint: 'Trier',
    metal: 'Bronze',
    fineness: 'Base',
    weight: 3.67,
    diameter: 22.0,
    die_axis: '6h',
    obverse_legend: 'IMP CONSTANTINVS AVG',
    obverse_desc: 'Laureate, cuirassed bust of Constantine I right.',
    reverse_legend: 'SOLI INVICTO COMITI',
    reverse_desc: 'Sol standing left, chlamys draped over left shoulder, raising right hand and holding globe; PTR in exergue.',
    edge_desc: 'Plain',
    catalog_ref: 'RIC VI Trier 870',
    rarity: 'Common',
    grade: 'EF-40',
    provenance: 'Ex. NAC AG, Auction 109, 2018',
    story: 'Struck shortly after the Battle of Milvian Bridge (312 AD), this coin reflects the transitional period when Constantine hedged between Sol Invictus worship and nascent Christianity. The Trier mint (PTR exergue) was Constantine\'s western power base. By 324 AD, when he became sole emperor, solar imagery would be progressively replaced by Christian symbolism.',
    purchase_price: 85.00,
    purchase_date: '2018-06-05',
    purchase_source: 'NAC AG'
  },

  // ── Ancient — Potin ────────────────────────────────────────────────────────
  {
    title: 'Arverni Potin — Bull Type',
    issuer: 'Arverni (tribe)',
    denomination: 'Potin',
    year_display: 'c. 80 BC',
    year_numeric: -80,
    era: 'Ancient',
    mint: 'Gaul (Arverni)',
    metal: 'Potin',
    fineness: 'Base',
    weight: 5.35,
    diameter: 20.0,
    die_axis: '12h',
    obverse_legend: '',
    obverse_desc: 'Stylized head right with cable border; abstract facial features in La Tène style.',
    reverse_legend: '',
    reverse_desc: 'Bull charging right; pellet below; annulet above.',
    edge_desc: 'Plain',
    catalog_ref: 'LT 3711; DT 3523',
    rarity: 'Common',
    grade: 'F-15',
    provenance: 'Found in Auvergne region, France; ex private collection, Clermont-Ferrand',
    story: 'Celtic potin coins were cast — not struck — from an alloy of tin, lead, and copper. This bull-type, attributed to the Arverni tribe of central Gaul (modern Auvergne), was widely used for small transactions in pre-Roman Gaul. The Arverni were the tribe of Vercingetorix, who led the last major Gallic revolt against Caesar in 52 BC. The stylized imagery reflects the La Tène artistic tradition.',
    purchase_price: 65.00,
    purchase_date: '2021-08-30',
    purchase_source: 'CGB Numismatique'
  },

  // ── Byzantine — Gold ───────────────────────────────────────────────────────
  {
    title: 'Phocas Gold Solidus — Constantinople',
    issuer: 'Phocas',
    denomination: 'Solidus',
    year_display: '604 AD',
    year_numeric: 604,
    era: 'Byzantine',
    mint: 'Constantinople',
    metal: 'Gold',
    fineness: '.960',
    weight: 4.40,
    diameter: 21.0,
    die_axis: '6h',
    obverse_legend: 'FOCAS PERP AVG',
    obverse_desc: 'Crowned bust of Phocas facing, wearing consular robes, holding mappa and cross-tipped sceptre.',
    reverse_legend: 'VICTORIA AVGG',
    reverse_desc: 'Angel standing facing, holding staff surmounted by chi-rho and globus cruciger; CONOB in exergue.',
    edge_desc: 'Plain',
    catalog_ref: 'Sear 620',
    rarity: 'Common',
    grade: 'AU-58',
    provenance: 'Ex. Classical Numismatic Group, Auction 111, 2019',
    story: 'Phocas (602–610 AD) seized the Byzantine throne by military revolt against Maurice. His solidi maintain the traditional standing-angel reverse introduced by Maurice. The CONOB exergue mark (Constantinopolis Obryzum — "pure gold of Constantinople") is the standard authenticating formula for Byzantine solidi struck at the imperial capital.',
    purchase_price: 620.00,
    purchase_date: '2019-11-13',
    purchase_source: 'CNG'
  },

  // ── Byzantine — Bronze ─────────────────────────────────────────────────────
  {
    title: 'Byzantine Anonymous Follis — Class A2',
    issuer: 'Basil II & Constantine VIII',
    denomination: 'Follis',
    year_display: 'c. 1020–1028 AD',
    year_numeric: 1024,
    era: 'Byzantine',
    mint: 'Constantinople',
    metal: 'Bronze',
    fineness: 'Base',
    weight: 11.23,
    diameter: 29.5,
    die_axis: '6h',
    obverse_legend: 'IC XC',
    obverse_desc: 'Nimbate bust of Christ Pantokrator facing, right hand raised in blessing, holding Gospels in left; IC XC flanking.',
    reverse_legend: 'ΙΗΣUΣ ΧΡΙΣΤΟΣ ΒΑΣΙΛΕΥ ΒΑΣΙΛΕ',
    reverse_desc: 'Inscription in four lines: IS / XS / bASI / LEVS ("Jesus Christ, King of Kings"); ornamental crosses flanking.',
    edge_desc: 'Plain',
    catalog_ref: 'Sear 1813',
    rarity: 'Common',
    grade: 'VG-8',
    provenance: 'Ex. Forum Ancient Coins, 2017',
    story: 'The Anonymous Follis series dispensed with the emperor\'s portrait and name entirely — a theological statement placing Christ as the true sovereign. Class A2, produced under Basil II and his immediate successors, is the most common variant. The heavy bronze fabric and large module made these coins ideal for everyday commerce in Byzantine markets from Constantinople to Thessaloniki.',
    purchase_price: 55.00,
    purchase_date: '2017-11-03',
    purchase_source: 'Forum Ancient Coins'
  },

  // ── Early Medieval ─────────────────────────────────────────────────────────
  {
    title: 'Offa of Mercia Penny — Canterbury',
    issuer: 'Offa, King of Mercia',
    denomination: 'Penny',
    year_display: 'c. 787 AD',
    year_numeric: 787,
    era: 'Early Medieval',
    mint: 'Canterbury',
    metal: 'Silver',
    fineness: '.925',
    weight: 1.31,
    diameter: 18.5,
    die_axis: '12h',
    obverse_legend: 'OFFA REX',
    obverse_desc: 'Stylized portrait of Offa right, with cross before face.',
    reverse_legend: 'EADBERHT',
    reverse_desc: 'Cross pattée; pellets in each angle.',
    edge_desc: 'Plain',
    catalog_ref: 'Spink 905; North 316',
    rarity: 'Scarce',
    grade: 'F-12',
    provenance: 'Ex. Dix Noonan Webb, Auction 165, 2020',
    story: 'Offa of Mercia (757–796 AD), the most powerful Anglo-Saxon king before Alfred the Great, reformed English coinage by introducing the lighter, broader penny based on the Frankish denier. The Canterbury mint was one of his primary production centres. Moneyer Eadberht is documented in the extant corpus of Offa\'s coinage. At 1.31g, this example is slightly below standard — consistent with gradual weight reduction across the reign.',
    purchase_price: 980.00,
    purchase_date: '2020-09-17',
    purchase_source: 'Dix Noonan Webb'
  },

  // ── High Medieval — Gold ───────────────────────────────────────────────────
  {
    title: 'Alfonso VIII Maravedi de Oro — Toledo',
    issuer: 'Alfonso VIII of Castile',
    denomination: 'Maravedi de Oro',
    year_display: 'c. 1175 AD',
    year_numeric: 1175,
    era: 'High Medieval',
    mint: 'Toledo',
    metal: 'Gold',
    fineness: '.937',
    weight: 3.87,
    diameter: 25.0,
    die_axis: '12h',
    obverse_legend: 'ALDEFONSUS REX CASTELLE ET TOLETI',
    obverse_desc: 'Cross potent within linear border; Latin legend around.',
    reverse_legend: '',
    reverse_desc: 'Arabic inscription in five lines within border, imitating Almohad dinar format; "Alfonso, King" in Arabic.',
    edge_desc: 'Plain',
    catalog_ref: 'AB 144.1; Cayon 1059',
    rarity: 'Rare',
    grade: 'VF-30',
    provenance: 'Ex. Jesús Vico S.A., Subasta 145, 2017',
    story: 'The gold maravedi of Alfonso VIII (1158–1214) was directly modelled on North African Islamic dinars to facilitate trade with the Muslim kingdoms of al-Andalus. The bilingual design — Latin on the obverse, Arabic on the reverse — is a physical embodiment of the convivencia of medieval Iberia. Known to collectors as the "alfonsino", this coin type was struck at Toledo, the ancient Visigothic capital and symbolic heart of the Castilian reconquista.',
    purchase_price: 3200.00,
    purchase_date: '2017-06-21',
    purchase_source: 'Jesús Vico S.A.'
  },

  // ── Early Islamic ──────────────────────────────────────────────────────────
  {
    title: 'Umayyad Silver Dirham — Damascus',
    issuer: 'Umayyad Caliphate (Sulayman ibn Abd al-Malik)',
    denomination: 'Dirham',
    year_display: '97 AH (715 AD)',
    year_numeric: 715,
    era: 'Early Islamic',
    mint: 'Damascus',
    metal: 'Silver',
    fineness: '.970',
    weight: 2.87,
    diameter: 26.0,
    die_axis: '12h',
    obverse_legend: 'لا إله إلا الله وحده لا شريك له',
    obverse_desc: 'Central field: Shahada in three lines. Marginal inscription: Quran 9:33 ("He sent His messenger with guidance and the religion of truth").',
    reverse_legend: 'الله أحد الله الصمد',
    reverse_desc: 'Central field: date and mint formula in four lines. Marginal inscription: Quran 112:1–3.',
    edge_desc: 'Plain',
    catalog_ref: 'Album 126.4',
    rarity: 'Common',
    grade: 'VF-35',
    provenance: 'Ex. Stephen Album Rare Coins, Auction 38, 2019',
    story: 'The Umayyad coinage reform of Abd al-Malik ibn Marwan (685–705 AD) produced the first purely epigraphic Islamic coinage — no figural imagery, only Quranic inscriptions and mint/date formulae. This dirham, issued under Caliph Sulayman ibn Abd al-Malik, represents the mature reformed standard. The high silver fineness (c. 97%) made Umayyad dirhams a trusted trade currency from the Iberian Peninsula to Central Asia.',
    purchase_price: 150.00,
    purchase_date: '2019-09-28',
    purchase_source: 'Stephen Album Rare Coins'
  },

  // ── High Medieval — Silver ─────────────────────────────────────────────────
  {
    title: 'Louis IX Gros Tournois',
    issuer: 'Louis IX of France',
    denomination: 'Gros Tournois',
    year_display: '1267 AD',
    year_numeric: 1267,
    era: 'High Medieval',
    mint: 'Tours',
    metal: 'Silver',
    fineness: '.958',
    weight: 4.17,
    diameter: 26.0,
    die_axis: '12h',
    obverse_legend: 'LVDOVICVS REX',
    obverse_desc: 'Stylized castle (Tour of Tours) within inner circle; twelve fleurs-de-lis around.',
    reverse_legend: 'BNDCTV SIT NOM DNI NRI DEI IHV XPI',
    reverse_desc: 'Cross pattée within inner circle; twelve fleurs-de-lis around.',
    edge_desc: 'Plain',
    catalog_ref: 'Duplessy 190',
    rarity: 'Common',
    grade: 'EF-40',
    provenance: 'Ex. Künker, Auction 329, 2020',
    story: 'The Gros Tournois, introduced by Saint Louis (Louis IX) in 1266, was one of medieval Europe\'s most influential coin designs. Its consistent weight and high silver fineness (.958) established it as a trusted international trade currency. The design was widely imitated by rulers across France, the Low Countries, and the Italian city-states for over a century. The reverse legend — "Blessed be the name of our Lord God Jesus Christ" — reflects Louis\'s devout character; he died on crusade three years after this coin was issued.',
    purchase_price: 220.00,
    purchase_date: '2020-10-22',
    purchase_source: 'Künker'
  },

  // ── Modern — Nickel ────────────────────────────────────────────────────────
  {
    title: 'Buffalo Nickel 1936-D',
    issuer: 'United States',
    denomination: 'Five Cents',
    year_display: '1936',
    year_numeric: 1936,
    era: 'Modern',
    mint: 'Denver',
    metal: 'Nickel',
    fineness: '.250',
    weight: 5.00,
    diameter: 21.2,
    die_axis: '6h',
    obverse_legend: 'LIBERTY',
    obverse_desc: 'Right-facing profile of a Native American man; LIBERTY above; date below; D mintmark above date.',
    reverse_legend: 'UNITED STATES OF AMERICA E PLURIBUS UNUM FIVE CENTS',
    reverse_desc: 'American bison standing left on a raised mound; FIVE CENTS below mound.',
    edge_desc: 'Plain',
    catalog_ref: 'KM 134',
    rarity: 'Common',
    grade: 'MS-63',
    provenance: 'Ex. private collection; Long Beach Expo, 2022',
    story: 'Designed by James Earle Fraser, the Buffalo Nickel (1913–1938) is among America\'s most beloved coin designs. Fraser used multiple Native American models — including Iron Tail, Two Moons, and John Big Tree — for the composite obverse portrait. The reverse bison was modelled on Black Diamond, a resident of the Central Park Zoo. The 1936-D from the Denver Mint is a common date prized for its typically bold strike.',
    purchase_price: 75.00,
    purchase_date: '2022-02-06',
    purchase_source: 'Long Beach Expo'
  }
];

function seed() {
  console.log(`Connecting to database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);

  // Create table if it doesn't exist (using the extended schema)
  // Note: We are manually defining this here for the script to be standalone,
  // mirroring src/common/schema.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS coins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      issuer TEXT,
      denomination TEXT,
      year_display TEXT,
      year_numeric INTEGER,
      era TEXT DEFAULT 'Modern',
      mint TEXT,
      metal TEXT,
      fineness TEXT,
      weight REAL,
      diameter REAL,
      die_axis TEXT,
      obverse_legend TEXT,
      obverse_desc TEXT,
      reverse_legend TEXT,
      reverse_desc TEXT,
      edge_desc TEXT,
      catalog_ref TEXT,
      rarity TEXT,
      grade TEXT,
      provenance TEXT,
      story TEXT,
      purchase_price REAL,
      purchase_date TEXT,
      purchase_source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insertStmt = db.prepare(`
    INSERT INTO coins (
      title, issuer, denomination, year_display, year_numeric, era, mint, metal, fineness,
      weight, diameter, die_axis, obverse_legend, obverse_desc, reverse_legend, reverse_desc, edge_desc,
      catalog_ref, rarity, grade, provenance, story, purchase_price, purchase_date, purchase_source
    ) VALUES (
      @title, @issuer, @denomination, @year_display, @year_numeric, @era, @mint, @metal, @fineness,
      @weight, @diameter, @die_axis, @obverse_legend, @obverse_desc, @reverse_legend, @reverse_desc, @edge_desc,
      @catalog_ref, @rarity, @grade, @provenance, @story, @purchase_price, @purchase_date, @purchase_source
    )
  `);

  const checkStmt = db.prepare('SELECT count(*) as count FROM coins WHERE title = ?');

  let addedCount = 0;

  db.transaction(() => {
    for (const coin of sampleCoins) {
      const existing = checkStmt.get(coin.title) as { count: number };
      if (existing.count === 0) {
        insertStmt.run(coin);
        console.log(`Added: ${coin.title}`);
        addedCount++;
      } else {
        console.log(`Skipped (already exists): ${coin.title}`);
      }
    }
  })();

  console.log(`\nDatabase seeding complete. Added ${addedCount} coins.`);
  db.close();
  process.exit(0);
}

try {
  seed();
} catch (error) {
  console.error('Seeding failed:', error);
  process.exit(1);
}
