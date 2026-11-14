/* ==========================================================================
   main.js — JAVASCRIPT BELÉPÉSI PONT (1. fázis — alkalmazás-alap)
   --------------------------------------------------------------------------
   Ez a fájl az ELSŐ JavaScript, ami lefut az oldalon. A feladata, hogy
   "elindítsa" az alkalmazást, és egyetlen helyen tartsa nyilván, mi épül
   fel az oldalon.

   FELÉPÍTÉS (fentről lefelé):
     1. ALKALMAZÁS-ÁLLAPOT  — az `app` objektum (egy közös "tároló")
     2. DOM-GYŰJTŐ          — `getDomRefs()`: a data-* hookok beolvasása
     3. MODUL-INICIALIZÁLÓK — üres, de dokumentált függvények (header,
                              kereső, kosár, modal, szűrők, kategóriák,
                              termékek, hero/3D)
     4. initApp()           — a modulok sorrendbe állítása
     5. INDÍTÁS             — DOMContentLoaded után indul

   MODULÁRIS FELÉPÍTÉS: minden funkció külön, kis függvényben él. Ha egy
   modul hibás, itt egy helyen kikommentelhető, a többi tovább működik.

   EBBEN A FÁZISBAN: minden modul-függvény CSAK előkészít — nem tartalmaz
   üzleti logikát (nincs terméklista, nincs kosárkezelés, nincs három.js
   jelenet). Minden modulfüggvény ellenálló azzal szemben, hogy a hozzá
   tartozó HTML rész MÉG ÜRES (a 0. fázisú vázban még az) — ezért mindenhol
   null-ellenőrzés és `app.dom` gyorsítótár-használat van.

   ES MODULE: a HTML `type="module"`-ként tölti be, tehát az import/export
   és a strict mód automatikus. KÜLSŐ KÖNYVTÁRAT NEM HASZNÁL.

   A THREE.JS betöltését szándékosan NEM itt, statikusan importáljuk: az
   import map ugyan készen áll az index.html-ben, de a 3D modulok a
   későbbi fázisokban, igény szerinti dinamikus importtal (`await import()`)
   kerülnek majd be — így a kezdőlap gyorsabb marad.
   ========================================================================== */


import { products } from "./data/products.js";
import { initCustomOrder } from "./custom-order.js";
import { activateProductViewer, setProductViewerColor, setProductViewerSize, suspendProductViewer } from "./product-viewer.js";

const CART_STORAGE_KEY = "lumen-cart";
const MAX_CART_QUANTITY = 99;
const PROJECT_ROOT_URL = new URL("../", import.meta.url);
const CART_SCROLL_LOCK = Symbol("cart");
const PRODUCT_MODAL_SCROLL_LOCK = Symbol("product-modal");
const scrollLockOwners = new Set();
const scrollLockStyleProperties = {
  documentElement: ["overflow", "scroll-behavior"],
  body: ["position", "top", "left", "width", "overflow"],
};
let lockedScrollPosition = null;
let savedScrollLockStyles = null;
const organizerColors = [
  { name: "Fekete", value: "graphite", hex: 0x20242b },
  { name: "Fehér", value: "ivory", hex: 0xe6e2d8 },
  { name: "Narancssárga", value: "orange", hex: 0xd96a32 },
  { name: "Türkiz", value: "turquoise", hex: 0x28afa7 },
];
let selectedOrganizerColor = organizerColors[0];
const organizerSizes = [
  { name: "Kicsi", value: "small", scale: 0.8 },
  { name: "Közepes", value: "medium", scale: 1 },
  { name: "Nagy", value: "large", scale: 1.2 },
];
let selectedOrganizerSize = organizerSizes[1];
const productDetailPaths = {
  "gift-aurora-lamp": "products/modular-desk-organizer.html",
  "gift-ceramic-vase": "products/personalized-door-nameplate.html",
  "toy-stellar-cube": "products/geometric-planter.html",
  "toy-orbit-puzzle": "products/cable-organizer.html",
  "tech-breeze-buds": "products/geometric-lampshade.html",
  "tech-signal-dock": "products/modular-wall-organizer.html",
  "design-muse-sculpt": "products/custom-desk-nameplate.html",
  "design-noir-stand": "products/custom-decor-object.html",
};

const categoryFilterOptions = [
  { value: "all", label: "Összes termék" },
  { value: "Kész 3D termékek", label: "3D termékkoncepciók" },
  { value: "Egyedi termékek", label: "Egyedi termékek" },
  { value: "Saját 3D modell", label: "Saját 3D modell" },
  { value: "Egyedi ötlet / fénykép", label: "Egyedi ötlet / fénykép" },
];

function getCategoryDisplayName(category) {
  return category === "Kész 3D termékek" ? "3D termékkoncepciók" : category;
}

function acquirePageScrollLock(owner) {
  if (scrollLockOwners.has(owner)) return;

  if (scrollLockOwners.size === 0) {
    lockedScrollPosition = { x: window.scrollX, y: window.scrollY };
    savedScrollLockStyles = Object.fromEntries(
      Object.entries(scrollLockStyleProperties).map(([elementName, properties]) => {
        const element = elementName === "documentElement" ? document.documentElement : document.body;
        return [elementName, Object.fromEntries(properties.map((property) => [
          property,
          {
            value: element.style.getPropertyValue(property),
            priority: element.style.getPropertyPriority(property),
          },
        ]))];
      }),
    );

    document.documentElement.style.setProperty("overflow", "hidden");
    document.body.style.setProperty("position", "fixed");
    document.body.style.setProperty("top", `${-lockedScrollPosition.y}px`);
    document.body.style.setProperty("left", `${-lockedScrollPosition.x}px`);
    document.body.style.setProperty("width", `${document.documentElement.clientWidth}px`);
    document.body.style.setProperty("overflow", "hidden");
  }

  scrollLockOwners.add(owner);
}

function releasePageScrollLock(owner) {
  if (!scrollLockOwners.delete(owner) || scrollLockOwners.size > 0) return;

  for (const [elementName, properties] of Object.entries(savedScrollLockStyles)) {
    const element = elementName === "documentElement" ? document.documentElement : document.body;
    for (const [property, { value, priority }] of Object.entries(properties)) {
      if (value) {
        element.style.setProperty(property, value, priority);
      } else {
        element.style.removeProperty(property);
      }
    }
  }

  const scrollBehavior = savedScrollLockStyles.documentElement["scroll-behavior"];
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
  window.scrollTo(lockedScrollPosition.x, lockedScrollPosition.y);
  if (scrollBehavior.value) {
    document.documentElement.style.setProperty(
      "scroll-behavior",
      scrollBehavior.value,
      scrollBehavior.priority,
    );
  } else {
    document.documentElement.style.removeProperty("scroll-behavior");
  }
  lockedScrollPosition = null;
  savedScrollLockStyles = null;
}

/* ==========================================================================
   1. ALKALMAZÁS-ÁLLAPOT
   ========================================================================== */

/**
 * Központi alkalmazás-objektum.
 *
 * Ez az egyetlen "igazság-forrás": ide kerül minden megosztott adat,
 * amit a modulok használnak. Egyelőre csak az állapot VÁZÁT töltjük fel,
 * hogy a későbbi fázisokban ne kelljen újragondolni a szerkezetet.
 */
const app = {
  /* --- Verzió és fázis: segít a hibakeresésnél a konzolban --------------- */
  version: "1.0.0",
  phase: 1,

  /* --- DOM-gyorsítótár: a gyakran használt elemek egy helyen ------------ */
  dom: {
    header: null,
    cartDrawer: null,
    cartOverlay: null,
    cartCount: null,
    productModal: null,
    toast: null,
    heroCanvas: null,
    categoriesSection: null,
    productsSection: null,
    searchToggle: null,
    searchInput: null,
    cartToggle: null,
    main: null,
  },

  /* --- Adat-állapot: a későbbi fázisok töltik fel tartalommal ----------- */
  state: {
    products: [],          // teljes terméklista (3. fázis)
    categories: [],        // kategóriák (3. fázis)
    filters: {             // aktív szűrők (3. fázis)
      search: "",
      category: "all",
      minPrice: null,
      maxPrice: null,
    },
    cart: [],              // kosár tételek (4. fázis)
    activeProductId: null, // a modalban nyitott termék (5-6. fázis)
  },

  /* --- Modul-registry: melyik modul futott már le ----------------------- */
  modules: new Set(),

  /* --- Állapotjelzők: mit tud már az alkalmazás ------------------------- */
  flags: {
    domReady: false, // a DOM beolvasása megtörtént
    appReady: false, // minden modul lefutott
  },
};

/**
 * Fejlesztői naplózás kapcsolója.
 * Miért külön változó? Mert így egyetlen helyen kikapcsolható az összes
 * napló üzenet, mielőtt az oldal élesbe kerül.
 */
const DEBUG = true; // kiadáskor: false

function log(...args) {
  if (DEBUG) {
    console.log("%c[LUMEN]", "color:#c9a227; font-weight:600;", ...args);
  }
}

function warn(...args) {
  if (DEBUG) {
    console.warn("%c[LUMEN]", "color:#c9a227; font-weight:600;", ...args);
  }
}

function loadCart(appRef) {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart === null) {
      appRef.state.cart = [];
      return;
    }

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) {
      throw new TypeError("A mentett kosár szerkezete érvénytelen.");
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const restoredItems = new Map();
    for (const item of parsedCart) {
      if (
        !item
        || typeof item !== "object"
        || Array.isArray(item)
        || !productsById.has(item.productId)
        || !Number.isSafeInteger(item.quantity)
        || item.quantity <= 0
      ) {
        continue;
      }

      const product = productsById.get(item.productId);
      const restoredItem = {
        productId: item.productId,
        quantity: Math.min(item.quantity, MAX_CART_QUANTITY),
        ...normalizeCartOptions(product, item),
      };
      const itemKey = getCartItemKey(restoredItem);
      const existingItem = restoredItems.get(itemKey);

      if (existingItem) {
        existingItem.quantity = Math.min(
          MAX_CART_QUANTITY,
          existingItem.quantity + restoredItem.quantity,
        );
      } else {
        restoredItems.set(itemKey, restoredItem);
      }
    }
    appRef.state.cart = [...restoredItems.values()];

    if (JSON.stringify(appRef.state.cart) !== JSON.stringify(parsedCart)) {
      saveCart(appRef);
    }
  } catch (error) {
    appRef.state.cart = [];
    warn("A mentett kosár nem tölthető be; üres kosárral indulunk.", error);

    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch (storageError) {
      warn("A hibás kosármentés nem törölhető a localStorage-ból.", storageError);
    }
  }
}

function saveCart(appRef) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(appRef.state.cart));
  } catch (error) {
    warn("A kosár nem menthető a localStorage-ba.", error);
  }
}

function normalizeCartOptions(product, options = {}) {
  if (!product.demoPricing) return {};

  const validSizes = Object.keys(product.demoPricing.sizePrices);
  const size = validSizes.includes(options.size)
    ? options.size
    : product.demoPricing.defaultSize;
  const color = organizerColors.some((item) => item.value === options.color)
    ? options.color
    : organizerColors[0].value;

  return { size, color };
}

function getCartItemKey(item) {
  return [item.productId, item.size ?? "", item.color ?? ""].join(":");
}

function getProductUnitPrice(product, options = {}) {
  if (!product.demoPricing) return product.price;

  const normalizedOptions = normalizeCartOptions(product, options);
  return product.demoPricing.sizePrices[normalizedOptions.size];
}

function resolveProductImageUrl(imagePath) {
  return new URL(imagePath, PROJECT_ROOT_URL).href;
}

function addProductToCart(appRef, product, quantity = 1, options = {}) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    warn("A kosárba csak pozitív, biztonságos egész mennyiség adható.", { quantity });
    return;
  }

  const safeQuantity = Math.min(quantity, MAX_CART_QUANTITY);
  const cartItemData = {
    productId: product.id,
    quantity: safeQuantity,
    ...normalizeCartOptions(product, options),
  };
  const cartItem = appRef.state.cart.find((item) => getCartItemKey(item) === getCartItemKey(cartItemData));
  if (cartItem) {
    cartItem.quantity = Math.min(
      MAX_CART_QUANTITY,
      cartItem.quantity + safeQuantity,
    );
  } else {
    appRef.state.cart.push(cartItemData);
  }

  saveCart(appRef);
  updateCartCount(appRef);
}


/* ==========================================================================
   2. DOM-GYŰJTŐ — a data-* hookok és az azonosítók beolvasása
   ========================================================================== */

/**
 * Összegyűjti a gyakran használt DOM-elemeket az `app.dom` gyorsítótárba.
 *
 * MIÉRT data-* ATTRIBÚTUMOK? Mert a HTML úgy épül fel, hogy a JS ne az
 * osztálynevekre (amik a dizájn miatt változhatnak), hanem stabil hookokra
 * kössön: `data-header`, `data-search-toggle`, `data-cart-toggle`,
 * `data-cart-count` — és a stabil `id`-kra (#cart-drawer, #product-modal,
 * #hero-canvas, #main).
 *
 * FONTOS: minden lekérdezés `null`-t adhat vissza, ha az adott HTML rész
 * még nem készült el. Ez NEM hiba: az app ilyenkor is hibátlanul fut.
 *
 * @returns {object} a feltöltött `app.dom` objektum
 */
function getDomRefs() {
  const dom = app.dom;
  const currentPath = window.location.pathname.toLocaleLowerCase("en-US");
  const homePagePaths = [
    PROJECT_ROOT_URL.pathname.toLocaleLowerCase("en-US"),
    new URL("index.html", PROJECT_ROOT_URL).pathname.toLocaleLowerCase("en-US"),
  ];
  const isHomePage = homePagePaths.includes(currentPath);
  const homePageOnlyRefs = new Set([
    "searchToggle",
    "productModal",
    "heroCanvas",
    "categoriesSection",
    "productsSection",
  ]);

  /* Az id- és data-alapú hookok egységes, olvasható listája. */
  const refs = {
    header: "[data-header]",
    searchToggle: "[data-search-toggle]",
    cartToggle: "[data-cart-toggle]",
    cartCount: "[data-cart-count]",
    cartDrawer: "#cart-drawer",
    productModal: "#product-modal",
    toast: "#toast",
    heroCanvas: "#hero-canvas",
    categoriesSection: "#categories",
    productsSection: "#products",
    main: "#main",
  };

  for (const [key, selector] of Object.entries(refs)) {
    const el = document.querySelector(selector);
    dom[key] = el;

    /* A főoldali funkciók hookjai más oldalakon szándékosan hiányoznak. */
    if (!el && (!homePageOnlyRefs.has(key) || isHomePage)) {
      warn(`A(z) "${selector}" elem még nem található a DOM-ban.`);
    }
  }

  return dom;
}


/* ==========================================================================
   3. MODUL-INICIALIZÁLÓK
   --------------------------------------------------------------------------
   Mindegyik függvény ugyanazt a mintát követi:
     - lekéri a saját DOM-elemét az `app.dom`-ból,
     - ha nincs (üres a HTML rész), csendben kilép az első sorban,
     - beregisztrálja magát az `app.modules`-ba, ha sikeresen elindult,
     - logol egy sort a konzolra.

   EBBEN A FÁZISBAN egyik sem tartalmaz tényleges működést.
   ========================================================================== */

/**
 * 1. modul — FEJLÉC (sticky viselkedés, mobil menü).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initHeader(appRef) {
  const header = appRef.dom.header;
  if (!header) return;

  const menuToggle = header.querySelector("[data-menu-toggle]");
  const navigation = header.querySelector("#site-navigation");
  if (!menuToggle || !navigation) return;

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Menü megnyitása");
    navigation.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Menü megnyitása" : "Menü bezárása");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
    closeMenu();
    menuToggle.focus();
  });

  window.matchMedia("(min-width: 760px)").addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  appRef.modules.add("header");
  log("header modul előkészítve.", { mobilmenü: true });
}

/**
 * 2. modul — KERESÉS (keresőmező és a találatok szűrése).
 * A kereső gomb a fejlécben él (`data-search-toggle`).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initSearch(appRef) {
  const searchToggle = appRef.dom.searchToggle;
  const searchInput = appRef.dom.productsSection?.querySelector("[data-product-search]");
  if (!searchToggle || !searchInput) return;

  appRef.dom.searchInput = searchInput;
  searchInput.addEventListener("input", () => {
    appRef.state.filters.search = searchInput.value;
    renderFilteredProducts(appRef);
  });

  searchToggle.addEventListener("click", () => searchInput.focus());

  appRef.modules.add("search");
  log("kereső modul elindítva.");
}

/**
 * 3. modul — KOSÁR (drawer panel és a kosárszám-jelvény).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function updateCartCount(appRef) {
  const itemCount = appRef.state.cart.reduce((total, item) => total + item.quantity, 0);
  const { cartCount, cartToggle } = appRef.dom;

  if (cartCount) {
    cartCount.textContent = String(itemCount);
    cartCount.hidden = itemCount === 0;
  }

  cartToggle?.setAttribute("aria-label", `Bevásárlókosár, ${itemCount} termék`);
}

function renderCartDrawer(appRef) {
  const { cartDrawer } = appRef.dom;
  const cartEntries = appRef.state.cart.flatMap((cartItem) => {
    const product = appRef.state.products.find((item) => item.id === cartItem.productId);
    return product
      ? [{ ...cartItem, product, unitPrice: getProductUnitPrice(product, cartItem) }]
      : [];
  });
  const total = cartEntries.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemsMarkup = cartEntries.map(({ product, quantity, unitPrice, size, color }) => {
    const sizeName = organizerSizes.find((item) => item.value === size)?.name;
    const colorName = organizerColors.find((item) => item.value === color)?.name;
    const variantMarkup = product.demoPricing
      ? `<p class="cart-drawer__item-price">Méret: ${sizeName} · Szín: ${colorName}</p>`
      : "";
    const itemKey = getCartItemKey({ productId: product.id, size, color });

    return `
    <li class="cart-drawer__item" data-cart-product-id="${product.id}" data-cart-item-key="${itemKey}">
      <img class="cart-drawer__item-image" src="${resolveProductImageUrl(product.image)}" alt="${product.name}" />
      <div class="cart-drawer__item-content">
        <p class="cart-drawer__item-title">${product.name}</p>
        ${variantMarkup}
        <p class="cart-drawer__item-price">${product.demoPricing ? "Demonstrációs egységár" : "Egységár"}: ${formatPrice(unitPrice)}</p>
        <p class="cart-drawer__item-price">Részösszeg: ${formatPrice(unitPrice * quantity)}</p>
        <div class="cart-drawer__item-quantity" role="group" aria-label="${product.name} mennyisége">
          <button class="btn btn--ghost btn--sm" type="button" data-cart-action="decrease"
            data-cart-item-key="${itemKey}" aria-label="${product.name} mennyiségének csökkentése">−</button>
          <output aria-label="Darabszám: ${product.name}">${quantity}</output>
          <button class="btn btn--ghost btn--sm" type="button" data-cart-action="increase"
            ${quantity >= MAX_CART_QUANTITY ? "disabled" : ""}
            data-cart-item-key="${itemKey}" aria-label="${product.name} mennyiségének növelése">+</button>
        </div>
      </div>
      <button class="cart-drawer__item-remove" type="button" data-cart-action="remove"
        data-cart-item-key="${itemKey}" aria-label="${product.name} törlése">
        <span aria-hidden="true">×</span>
      </button>
    </li>
  `;
  }).join("");

  cartDrawer.innerHTML = `
    <header class="cart-drawer__header">
      <h2 id="cart-drawer-title" class="cart-drawer__title">Kosár</h2>
      <button class="cart-drawer__close" type="button" data-cart-close aria-label="Kosár bezárása">×</button>
    </header>
    <div class="cart-drawer__body">
      ${cartEntries.length
      ? `<ul class="cart-drawer__items">${itemsMarkup}</ul>`
      : '<p class="cart-drawer__empty" role="status">A kosarad jelenleg üres.</p>'}
    </div>
    <footer class="cart-drawer__footer">
      <div class="cart-drawer__summary">
        <p class="cart-drawer__subtotal cart-drawer__subtotal--total">
          <span>Kosár összesen</span><strong>${formatPrice(total)}</strong>
        </p>
      </div>
    </footer>
  `;

  updateCartCount(appRef);
}

function initCart(appRef) {
  const { productsSection, cartDrawer, cartToggle, cartCount } = appRef.dom;
  if (!cartDrawer || !cartToggle || !cartCount) return;
  if (!productsSection) appRef.state.products = products;

  const cartOverlay = document.createElement("div");
  cartOverlay.className = "cart-overlay";
  cartOverlay.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cartOverlay, cartDrawer);
  appRef.dom.cartOverlay = cartOverlay;

  cartDrawer.setAttribute("role", "dialog");
  cartDrawer.setAttribute("aria-modal", "true");
  cartDrawer.setAttribute("aria-labelledby", "cart-drawer-title");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartDrawer.setAttribute("tabindex", "-1");
  cartToggle.setAttribute("aria-controls", "cart-drawer");
  cartToggle.setAttribute("aria-haspopup", "dialog");
  cartToggle.setAttribute("aria-expanded", "false");

  cartCount.setAttribute("aria-live", "polite");
  cartCount.setAttribute("aria-atomic", "true");

  let previousFocus = null;

  const openCart = () => {
    if (!cartDrawer.hidden) return;

    previousFocus = document.activeElement;
    acquirePageScrollLock(CART_SCROLL_LOCK);
    renderCartDrawer(appRef);
    cartDrawer.hidden = false;
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    cartOverlay.classList.add("is-open");
    cartOverlay.setAttribute("aria-hidden", "false");
    cartToggle.setAttribute("aria-expanded", "true");
    cartDrawer.querySelector("[data-cart-close]").focus();
  };

  const closeCart = () => {
    cartDrawer.classList.remove("is-open");
    cartDrawer.hidden = true;
    cartDrawer.setAttribute("aria-hidden", "true");
    cartOverlay.classList.remove("is-open");
    cartOverlay.setAttribute("aria-hidden", "true");
    cartToggle.setAttribute("aria-expanded", "false");
    releasePageScrollLock(CART_SCROLL_LOCK);
    (previousFocus?.isConnected ? previousFocus : cartToggle).focus({ preventScroll: true });
  };

  cartToggle.addEventListener("click", openCart);
  cartOverlay.addEventListener("click", closeCart);

  cartDrawer.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-cart-close]");
    if (closeButton) {
      closeCart();
      return;
    }

    const actionButton = event.target.closest("[data-cart-action]");
    if (!actionButton) return;

    const { cartAction, cartItemKey } = actionButton.dataset;
    const itemIndex = appRef.state.cart.findIndex((item) => getCartItemKey(item) === cartItemKey);
    if (itemIndex === -1) return;

    if (cartAction === "increase") {
      if (appRef.state.cart[itemIndex].quantity >= MAX_CART_QUANTITY) return;
      appRef.state.cart[itemIndex].quantity += 1;
    } else if (cartAction === "decrease") {
      appRef.state.cart[itemIndex].quantity -= 1;
      if (appRef.state.cart[itemIndex].quantity <= 0) {
        appRef.state.cart.splice(itemIndex, 1);
      }
    } else if (cartAction === "remove") {
      appRef.state.cart.splice(itemIndex, 1);
    } else {
      return;
    }

    saveCart(appRef);
    renderCartDrawer(appRef);
    const nextAction = [...cartDrawer.querySelectorAll("[data-cart-action]")].find(
      (button) => button.dataset.cartItemKey === cartItemKey && button.dataset.cartAction === cartAction,
    ) ?? cartDrawer.querySelector("[data-cart-action]") ?? cartDrawer.querySelector("[data-cart-close]");
    nextAction.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (cartDrawer.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeCart();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = [...cartDrawer.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement) {
      event.preventDefault();
      cartDrawer.focus();
    } else if (event.shiftKey && (document.activeElement === firstElement || !cartDrawer.contains(document.activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (document.activeElement === lastElement || !cartDrawer.contains(document.activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-to-cart]");
    const productCard = addButton?.closest("[data-product-id]");
    if (!productCard) return;

    const product = appRef.state.products.find((item) => item.id === productCard.dataset.productId);
    if (!product) return;

    const sizePicker = productCard.querySelector("[data-size-picker]");
    const colorPicker = productCard.querySelector("[data-color-picker]");
    const options = sizePicker && colorPicker
      ? {
        size: sizePicker.querySelector("[data-product-size][aria-pressed='true']")?.dataset.productSize,
        color: colorPicker.querySelector("[data-product-color][aria-pressed='true']")?.dataset.productColor,
      }
      : {};

    event.stopPropagation();
    addProductToCart(appRef, product, 1, normalizeCartOptions(product, options));
  });

  renderCartDrawer(appRef);
  updateCartCount(appRef);

  appRef.modules.add("cart");
  log("kosár modul elindítva.");
}

/**
 * 4. modul — TERMÉKMODAL (részletes nézet).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initProductModal(appRef) {
  const modal = appRef.dom.productModal;
  const productsSection = appRef.dom.productsSection;
  const customOrderPanel = document.querySelector("#custom-order-form");
  if (!modal || !productsSection) return;

  let previousFocus = null;
  let quantity = 1;

  const updateModalPrices = (product) => {
    const unitPrice = getProductUnitPrice(product, { size: selectedOrganizerSize.value });
    const unitPriceElement = modal.querySelector("[data-modal-unit-price]");
    const subtotalElement = modal.querySelector("[data-modal-subtotal]");
    if (unitPriceElement) unitPriceElement.textContent = formatPrice(unitPrice);
    if (subtotalElement) {
      subtotalElement.textContent = formatPrice(unitPrice * quantity);
      subtotalElement.closest(".modal__subtotal").hidden = quantity === 1;
    }
  };

  const renderOrganizerColors = () => `
    <fieldset class="modal__color-picker" aria-label="Színválasztás">
      <legend class="modal__color-legend">Szín <span>${selectedOrganizerColor.name}</span></legend>
      <div class="modal__color-options">
        ${organizerColors.map((color) => `
          <button class="modal__color-option${color === selectedOrganizerColor ? " is-selected" : ""}"
            type="button" data-product-color="${color.value}" aria-pressed="${color === selectedOrganizerColor}"
            aria-label="${color.name}" style="--swatch-color: #${color.hex.toString(16).padStart(6, "0")}">
            <span class="modal__color-swatch" aria-hidden="true"></span>
            <span>${color.name}</span>
          </button>
        `).join("")}
      </div>
    </fieldset>
  `;

  const renderOrganizerSizes = () => `
    <fieldset class="modal__size-picker" aria-label="Méretválasztás">
      <legend class="modal__size-legend">Méret <span>${selectedOrganizerSize.name}</span></legend>
      <div class="modal__size-options">
        ${organizerSizes.map((size) => `
          <button class="modal__size-option${size === selectedOrganizerSize ? " is-selected" : ""}"
            type="button" data-product-size="${size.value}" aria-pressed="${size === selectedOrganizerSize}">
            ${size.name}
          </button>
        `).join("")}
      </div>
    </fieldset>
  `;

  modal.addEventListener("click", (event) => {
    const colorButton = event.target.closest("[data-product-color]");
    if (!colorButton || !modal.contains(colorButton)) return;

    selectedOrganizerColor = organizerColors.find((color) => color.value === colorButton.dataset.productColor);
    if (!selectedOrganizerColor) return;

    setProductViewerColor(selectedOrganizerColor.hex);
    modal.querySelectorAll("[data-product-color]").forEach((button) => {
      const isSelected = button === colorButton;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    modal.querySelector(".modal__color-legend span").textContent = selectedOrganizerColor.name;
  });

  modal.addEventListener("click", (event) => {
    const sizeButton = event.target.closest("[data-product-size]");
    if (!sizeButton || !modal.contains(sizeButton)) return;

    selectedOrganizerSize = organizerSizes.find((size) => size.value === sizeButton.dataset.productSize);
    if (!selectedOrganizerSize) return;

    setProductViewerSize(selectedOrganizerSize.scale);
    modal.querySelectorAll("[data-product-size]").forEach((button) => {
      const isSelected = button === sizeButton;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    modal.querySelector(".modal__size-legend span").textContent = selectedOrganizerSize.name;
    const product = appRef.state.products.find((item) => item.id === appRef.state.activeProductId);
    if (product) updateModalPrices(product);
  });

  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("tabindex", "-1");

  const closeModal = ({ restoreFocus = true } = {}) => {
    suspendProductViewer();
    modal.classList.remove("is-open");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    appRef.state.activeProductId = null;
    releasePageScrollLock(PRODUCT_MODAL_SCROLL_LOCK);
    if (restoreFocus && customOrderPanel?.hidden !== false) {
      (previousFocus?.isConnected ? previousFocus : productsSection).focus({ preventScroll: true });
    }
  };

  const startQuoteRequest = (product, trigger) => {
    const orderForm = document.querySelector("#custom-order [data-custom-order-form]");
    const productNameField = orderForm?.elements.namedItem("product-name");
    const productIdField = orderForm?.elements.namedItem("productId");
    const requestButton = document.querySelector(
      '#custom-order [data-custom-order-type="Egyedi termék"]',
    );
    if (!product || !requestButton || !productNameField || !productIdField) {
      warn("Az ajánlatkérő folyamata nem indítható: hiányzik a termékmező vagy az ajánlatkérő gomb.");
      return;
    }

    const modalWasOpen = !modal.hidden;
    const focusReturn = modalWasOpen && previousFocus?.isConnected
      ? previousFocus
      : trigger ?? [...productsSection.querySelectorAll("[data-product-id]")]
      .find((card) => card.dataset.productId === product.id)
      ?.querySelector("[data-product-quote]") ?? requestButton;
    if (modalWasOpen) closeModal({ restoreFocus: false });

    requestButton.dispatchEvent(new CustomEvent("custom-order:open", {
      detail: { trigger: focusReturn },
    }));
    productNameField.value = product.name;
    productIdField.value = product.id;
  };

  const openModal = (product, trigger) => {
    previousFocus = trigger;
    quantity = 1;
    appRef.state.activeProductId = product.id;

    const oldPriceMarkup = typeof product.oldPrice === "number" && product.oldPrice > product.price
      ? `<span class="modal__old-price">${formatPrice(product.oldPrice)}</span>`
      : "";
    const priceMarkup = product.purchaseMode === "quote"
      ? `<p class="modal__price"><span class="modal__price-label">Tájékoztató ár:</span><strong data-modal-unit-price>${formatPrice(getProductUnitPrice(product, { size: selectedOrganizerSize.value }))}</strong></p>`
      : product.demoPricing
        ? `<p class="modal__price"><span>Demonstrációs egységár</span><strong data-modal-unit-price>${formatPrice(getProductUnitPrice(product, { size: selectedOrganizerSize.value }))}</strong></p>`
        : `<p class="modal__price">${oldPriceMarkup}<span data-modal-unit-price>${formatPrice(product.price)}</span></p>`;
    const priceNoteMarkup = product.purchaseMode === "quote"
      ? '<p class="modal__price-note">A végleges ár a részletek egyeztetése után alakul ki.</p>'
      : product.purchaseMode === "cart-and-quote"
        ? '<p class="modal__price-note">Egyedi méretre külön ajánlat kérhető.</p>'
        : "";
    const subtotalMarkup = hasCartPurchaseOption(product)
      ? `<p class="modal__subtotal" hidden><span>Részösszeg</span><strong data-modal-subtotal>${formatPrice(getProductUnitPrice(product, { size: selectedOrganizerSize.value }) * quantity)}</strong></p>`
      : "";
    const modalPurchaseActionsMarkup = `
      ${hasCartPurchaseOption(product) ? `
        <button class="btn btn--primary btn--block" type="button" data-modal-add-to-cart>
          Kosárba
        </button>
      ` : ""}
      ${hasQuotePurchaseOption(product) ? `
        <button class="btn btn--ghost btn--block" type="button" data-modal-quote>
          ${getQuoteButtonLabel(product)}
        </button>
      ` : ""}
    `;
    const badgeMarkup = product.badge
      ? `<span class="product-card__badge${product.badgeVariant ? ` product-card__badge--${product.badgeVariant}` : ""}">${product.badge}</span>`
      : "";
    const mediaMarkup = product.modelType === "demo-organizer"
      ? `
        <img class="modal__image modal__image--viewer-fallback" src="${product.image}" alt="${product.name}" />
        <div class="modal__viewer" data-product-viewer data-model-type="${product.modelType}"
          aria-label="${product.name} demonstrációs 3D előnézete">
          <p class="modal__viewer-fallback" role="status">A demonstrációs 3D előnézet betöltése.</p>
        </div>
        <p class="modal__viewer-caption">Demonstrációs geometria — nem gyártási modell.</p>
      `
      : `<img class="modal__image" src="${product.image}" alt="${product.name}" />`;

    modal.innerHTML = `
      <div class="modal__overlay" data-modal-close aria-hidden="true"></div>
      <section class="modal__panel" aria-labelledby="modal-title">
        <header class="modal__header">
          <p class="modal__category">${getCategoryDisplayName(product.category)}</p>
          <button class="modal__close" type="button" data-modal-close aria-label="Termék részleteinek bezárása">
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div class="modal__body">
          <div class="modal__media${product.modelType === "demo-organizer" ? " modal__media--demo" : ""}">
            ${mediaMarkup}
            ${badgeMarkup}
          </div>
          <div class="modal__content">
            <h2 id="modal-title" class="modal__title">${product.name}</h2>
            <p class="modal__description">${product.description}</p>
            ${priceMarkup}
            ${priceNoteMarkup}
            ${subtotalMarkup}
            ${product.modelType === "demo-organizer" ? renderOrganizerColors() : ""}
            ${product.modelType === "demo-organizer" ? renderOrganizerSizes() : ""}
            <div class="modal__quantity" role="group" aria-label="${product.name} mennyisége">
              <button class="btn btn--ghost btn--sm" type="button" data-modal-quantity="decrease"
                aria-label="Mennyiség csökkentése">−</button>
              <output data-modal-quantity-value aria-live="polite">1</output>
              <button class="btn btn--ghost btn--sm" type="button" data-modal-quantity="increase"
                ${quantity >= MAX_CART_QUANTITY ? "disabled" : ""}
                aria-label="Mennyiség növelése">+</button>
            </div>
          </div>
        </div>
        <footer class="modal__footer">
          <div class="modal__actions">
            ${modalPurchaseActionsMarkup}
          </div>
        </footer>
      </section>
    `;

    modal.setAttribute("aria-labelledby", "modal-title");
    acquirePageScrollLock(PRODUCT_MODAL_SCROLL_LOCK);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    trigger.focus();
    modal.querySelector("[data-modal-close]:not(.modal__overlay)").focus();
    updateModalPrices(product);
    if (product.modelType === "demo-organizer") {
      setProductViewerColor(selectedOrganizerColor.hex);
      setProductViewerSize(selectedOrganizerSize.scale);
      activateProductViewer(modal.querySelector("[data-product-viewer]"));
    }
  };

  productsSection.addEventListener("click", (event) => {
    const quickViewButton = event.target.closest("[data-product-quick-view]");
    if (quickViewButton) {
      const productCard = quickViewButton.closest("[data-product-id]");
      const product = appRef.state.products.find((item) => item.id === productCard?.dataset.productId);
      if (product) openModal(product, quickViewButton);
      return;
    }

    const quoteButton = event.target.closest("[data-product-quote]");
    if (quoteButton) {
      event.stopPropagation();
      const productCard = quoteButton.closest("[data-product-id]");
      const product = appRef.state.products.find((item) => item.id === productCard?.dataset.productId);
      startQuoteRequest(product, quoteButton);
      return;
    }

    if (event.target.closest("[data-add-to-cart]")) return;
  });

  modal.addEventListener("click", (event) => {
    if (event.target.matches(".modal__overlay") || event.target.closest("button[data-modal-close]")) {
      closeModal();
      return;
    }

    const quoteButton = event.target.closest("[data-modal-quote]");
    if (quoteButton) {
      const product = appRef.state.products.find((item) => item.id === appRef.state.activeProductId);
      startQuoteRequest(product, quoteButton);
      return;
    }

    const quantityButton = event.target.closest("[data-modal-quantity]");
    if (quantityButton) {
      quantity = quantityButton.dataset.modalQuantity === "increase"
        ? Math.min(MAX_CART_QUANTITY, quantity + 1)
        : Math.max(1, quantity - 1);
      modal.querySelector("[data-modal-quantity-value]").textContent = String(quantity);
      modal.querySelector('[data-modal-quantity="increase"]').disabled = quantity >= MAX_CART_QUANTITY;
      const product = appRef.state.products.find((item) => item.id === appRef.state.activeProductId);
      if (product) updateModalPrices(product);
      return;
    }

    if (event.target.closest("[data-modal-add-to-cart]")) {
      const product = appRef.state.products.find((item) => item.id === appRef.state.activeProductId);
      if (!product || !hasCartPurchaseOption(product)) return;
      addProductToCart(appRef, product, quantity, {
        size: selectedOrganizerSize.value,
        color: selectedOrganizerColor.value,
      });
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;

    if (event.key === "Escape") {
      if (customOrderPanel && !customOrderPanel.hidden) return;
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") return;
    if (customOrderPanel && !customOrderPanel.hidden) return;

    const focusableElements = [...modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (!firstElement) {
      event.preventDefault();
      modal.focus();
    } else if (event.shiftKey && (document.activeElement === firstElement || !modal.contains(document.activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (document.activeElement === lastElement || !modal.contains(document.activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  appRef.modules.add("productModal");
  log("termékmodal modul elindítva.");
}

/**
 * 5. modul — SZŰRŐK (kategória, ár, keresés összehangolása).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initFilters(appRef) {
  const container = appRef.dom.productsSection;
  if (!container) return;

  container.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-category-filter]");
    if (filterButton) {
      setActiveCategory(appRef, filterButton.dataset.categoryFilter);
    }
  });

  const categoriesSection = appRef.dom.categoriesSection;
  if (categoriesSection) {
    const activateCategoryCard = (card) => {
      const category = card.dataset.category;
      const requestTypes = ["Saját 3D modell", "Egyedi ötlet / fénykép"];

      if (requestTypes.includes(category)) {
        const requestButton = [...document.querySelectorAll("#custom-order [data-custom-order-type]")]
          .find((button) => button.dataset.customOrderType === category);
        if (!requestButton) {
          warn("Az ajánlatkérő űrlap nem nyitható meg: hiányzik a megfelelő kérésfajta-gomb.", { category });
          return;
        }

        requestButton.dispatchEvent(new CustomEvent("custom-order:open", {
          detail: { trigger: card, requestType: category },
        }));
        return;
      }

      setActiveCategory(appRef, category);
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    categoriesSection.addEventListener("click", (event) => {
      const card = event.target.closest(".categories__card[data-category]");
      if (card) activateCategoryCard(card);
    });

    categoriesSection.addEventListener("keydown", (event) => {
      const card = event.target.closest(".categories__card[data-category]");
      if (!card || (event.key !== "Enter" && event.key !== " ")) return;

      event.preventDefault();
      activateCategoryCard(card);
    });
  }

  appRef.modules.add("filters");
  log("kategóriaszűrő modul elindítva.");
}

/**
 * 6. modul — KATEGÓRIÁK (kategóriaválasztó blokk).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initCategories(appRef) {
  const section = appRef.dom.categoriesSection;
  if (!section) return;

  /* TODO (3. fázis): a kategória-chipek kirajzolása a `state.categories`
     alapján, kattintásra az aktív kategória beállítása. */

  appRef.modules.add("categories");
  log("kategória modul előkészítve.");
}

/**
 * 7. modul — TERMÉKEK (terméklista és termékkártyák).
 * @param {object} appRef a központi alkalmazás-objektum
 */
function formatPrice(value) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasCartPurchaseOption(product) {
  return product.purchaseMode !== "quote";
}

function hasQuotePurchaseOption(product) {
  return product.purchaseMode === "quote" || product.purchaseMode === "cart-and-quote";
}

function getQuoteButtonLabel(product) {
  return product.purchaseMode === "cart-and-quote"
    ? "Egyedi méretre ajánlat"
    : "Ajánlatot kérek";
}

function renderProductCard(product, imageLoading) {
  const productDetailPath = productDetailPaths[product.id];
  if (!productDetailPath) {
    throw new Error(`Nincs megadva termékoldal-útvonal ehhez a termékhez: ${product.id}`);
  }

  const displayedPrice = getProductUnitPrice(product, { size: product.demoPricing?.defaultSize });
  const oldPriceMarkup =
    typeof product.oldPrice === "number" && product.oldPrice > product.price
      ? `<span class="product-card__old-price">${formatPrice(product.oldPrice)}</span>`
      : "";
  const priceLabelMarkup = product.purchaseMode === "quote"
    ? '<span class="product-card__price-label">Tájékoztató ár:</span>'
    : product.demoPricing
      ? '<span class="product-card__price-label">Demonstrációs ár</span>'
      : "";
  const priceNoteMarkup = product.purchaseMode === "quote"
    ? '<span class="product-card__price-note">A végleges ár a részletek egyeztetése után alakul ki.</span>'
    : product.purchaseMode === "cart-and-quote"
      ? '<span class="product-card__price-note">Egyedi méretre külön ajánlat kérhető.</span>'
      : "";

  const badgeMarkup = product.badge
    ? `<span class="product-card__badge ${product.badgeVariant ? `product-card__badge--${product.badgeVariant}` : ""}">${product.badge}</span>`
    : "";
  const purchaseActionsMarkup = `
    <button class="btn btn--ghost btn--sm" type="button" data-product-quick-view
      aria-label="Gyorsnézet: ${product.name}">Gyorsnézet</button>
    ${hasCartPurchaseOption(product) ? `
      <button class="btn btn--primary btn--sm" type="button" data-add-to-cart
        aria-label="Kosárba: ${product.name}">Kosárba</button>
    ` : ""}
    ${hasQuotePurchaseOption(product) ? `
      <button class="btn btn--ghost btn--sm" type="button" data-product-quote
        aria-label="${getQuoteButtonLabel(product)}: ${product.name}">${getQuoteButtonLabel(product)}</button>
    ` : ""}
  `;
  return `
    <article class="product-card" data-product-id="${product.id}">
      <a class="product-card__media" href="${productDetailPath}" aria-label="${product.name} termékoldalának megnyitása">
        <img class="product-card__image" src="${product.image}" alt="${product.name}" loading="${imageLoading}" />
        ${badgeMarkup}
      </a>

      <div class="product-card__content">
        <p class="product-card__category">${getCategoryDisplayName(product.category)}</p>
        <h3 class="product-card__title">
          <a href="${productDetailPath}">${product.name}</a>
        </h3>
        <p class="product-card__description">${product.description}</p>
      </div>

      <div class="product-card__footer">
        <p class="product-card__price">
          ${oldPriceMarkup}
          ${priceLabelMarkup}
          ${formatPrice(displayedPrice)}
          ${priceNoteMarkup}
        </p>
        <div class="product-card__actions">
          ${purchaseActionsMarkup}
        </div>
      </div>
    </article>
  `;
}

function renderFilteredProducts(appRef) {
  const { category, search } = appRef.state.filters;
  const normalizedSearch = search.trim().toLocaleLowerCase("hu-HU");
  const filteredProducts = appRef.state.products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const searchableText = [product.name, product.category, product.description]
      .join(" ")
      .toLocaleLowerCase("hu-HU");

    return matchesCategory && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });
  const grid = appRef.dom.productsSection.querySelector(".products__grid");

  if (!grid) return;

  grid.innerHTML = filteredProducts.length
    ? filteredProducts.map((product, index) => renderProductCard(product, index === 0 ? "eager" : "lazy")).join("")
    : '<p class="filters__no-results" role="status">Nincs a keresésnek megfelelő termék.</p>';

  appRef.dom.productsSection.querySelectorAll("[data-category-filter]").forEach((button) => {
    const isActive = button.dataset.categoryFilter === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  appRef.dom.categoriesSection?.querySelectorAll(".categories__card[data-category]").forEach((card) => {
    card.setAttribute("aria-pressed", String(card.dataset.category === category));
  });
}

function setActiveCategory(appRef, category) {
  const isValidCategory = categoryFilterOptions.some((option) => option.value === category);
  if (!isValidCategory) return;

  appRef.state.filters.category = category;
  renderFilteredProducts(appRef);
}

function initProducts(appRef) {
  const section = appRef.dom.productsSection;
  if (!section) return;

  const filters = document.createElement("div");
  filters.className = "filters";
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", "Termékszűrők");

  const heading = document.createElement("h2");
  heading.id = "products-title";
  heading.className = "visually-hidden";
  heading.textContent = "3D-nyomtatott termékeink";

  const filterButtons = categoryFilterOptions.map(({ value, label }) => {
    const isActive = value === appRef.state.filters.category;
    return `<button class="filters__chip${isActive ? " is-active" : ""}" type="button" data-category-filter="${value}" aria-pressed="${isActive}">${label}</button>`;
  }).join("");
  filters.innerHTML = `
    <div class="filters__search">
      <label class="visually-hidden" for="filters-search">Termék keresése</label>
      <input id="filters-search" class="filters__search-input" type="search" data-product-search
        placeholder="Mit keresel?" autocomplete="off" />
    </div>
    <div class="filters__chips" role="group" aria-label="Kategória">${filterButtons}</div>
  `;

  const grid = document.createElement("div");
  grid.className = "products__grid";
  section.replaceChildren(heading, filters, grid);

  appRef.state.products = products;
  renderFilteredProducts(appRef);
  appRef.modules.add("products");
  log("termék modul előkészítve.", { termékekSzáma: products.length });
}

/**
 * 8. modul — HERO / THREE.JS (a kezdőlap 3D jelenete).
 *
 * FONTOS: a Three.js tényleges betöltését MOST SZÁNDÉKOSAN NEM végezzük el.
 * Ez a függvény csak azt ellenőrzi, hogy a <canvas> egyáltalán a helyén
 * van-e, és jelzi a konzolban, hogy a 3D réteg a későbbi fázisé.
 *
 * @param {object} appRef a központi alkalmazás-objektum
 */
function initHero(appRef) {
  const canvas = appRef.dom.heroCanvas;
  if (!canvas) return;

  /* TODO (5. fázis): jelenet, kamera, renderer, fények, animációs loop.
     A Three.js-t dinamikus importtal töltjük majd be:
       const THREE = await import("three"); */

  appRef.modules.add("hero");
  log("hero/3D modul előkészítve (a jelenet az 5. fázisban épül fel).");
}


/* ==========================================================================
   4. AZ ALKALMAZÁS INDÍTÁSA
   ========================================================================== */

/**
 * Az alkalmazás fő inicializáló függvénye.
 *
 * Sorrend szempont: először a DOM-hivatkozásokat gyűjtjük össze, majd a
 * modulokat indítjuk "fentről lefelé", ahogy az oldalon is megjelennek.
 * Bármelyik modul kimaradhat (ha nincs hozzá HTML) — a többi attól még fut.
 */
function initApp() {
  const startedAt = performance.now();

  log(`LUMEN webshop — ${app.phase}. fázis: alkalmazás-alap betöltése...`);

  /* 4.1 — A DOM-elemek összegyűjtése (ez minden más előfeltétele) */
  getDomRefs();
  app.flags.domReady = true;
  loadCart(app);

  /* 4.2 — Modulok indítása. A sorrend az oldal felépítését követi.
     Ha egy modulhoz nincs HTML, az maga kilép — ez nem hiba. */
  initHeader(app);
  initCart(app);
  initProductModal(app);
  initProducts(app);
  initSearch(app);
  initFilters(app);
  initCategories(app);
  initHero(app);
  initCustomOrder();
  initProductQuoteFromUrl();

  /* 4.3 — Kész. */
  app.flags.appReady = true;
  const elapsed = (performance.now() - startedAt).toFixed(2);
  log(`Alkalmazás készen áll (${elapsed} ms). Aktív modulok:`, [
    ...app.modules,
  ]);

  /* Az `app` szándékosan elérhetővé tett a konzolból (hibakereséshez).
     Fejlesztés közben nagyon hasznos: a böngésző konzoljában
     `app.state` / `app.modules` azonnal látszik. */
  window.app = app;
}

function initProductQuoteFromUrl() {
  const section = document.querySelector("#custom-order");
  if (!section) return;

  const url = new URL(window.location.href);
  const productId = url.searchParams.get("quoteProduct");
  if (!productId) return;

  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const form = section.querySelector("[data-custom-order-form]");
  const nameField = form?.elements.namedItem("name");
  const productNameField = form?.elements.namedItem("product-name");
  const productIdField = form?.elements.namedItem("productId");
  const requestButton = section.querySelector(
    '[data-custom-order-type="Egyedi termék"]',
  );
  if (!nameField || !productNameField || !productIdField || !requestButton) {
    warn("Az ajánlatkérés nem indítható: hiányzik a termékmező vagy az ajánlatkérő gomb.", {
      productId,
    });
    return;
  }

  window.addEventListener("load", () => {
    if (
      document.activeElement === document.body
      || document.activeElement === document.documentElement
      || document.activeElement === section
    ) {
      nameField.focus({ preventScroll: true });
    }
  }, { once: true });

  requestButton.dispatchEvent(new CustomEvent("custom-order:open", {
    detail: { trigger: requestButton, requestType: "Egyedi termék" },
  }));
  productNameField.value = product.name;
  productIdField.value = product.id;

  url.searchParams.delete("quoteProduct");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}


/* ==========================================================================
   5. INDÍTÁS
   --------------------------------------------------------------------------
   A "DOMContentLoaded" eseményre várunk, hogy biztos minden HTML elem a
   helyén legyen, mire a JS hozzájuk nyúl (a modulos szkript ugyan már eleve
   a HTML után fut, de ez a biztos és bevett minta).
   ========================================================================== */

document.addEventListener("DOMContentLoaded", initApp);