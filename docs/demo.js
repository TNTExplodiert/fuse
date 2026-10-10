/* FUSE – Live-Vorschau auf der Webseite.
   Eigener, schlanker Code nur für die Vorschau (kein Code aus FUSE).
   Macht keine Netzwerkanfragen, setzt keine Cookies, speichert nichts.
   Ohne dieses Skript bleibt der Bereich „Spielen“ sichtbar. */
(function () {
  "use strict";

  const demo = document.getElementById("demo");
  if (!demo) return;
  demo.classList.add("demo-an");

  const DOWNLOAD = "https://github.com/TNTExplodiert/fuse/releases/latest/download/FUSE.zip";
  const $ = (wahl, wurzel) => (wurzel || demo).querySelector(wahl);
  const $$ = (wahl, wurzel) => Array.from((wurzel || demo).querySelectorAll(wahl));

  /* ---------- Reiter (ARIA-Tabs, Pfeiltasten, Pos1/Ende) ---------- */

  function reiterEinrichten(liste, beiWechsel) {
    const tabs = $$('[role="tab"]', liste);
    const senkrecht = liste.getAttribute("aria-orientation") === "vertical";

    function waehlen(tab, fokus) {
      for (const t of tabs) {
        const an = t === tab;
        t.setAttribute("aria-selected", an ? "true" : "false");
        t.tabIndex = an ? 0 : -1;
        // aria-controls kann mehrere IDs haben (Spielen: Bereich und
        // Editions-Menü) – der Bereich steht immer vorn.
        const feld = document.getElementById((t.getAttribute("aria-controls") || "").trim().split(/\s+/)[0]);
        if (feld) feld.hidden = !an;
      }
      if (fokus) tab.focus();
      if (beiWechsel) beiWechsel(tab);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => waehlen(tab, false));
      tab.addEventListener("keydown", (e) => {
        const vor = senkrecht ? ["ArrowDown", "ArrowRight"] : ["ArrowRight"];
        const zurueck = senkrecht ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft"];
        let ziel = null;
        if (vor.includes(e.key)) ziel = tabs[(i + 1) % tabs.length];
        else if (zurueck.includes(e.key)) ziel = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") ziel = tabs[0];
        else if (e.key === "End") ziel = tabs[tabs.length - 1];
        if (ziel) {
          e.preventDefault();
          waehlen(ziel, true);
        }
      });
    });
  }

  /* ---------- Meldung (wie ein Toast in FUSE) ---------- */

  const meldungOrt = $("#demo-meldung");
  let ausloeser = null;

  function meldungZu() {
    const hatteFokus = meldungOrt.contains(document.activeElement);
    meldungOrt.replaceChildren();
    if (hatteFokus && ausloeser && ausloeser.isConnected && !ausloeser.closest("[hidden]")) {
      ausloeser.focus();
    }
  }

  function melden(text, mitDownload, von) {
    ausloeser = von || null;
    const karte = document.createElement("div");
    karte.className = "demo-meldung";
    const p = document.createElement("p");
    p.textContent = text;
    karte.append(p);
    if (mitDownload) {
      const a = document.createElement("a");
      a.className = "demo-meldung-link";
      a.href = DOWNLOAD;
      a.textContent = "FUSE herunterladen";
      karte.append(a);
    }
    const zu = document.createElement("button");
    zu.type = "button";
    zu.className = "demo-meldung-zu";
    zu.setAttribute("aria-label", "Meldung schließen");
    zu.textContent = "✕";
    zu.addEventListener("click", meldungZu);
    karte.append(zu);
    meldungOrt.replaceChildren(karte);
  }

  // Esc schließt die Meldung, solange der Fokus in der Vorschau ist.
  demo.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && meldungOrt.firstChild) {
      e.preventDefault();
      meldungZu();
    }
  });

  // Knöpfe mit data-info erklären nur, was sie in FUSE tun würden.
  demo.addEventListener("click", (e) => {
    const knopf = e.target.closest("[data-info]");
    if (knopf && demo.contains(knopf) && !knopf.disabled) {
      melden(knopf.dataset.info, false, knopf);
    }
  });

  /* ---------- Hauptleiste ---------- */

  // Bereichswechsel: Meldung und Editions-Menü (unten) gehen zu.
  reiterEinrichten($(".demo-reiter"), () => {
    meldungZu();
    menueZu();
  });

  /* ---------- Spielen ---------- */

  const instanz = $("#demo-instanz");
  const version = $("#demo-version");
  const loader = $("#demo-loader");
  const startHaupt = $("#demo-start-haupt");
  const startUnter = $("#demo-start-unter");
  const passt = $("#demo-passt");

  // Versionen vergleichen: "1.21.8" -> [1, 21, 8]
  const teile = (v) => v.split(".").map((z) => parseInt(z, 10) || 0);
  function mindestens(v, grenze) {
    const a = teile(v);
    const b = teile(grenze);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
    }
    return true;
  }

  // Nur Fälle, die sicher nicht gehen: Fabric/Quilt gibt es erst ab 1.14,
  // NeoForge bietet FUSE ab 1.20.2 an.
  function passtHinweis(v, l) {
    if ((l === "Fabric" || l === "Quilt") && !mindestens(v, "1.14")) {
      return l + " gibt es für " + v + " nicht – nimm eine neuere Version oder Forge.";
    }
    if (l === "NeoForge" && !mindestens(v, "1.20.2")) {
      return "NeoForge gibt es in FUSE ab 1.20.2 – für " + v + " nimm Forge.";
    }
    return "";
  }

  function startAuffrischen() {
    if (demo.dataset.edition === "bedrock") {
      startHaupt.textContent = "BEDROCK STARTEN";
      startUnter.textContent = "Minecraft für Windows";
    } else {
      startHaupt.textContent = "SPIELEN";
      startUnter.textContent = version.value + " · " + loader.value;
    }
    const text = passtHinweis(version.value, loader.value);
    passt.textContent = text;
    passt.hidden = !text;
  }

  version.addEventListener("change", startAuffrischen);
  loader.addEventListener("change", () => {
    startAuffrischen();
    modsZeigen();
  });

  instanz.addEventListener("change", () => {
    for (const n of $$(".demo-instanzname")) n.textContent = instanz.value;
  });

  /* ---------- Editions-Menü an „Spielen“ ----------
     Wie in FUSE: Der erste Klick auf Spielen öffnet den Bereich (das
     machen die Reiter), jeder weitere Klick – oder der Pfeil › daneben –
     klappt rechts das Menü mit Java und Bedrock auf bzw. zu. Zu geht es
     auch mit Esc, Klick daneben und Tab hinaus. Im Menü: W/S oder ↑/↓
     wählen, Enter nimmt, A/← schließt. */

  const reiter = $(".demo-reiter");
  const spielenTab = $("#demo-tab-spielen");
  const edMenue = $("#demo-edmenue");
  const edWahlen = $$('[role="menuitemradio"]', edMenue);
  const edVorlesen = $("#demo-tab-edition");
  let schluckenBis = 0;

  // Erst mit Skript gibt es das Menü – deshalb setzt es auch erst das Skript an.
  spielenTab.setAttribute("aria-haspopup", "menu");
  spielenTab.setAttribute("aria-expanded", "false");
  spielenTab.setAttribute("aria-controls", "demo-spielen demo-edmenue");

  const menueOffen = () => !edMenue.hidden;

  function editionSetzen(edition) {
    demo.dataset.edition = edition;
    for (const w of edWahlen) {
      w.setAttribute("aria-checked", w.dataset.edition === edition ? "true" : "false");
    }
    edVorlesen.textContent = edition === "bedrock" ? " · Bedrock" : " · Java";
    startAuffrischen();
  }

  function menueAuf() {
    if (menueOffen()) return;
    meldungZu();
    edMenue.hidden = false;
    spielenTab.setAttribute("aria-expanded", "true");
    // Der Fokus geht auf die gewählte Edition.
    const gewaehlt = edWahlen.find((w) => w.getAttribute("aria-checked") === "true");
    (gewaehlt || edWahlen[0]).focus({ preventScroll: true });
  }

  // fokus: "zurueck" = auf Spielen (Auswahl, Esc, zweiter Klick);
  // "lassen" = nicht anfassen (Tab hinaus). Sonst nur zurück, wenn er
  // noch im Menü steht – er landete sonst im Nichts.
  function menueZu(fokus) {
    if (!menueOffen()) return;
    const drin = edMenue.contains(document.activeElement);
    edMenue.hidden = true;
    spielenTab.setAttribute("aria-expanded", "false");
    if (fokus === "zurueck" || (drin && fokus !== "lassen")) {
      spielenTab.focus({ preventScroll: true });
    }
  }

  // Capture-Phase: läuft VOR dem Klick des Reiters, sieht also noch, ob
  // Spielen schon offen war. Ein schneller Doppelklick zählt als ein Klick.
  reiter.addEventListener("click", (e) => {
    if (!e.target.closest("#demo-tab-spielen")) return;
    if (e.detail >= 2) {
      e.stopPropagation();
    } else if (menueOffen()) {
      e.stopPropagation();
      menueZu("zurueck");
    } else if (spielenTab.getAttribute("aria-selected") === "true") {
      e.stopPropagation();
      menueAuf();
    }
  }, true);

  // Bei offenem Menü darf der Mausdruck auf Spielen den Fokus nicht aus dem
  // Menü ziehen – sonst schlösse „Tab hinaus“ es, und der Klick öffnete es neu.
  spielenTab.addEventListener("mousedown", (e) => {
    if (menueOffen()) e.preventDefault();
  });

  for (const wahl of edWahlen) {
    wahl.addEventListener("click", (e) => {
      if (!menueOffen()) return;
      // Mausklick: den Rest eines Doppelklicks gleich schlucken, sonst
      // träfe er, was unter dem schon geschlossenen Menü liegt.
      if (e.detail >= 1) schluckenBis = performance.now() + 400;
      editionSetzen(wahl.dataset.edition);
      menueZu("zurueck");
    });
  }

  for (const art of ["mousedown", "mouseup", "click", "dblclick"]) {
    demo.addEventListener(art, (e) => {
      if (e.detail < 2 || performance.now() > schluckenBis) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  // Klick daneben (überall auf der Seite): zu. Spielen selbst nicht – das
  // schaltet oben um.
  document.addEventListener("pointerdown", (e) => {
    if (!menueOffen()) return;
    const ziel = e.target;
    if (ziel instanceof Node && (edMenue.contains(ziel) || spielenTab.contains(ziel))) return;
    menueZu();
  }, true);

  // Mit Tab oder Umschalt+Tab hinaus: zu, der Fokus bleibt, wo er hinwollte.
  edMenue.addEventListener("focusout", (e) => {
    const neu = e.relatedTarget;
    if (neu && !edMenue.contains(neu)) menueZu("lassen");
  });

  // Esc auch dann, wenn der Fokus nicht im Menü steht (z. B. nach einem
  // Klick auf den Rand zwischen den Einträgen – dann liegt er auf <body>).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.isComposing || !menueOffen()) return;
    menueZu("zurueck");
  });

  edMenue.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const taste = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const i = edWahlen.indexOf(document.activeElement);
    const n = edWahlen.length;
    let ziel = null;
    if (taste === "ArrowDown" || taste === "s") ziel = edWahlen[(i + 1) % n];
    else if (taste === "ArrowUp" || taste === "w") ziel = edWahlen[(i - 1 + n) % n];
    else if (taste === "Home") ziel = edWahlen[0];
    else if (taste === "End") ziel = edWahlen[n - 1];
    else if (taste === "Escape" || taste === "ArrowLeft" || taste === "a") {
      // stopPropagation: Esc schließt nur das Menü, nicht auch die Meldung.
      e.preventDefault();
      e.stopPropagation();
      menueZu("zurueck");
      return;
    }
    if (ziel) {
      e.preventDefault();
      ziel.focus();
    }
  });

  $("#demo-start").addEventListener("click", (e) => {
    melden("In der Demo startet nichts – lad FUSE runter, dann geht’s richtig los.", true, e.currentTarget);
  });

  /* ---------- Mods, Texturen, Shader ---------- */

  const modListe = $("#demo-mod-liste");
  const modKarten = $$(".demo-mod", modListe);
  const modSuche = $("#demo-mod-suche");
  const modLeer = $(".demo-leer", modListe);
  const modVanilla = $(".demo-vanilla", modListe);
  const blendbar = $$(".demo-blendbar", $("#demo-mods"));
  const PLATZHALTER = {
    mod: "Mods suchen",
    textur: "Texturen suchen",
    shader: "Shader suchen (brauchen Iris/OptiFine)"
  };
  const mods = { art: "mod", ansicht: "suchen" };

  function gruppeSetzen(gruppe, attr, wert) {
    for (const k of $$("[" + attr + "]", gruppe)) {
      k.setAttribute("aria-pressed", k.getAttribute(attr) === wert ? "true" : "false");
    }
  }

  function modsZeigen() {
    const q = modSuche.value.trim().toLowerCase();
    const installiert = mods.ansicht === "installiert";
    // Wie in FUSE: Vanilla lädt keine Mods (Texturen/Shader gehen trotzdem).
    const vanilla = mods.art === "mod" && !installiert && loader.value === "Vanilla";
    let zahl = 0;
    for (const karte of modKarten) {
      const zeigen = !vanilla
        && karte.dataset.art === mods.art
        && (!installiert || karte.dataset.installiert === "ja")
        && (!q || karte.dataset.name.includes(q));
      karte.hidden = !zeigen;
      if (zeigen) zahl++;
    }
    modListe.classList.toggle("ist-installiert", installiert);
    modVanilla.hidden = !vanilla;
    modLeer.hidden = vanilla || zahl > 0;
    modLeer.textContent = q
      ? "Keine Treffer in den Beispieldaten."
      : "Hier ist noch nichts installiert.";
    // Fokus nicht im Nichts lassen, wenn die Karte verschwunden ist.
    const aktiv = document.activeElement;
    if (aktiv && modListe.contains(aktiv) && aktiv.closest("[hidden]")) {
      modListe.focus();
    }
  }

  for (const knopf of $$(".demo-seg[data-art]", $("#demo-mods"))) {
    knopf.addEventListener("click", () => {
      mods.art = knopf.dataset.art;
      gruppeSetzen(knopf.parentElement, "data-art", mods.art);
      modSuche.placeholder = PLATZHALTER[mods.art];
      // Im Download gibt es „Installiert“ und Updates nur bei Mods.
      const nurMods = mods.art === "mod";
      for (const el of blendbar) {
        el.classList.toggle("weg", !nurMods);
        el.inert = !nurMods;
      }
      if (!nurMods && mods.ansicht !== "suchen") {
        mods.ansicht = "suchen";
        gruppeSetzen($("[data-ansicht]", $("#demo-mods")).parentElement, "data-ansicht", "suchen");
      }
      modsZeigen();
    });
  }

  for (const knopf of $$("[data-ansicht]", $("#demo-mods"))) {
    knopf.addEventListener("click", () => {
      mods.ansicht = knopf.dataset.ansicht;
      gruppeSetzen(knopf.parentElement, "data-ansicht", mods.ansicht);
      modsZeigen();
    });
  }

  modSuche.addEventListener("input", modsZeigen);

  modListe.addEventListener("click", (e) => {
    const install = e.target.closest(".demo-install");
    const aus = e.target.closest(".demo-aus");
    const karte = e.target.closest(".demo-mod");
    if (!karte) return;
    if (install) {
      const neu = karte.dataset.installiert !== "ja";
      karte.dataset.installiert = neu ? "ja" : "nein";
      install.setAttribute("aria-pressed", neu ? "true" : "false");
      if (!neu) {
        karte.classList.remove("aus");
        const a = $(".demo-aus", karte);
        if (a) a.textContent = "Ausschalten";
      }
      modsZeigen();
    } else if (aus) {
      const istAus = karte.classList.toggle("aus");
      aus.textContent = istAus ? "Anschalten" : "Ausschalten";
    }
  });

  /* ---------- Skins ---------- */

  const figur = $("#demo-figur");

  for (const knopf of $$("[data-farbe]")) {
    knopf.addEventListener("click", () => {
      figur.classList.remove("farbe-rot", "farbe-blau", "farbe-gruen");
      figur.classList.add("farbe-" + knopf.dataset.farbe);
      gruppeSetzen(knopf.parentElement, "data-farbe", knopf.dataset.farbe);
    });
  }

  for (const knopf of $$("[data-anprobe]")) {
    knopf.addEventListener("click", () => {
      const an = figur.classList.toggle(knopf.dataset.anprobe);
      knopf.setAttribute("aria-pressed", an ? "true" : "false");
    });
  }

  for (const knopf of $$("[data-form]")) {
    knopf.addEventListener("click", () => {
      figur.classList.toggle("schmal", knopf.dataset.form === "schmal");
      gruppeSetzen(knopf.parentElement, "data-form", knopf.dataset.form);
    });
  }

  /* ---------- Logs ---------- */

  const log = $("#demo-log");
  const logZeilen = $$("p[data-stufe]", log);
  const logLeer = $(".demo-log-leer", log);
  const logFilter = $("#demo-log-filter");
  let logGeleert = false;

  function logZeigen() {
    const f = logFilter.value;
    let zahl = 0;
    for (const z of logZeilen) {
      const s = z.dataset.stufe;
      const zeigen = !logGeleert && (f === "alle"
        || (f === "probleme" && (s === "fehler" || s === "warnung"))
        || s === f);
      z.hidden = !zeigen;
      if (zeigen) zahl++;
    }
    logLeer.hidden = zahl > 0;
  }

  logFilter.addEventListener("change", logZeigen);
  $("#demo-log-leeren").addEventListener("click", () => {
    logGeleert = true;
    logZeigen();
  });
  $("#demo-log-neu").addEventListener("click", () => {
    logGeleert = false;
    logZeigen();
  });

  /* ---------- Einstellungen ---------- */

  reiterEinrichten($(".demo-einst-reiter"));

  const ram = $("#demo-ram");
  const ramText = $("#demo-ram-text");
  const gb = (mb) => (mb / 1024).toFixed(1).replace(".", ",") + " GB";
  ram.addEventListener("input", () => {
    ramText.textContent = gb(Number(ram.value)) + " für Minecraft · 16,0 GB hat der Rechner";
  });

  const stufe = $("#demo-stufe");
  const stufeLos = $("#demo-stufe-los");
  stufe.addEventListener("change", () => {
    stufeLos.disabled = !stufe.value;
  });

  /* ---------- Start ---------- */

  startAuffrischen();
  modsZeigen();
  logZeigen();
})();
