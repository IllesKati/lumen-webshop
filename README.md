# LUMEN

A LUMEN egy magyar nyelvű, 3D-nyomtatott és egyedi gyártású termékeket bemutató
webshop-prototípus. A jelenlegi projekt egy statikus frontend: termékeket lehet
böngészni, keresni és kategória szerint szűrni, a kosár a böngészőben tárolódik,
az egyedi ajánlatkérő felület pedig bemutató módban működik.

**A projekt nem kezel valódi rendelést vagy fizetést.** Nincs hozzá backend,
adatbázis, készletkezelés, rendelésfeldolgozás vagy fizetési szolgáltatás.

## Technológiák

- **HTML5** – az oldal szerkezete és az ajánlatkérő űrlap.
- **CSS3** – moduláris stíluslapok, CSS-változók, reszponzív elrendezés.
- **JavaScript ES-modulok** – keretrendszer nélküli frontendlogika és
  adatvezérelt terméklista.
- **Three.js 0.160.0** – a termékmodálban megjelenő demonstrációs 3D-előnézet.
  A Three.js és az OrbitControls kiegészítő import mapen keresztül, CDN-ről töltődik.
- **Google Fonts** – Space Grotesk és Inter betűcsaládok, szintén külső címről.

Nincs buildlépés: a böngésző közvetlenül futtatja az ES-modulokat. A projekt
nem használ helyi npm-csomagtelepítést a megtekintéshez.

## Projektstruktúra

```text
3Dproject/
├── README.md
├── index.html
├── assets/
│   └── images/
│       └── products/
│           ├── README.txt
│           └── termékképek (.jpg)
├── css/
│   ├── main.css
│   ├── base/
│   ├── components/
│   ├── layout/
│   ├── responsive/
│   └── sections/
└── js/
    ├── main.js
    ├── custom-order.js
    ├── product-viewer.js
    └── data/
        └── products.js
```

- A `css/main.css` importálja a `base`, `layout`, `components`, `sections` és
  `responsive` alkönyvtárak stílusait.
- A termékadatok és a termékképek külön fájlokban vannak; a termékek listája a
  `js/data/products.js` fájlban található.
- A `js/main.js` indítja a felületet, kezeli a terméklistát, a szűrőket, a
  modált és a kosarat.
- A `js/custom-order.js` kezeli a bemutató ajánlatkérő űrlapot.
- A `js/product-viewer.js` kezeli az egy termékhez készült demonstrációs 3D-nézetet.
- A `assets/images/products/README.txt` jelzi, hogy a termékképek koncepcióképek,
  és nem igazolják valódi, legyártott termékek létezését.

## A kódban jelenleg megtalálható funkciók

Az alábbiak a forráskódban megvalósított frontendfunkciók; ez önmagában nem
jelenti azt, hogy minden böngészőben vagy eszközön tesztelve lettek.

- Reszponzív oldalfejléc, navigáció, mobilmenü és hivatkozások az oldalszekciókra.
- Termékkártyák megjelenítése a statikus termékadatokból, termékképekkel és
  HUF-ban formázott árakkal.
- Keresés a termék nevében, kategóriájában és leírásában, valamint kategória
  szerinti szűrés. A kategóriakártyák is aktiválják a szűrést.
- Termékrészletező modál, mennyiségválasztással és billentyűzetes bezárással.
- Kosárba tehető termékek, kosárpanel, mennyiség növelése/csökkentése, tétel
  törlése és részösszeg/összesen megjelenítése. A kosár legfeljebb 99 darabos
  mennyiséget enged tételenként.
- A „Moduláris asztali rendszerező” termék modáljában forgatható és nagyítható
  Three.js-előnézet, méret- és színválasztó. A modell geometriai elemekből
  épülő demonstráció, nem gyártási modell; ha a 3D-nézet nem érhető el, a
  termékkép marad használható.
- Egyedi ajánlatkérő felület saját 3D modellhez, egyedi ötlethez/fényképhez,
  egyedi termékhez és általános igényhez. Tartalmaz kötelezőmező- és
  e-mail-formátum-ellenőrzést, darabszám-ellenőrzést és fájlkiterjesztés-
  ellenőrzést a támogatott fájltípusokra.
- Billentyűzetes használatot segítő elemek, például fókuszkezelés és
  akadálymentességi attribútumok a menüben, kosárban és modálban.

## Helyi futtatás

Az ES-modulok miatt az `index.html` fájl közvetlen, `file://` protokollú
megnyitása nem megfelelő. A projekt gyökérmappáját statikus HTTP-kiszolgálón
keresztül kell kiszolgálni:

1. Nyisd meg a projekt gyökérmappáját egy szerkesztőben, például VS Code-ban.
2. Indítsd el a már rendelkezésre álló helyi statikus HTTP-kiszolgálót a
   projekt gyökerére. VS Code-ban használható például a Live Server bővítmény,
   ha telepítve van; a projekt nem igényli vagy telepíti ezt a bővítményt.
3. Nyisd meg a kiszolgáló által megadott helyi HTTP-címet a böngészőben.
4. A Three.js és a betűtípusok betöltéséhez internetkapcsolat szükséges.

## Külső függőségek és futtatási feltételek

- A `three` és `three/addons/` import map a `index.html` fájlban a jsDelivr
  CDN-re mutat; a termék-előnézet ezen keresztül tölti be a Three.js-t és az
  OrbitControls modult.
- A Google Fonts szolgáltatásról töltődik be a Space Grotesk és az Inter.
- A futtatáshoz modern, ES-modulokat és import mapet támogató böngésző, valamint
  a 3D-előnézethez WebGL-képes környezet szükséges. A helyi oldal kiszolgálásához
  HTTP-szerver kell.
- A CDN-ek elérhetetlensége megakadályozhatja a külső betűtípusok vagy a 3D
  előnézet betöltését; a termékmodál kódja ilyenkor termékképes tartalékot mutat.

## Korlátok és hiányzó részek

- **Bemutató ajánlatkérés:** az űrlap ellenőrzi a megadott adatokat, és
  visszajelzést mutat, de nem küldi el és nem tárolja az adatokat. A fájlok
  kiválasztása csak a böngészőben történik; a fájlok sem kerülnek feltöltésre.
- **Helyi kosártárolás:** a kosár a böngésző `localStorage`-ában, a `lumen-cart`
  kulcson tárolódik. Ez csak az adott böngésző helyi állapota, nem központi
  rendelési adat, és nem szinkronizálódik más eszközökkel vagy felhasználói
  fiókkal. A kosár tartalma nem indít rendelést.
- **Backend hiánya:** a termékadatok statikus JavaScript-adatok. Nincs szerver,
  adatbázis, ügyfélfiók, készlet- vagy szállításkezelés, rendelés-nyilvántartás,
  e-mail-küldés vagy adminisztráció.
- **Nincs fizetés vagy checkout:** a kosárban összeg látható, de nincs
  pénztárfolyamat, fizetési szolgáltatói integráció vagy valódi vásárlás.
- **3D korlátai:** a kezdőlapi vászonhoz tartozó Three.js-jelenet nincs
  megvalósítva; a hero illusztrációja statikus SVG. Interaktív 3D-nézet csak a
  rendszerező termék modáljában van, demonstrációs geometriával.
- **Termékek és árak:** a termékképek koncepcióképek, a katalógus és az árak
  bemutató adatok. Az árak nem tekinthetők valós ajánlatnak vagy aktuális
  kereskedelmi árnak.
- **Jogi és kapcsolati információk:** a láblécben a szállítási és fizetési
  tájékoztató, GYIK, adatkezelési tájékoztató és ÁSZF még nem működő oldalak;
  közvetlen elérhetőségi adat sincs megadva.

## Egy valódi webshophoz szükséges fő fejlesztések

1. Backend API és adatbázis a termékekhez, árakhoz, felhasználókhoz, kosarakhoz
   és rendelésekhez.
2. Szerveroldali űrlapfeldolgozás, fájlfeltöltés, biztonságos validálás és
   ajánlatkérés-kezelés.
3. Valódi checkout, fizetési szolgáltatói integráció, rendelés-visszaigazolás
   és hibakezelés.
4. Készlet-, szállítási, adózási és rendelésállapot-kezelés, valamint
   adminisztrációs felület.
5. Valós termékadatok, ellenőrzött képek és árak, valamint a termékleírások és
   3D-modellek összhangba hozása a ténylegesen gyártható termékekkel.
6. Kapcsolati adatok és a szükséges jogi tájékoztatók elkészítése.
7. Automatizált és böngészőben végzett tesztek a termékböngészésre, a kosárra,
   az űrlapra, a reszponzív megjelenésre és a 3D-előnézetre.

## Ellenőrzött állapot

E dokumentációfrissítés során a README-t, az `index.html`, a JavaScript-
forrásokat és a termékkép-jegyzéket vizsgáltam át. A README állításait a
forráskódban található implementációkhoz igazítottam. A felületet nem
futtattam böngészőben, és automatizált tesztet sem futtattam; ezért a fent
felsorolt működések kódból megállapíthatók, de ebben a munkában nem
böngészőteszttel igazoltak.
