# Pagine da file YAML

Il pannello separa **contenuto** e **presentazione**, come fa Hugo:

| Hugo | LEICS | Cosa fa |
|---|---|---|
| `config.toml` | `site.yaml` | impostazioni, menu, quali pagine / layout / componenti caricare |
| `content/*.md` | `pages/<chiave>.yaml` | una pagina del menu "Altro": titolo, icona, blocchi |
| front matter + `layout:` | `type:` di ogni blocco | quale componente disegna quel pezzo |
| `layouts/`, `partials/`, shortcode | componenti JS (`src/components/`, `components/*.js`) | come si disegna un blocco |
| — | `rooms/<chiave>.yaml` | le schede della home o di una stanza |

Hugo compila tutto in HTML. Qui no: il pannello legge i file YAML **a runtime** dal browser, quindi non serve nessuna build per cambiare il contenuto. Modifichi un file e ricarichi la pagina, oppure con `reload:` in `site.yaml` le modifiche compaiono da sole dopo qualche secondo.

Senza `site.yaml` il pannello funziona esattamente come prima.

## Installazione

1. Copia la cartella [`examples/leics`](https://github.com/luke1699/LEICS-Dashboard/tree/main/examples/leics) in `/config/www/leics/` di Home Assistant (con File Editor, Studio Code Server o Samba).
2. Ricarica il pannello. Fatto: la cartella predefinita è `/local/leics/`.

Per usare un'altra cartella:

```yaml
# configuration.yaml, pannello nella barra laterale
panel_custom:
  - name: leics-dashboard
    url_path: leics
    module_url: /hacsfiles/LEICS-Dashboard/leics-dashboard.js
    config:
      data: /local/casa-mia/        # false = livello dati spento
```

```yaml
# oppure come scheda in una dashboard
type: custom:leics-dashboard-card
data: /local/casa-mia/
```

!!! note
    Home Assistant non elenca il contenuto delle cartelle di `/local`, per questo `site.yaml` dice quali file esistono.
    I file in `/config/www` sono pubblici per chi raggiunge Home Assistant (come le foto delle stanze): non metterci password.

## site.yaml

```yaml
reload: 5                       # secondi; rilegge i file mentre lavori. 0 / assente = solo all'apertura

settings:                       # stesse chiavi dell'export JSON delle impostazioni
  bottomTabs: [consumi, sensoren]
  rooms: [soggiorno, cucina]

menu:                           # menu "Altro", in quest'ordine
  - consumi                     # chiave di una pagina (tua o integrata)
  - energie
  - { label: Grafici, sub: storico, icon: mdi:chart-line, path: /history }

pages: [consumi, panoramica]    # = pages/consumi.yaml, pages/panoramica.yaml
rooms:
  home: rooms/home.yaml
  soggiorno: rooms/soggiorno.yaml
components:
  - components/barre.js
```

- **settings** ha la precedenza su quello che salvi dall'interfaccia. Tieni qui solo quello che vuoi controllare dai file. Se togli una chiave da qui, resta il valore salvato dall'interfaccia.
- **menu**: le pagine integrate sono `automatiseringen`, `sensoren`, `energie`, `cameras`, `systeem`. Una pagina che non è nel menu resta raggiungibile dal suo URL (`/leics/<chiave>`). Senza `menu:` il menu mostra tutte le pagine, più i link di Impostazioni → Menu Altro.
- **pages / rooms** accettano anche la forma `{ chiave: file.yaml }` o `{ chiave: { …contenuto inline… } }`.
- Una pagina con la chiave di una integrata (per esempio `energie`) **la sostituisce**. Con il blocco `page` puoi riusarne dei pezzi.

## Una pagina: pages/&lt;chiave&gt;.yaml

```yaml
title: Consumi
description: potenza, costo           # sottotitolo nel menu "Altro"
icon: mdi:flash-outline
ha: /energy                           # pulsante "Apri in Home Assistant" (facoltativo)
menu: true                            # false = fuori dal menu e dalla ricerca
sub: "[[ $energy.power | 0 ]] W"      # riga sopra il titolo
blocks:
  - type: kpis
    items:
      - { entity: $energy.power, label: Ora, decimals: 0, highlight: true }
  - type: list
    title: Grandi consumatori
    query: { domain: sensor, unit: W, min: 1, sort: -value, limit: 10 }
```

Ogni voce di `blocks` è un componente: `type` dice quale, il resto sono le sue proprietà. Ogni blocco accetta anche `visible:` (vedi [Condizioni](#condizioni)).

Blocchi `list` (o altri di tipo "block") uno dopo l'altro stanno affiancati in colonne. Blocchi `card` uno dopo l'altro formano una griglia.

### Componenti integrati

| type | proprietà | |
|---|---|---|
| `kpis` | `items:` [kpi…], `query:` | riga di tessere grandi |
| `kpi` | `entity`, `attribute`, `value`, `label` (in alto a destra), `name` (sotto), `icon`, `unit`, `decimals`, `scale`, `prefix`, `highlight`, `bar` (`true` = stato in %, `{max: 6000}`), `history` (ore di grafico), `tap` | una tessera |
| `list` | `title`, `meta` (`count` = numero di righe), `items:` [riga…], `query:`, `row:` (proprietà comuni alle righe della query), `empty` | blocco con righe |
| riga di `list` | `entity`, `name`, `sub`, `icon`, `value`, `attribute`, `unit`, `decimals`, `scale`, `prefix`, `control` (`auto` · `toggle` · `number` · `select` · `value` · `none`), `highlight`, `tap` | con `control: auto`: interruttore per switch / luci / automazioni, − + per input_number, menu a tendina per input_select |
| `cards` | `title`, `items:` / `entities:` (entità o chiavi di schede del pannello), `query:` | griglia con le schede vere del pannello (luci, clima, media …) |
| `card` | `entity`, `name`, `value`, `label`, `icon`, `highlight`, `tap`, `hold` | una scheda semplice |
| `heading` | `text`, `sub` | titoletto |
| `text` | `text` (una riga vuota = nuovo paragrafo) | testo |
| `section` | `title`, `blocks:` | gruppo di blocchi |
| `pills` | `items:` [{ entity, name, icon, tap, highlight }] | pulsanti a pillola; con un'entità il tocco la accende / spegne |
| `hourly` | `title`, `meta`, `entities:` [{ entity, label }] | barre per ora di oggi (statistiche del recorder, come il grafico Energia) |
| `page` | `page`, `parts` | pezzi di una pagina integrata, vedi sotto |
| `distacco-carichi` | vedi `src/components/distacco-carichi.js` | il tuo componente |

Pezzi delle pagine integrate per `page`:

| page | parts |
|---|---|
| `energie` | `kpis`, `chart`, `consumers`, `devices` |
| `systeem` | `kpis`, `hints`, `ha`, `host`, `offline` |
| `sensoren` | `attention`, `list`, `filters`, `tools` |
| `automatiseringen` | `kpis`, `list`, `filters`, `tools` |
| `cameras` | `cameras` |

## Le schede di home e stanze: rooms/&lt;chiave&gt;.yaml

La chiave in `site.yaml` è `home` oppure l'**id**, lo **slug** o il **nome** dell'area.

```yaml
mode: only          # only = esattamente queste · append = automatiche + queste · prepend = queste + automatiche
hide: []            # con append/prepend: schede automatiche da togliere
title: Salotto      # e ogni altra chiave di pages[…] delle impostazioni: image, lines, ticker …
cards:
  - weather                                   # scheda del pannello per chiave
  - light.lampada                             # un'entità: la scheda giusta per il suo tipo
  - { entity: climate.salotto, name: Clima }  # + impostazioni della scheda (come ⋯ → Imposta scheda)
  - room:cucina:presets                       # una scheda di un'altra stanza
  - { type: card, entity: sensor.co2, name: CO₂ }   # un componente
```

Chiavi delle schede del pannello: home `attention`, `weather`, `people`, `security`, `agenda`, `climate`, `todo`, `timers`, `ev`, `solar`, `waste`, `scenes`, `energy`, `garden`. Stanza: `scenes`, `presets`, `air`, `group:<id>`, `graph:<id>`, `tpl:<id>:<n>`. Un elettrodomestico si trova anche con l'entità del suo switch o del suo sensore di potenza.

Con `mode: only` la modalità di modifica di quella pagina è disattivata: un tocco lungo sul titolo ti dice quale file modificare. Con `append` / `prepend` la modifica funziona ancora sulle schede automatiche.

## Valori nei testi

| scrittura | risultato | per chi |
|---|---|---|
| `[[ sensor.potenza ]]` | stato attuale, formattato | tutti |
| `[[ sensor.potenza \| 0 ]]` | con 0 decimali | tutti |
| `[[ sun.sun.elevation ]]` | un attributo | tutti |
| `$energy.power`, `$energy.today`, `$energy.price` … | le entità e i valori di Impostazioni → Energia | tutti |
| `$home.weather`, `$home.alarm`, `$home.climate` … | le altre scelte di `home` nelle impostazioni | tutti |
| `$state`, `$name`, `$changed` | dell'entità della riga / tessera (in `name`, `sub`, `value`) | tutti |
| `"{{ states('sensor.x') \| float * 2 }}"` | template Jinja calcolato da Home Assistant | solo amministratori |

I riferimenti `$energy.*` funzionano dappertutto: in `entity:`, in `exclude:`, dentro `[[ ]]` e anche dentro un template Jinja.

!!! warning
    Home Assistant esegue i template Jinja solo per gli amministratori (come le schede template del pannello). Per gli altri utenti usa `[[ ]]`, `scale` e `prefix`. Per esempio il costo di oggi senza Jinja: `{ entity: $energy.today, scale: $energy.price, prefix: "€ ", unit: "" }`.

## Condizioni

`visible:` (su qualsiasi blocco o scheda) e `highlight:` accettano:

```yaml
visible: { entity: alarm_control_panel.casa, state_not: disarmed }
visible: { entity: sensor.potenza, above: 3000 }
visible: { entity: sensor.x, attribute: battery, below: 20 }
visible: [ { entity: … }, { entity: … } ]        # tutte vere
visible: "{{ is_state('sun.sun', 'below_horizon') }}"
```

In `highlight` di una riga o di una tessera l'entità si può omettere: vale quella della riga.

## Azioni (tap / hold)

```yaml
tap: more-info                                  # predefinita con un'entità
tap: toggle
tap: none
tap: { page: consumi }                          # una pagina del pannello
tap: { navigate: /config/automation/dashboard } # un percorso di Home Assistant
tap: { url: https://… }
tap: { service: light.turn_on, data: { brightness_pct: 30 }, target: { entity_id: light.salotto } }
tap: { popup: distacco-carichi, part: setup }   # il popup di un componente
```

## Liste dinamiche: query

`kpis`, `list` e `cards` accettano `query:` al posto di (o insieme a) un elenco fisso:

```yaml
query:
  domain: sensor              # o una lista
  unit: W
  device_class: battery
  area: cucina                # id, slug o nome
  match: "carico_\\d+"        # espressione regolare su entity_id + nome
  state: "on"
  min: 0.1
  max: 100
  exclude: [$energy.power, sensor.contatore]
  sort: -value                # value · -value · name
  limit: 10
```

## Componenti tuoi

Un componente è un oggetto `{ name, render(props, ctx) }`. `props` è il blocco YAML, `ctx` dà tutto il necessario:

| ctx | |
|---|---|
| `html`, `svg`, `nothing`, `classMap` | lit, per il markup |
| `state(id)`, `find(nome o id, [domini])`, `query(q)`, `history(id, ore)`, `hourly(id)` | dati |
| `text(s, stato)`, `check(cond, stato)`, `action(spec, stato)` | le stesse regole dei campi YAML |
| `call(dominio, servizio, dati)`, `more(id)`, `go(percorso)`, `popup(nome, props)` | azioni |
| `ui.kpi`, `ui.row`, `ui.block`, `ui.card`, `ui.section`, `ui.pills`, `ui.numberRow`, `ui.selectRow`, `ui.entityRow`, `ui.entityCard`, `ui.spark`, `ui.ico`, `ui.error` | i pezzi grafici del pannello |
| `blocks(lista)` | disegna altri blocchi YAML dentro il tuo |
| `fmt`, `num`, `isOn`, `unavailable`, `relTime`, `t`, `p` (il pannello) | utilità |

Facoltativi: `kind: "block"` (in colonna con le liste) o `kind: "card"` (in griglia con le schede), e `popup(pop, ctx, wrap)` per un popup tuo, aperto con `ctx.popup(nome, props)` o con `tap: { popup: nome }`. `pop.props` contiene le props passate.

Ci sono due posti per un componente:

=== "Nella cartella dati (nessuna build)"

    ```js
    // /config/www/leics/components/mio.js, elencato in site.yaml → components:
    export default {
      name: "mio",
      render(props, { html, state }) {
        const s = state(props.entity);
        return html`<div class="kpis">…${s?.state}…</div>`;
      },
    };
    ```

    Il modulo non può importare `lit`: usa `ctx.html`. Più componenti in un file: `export const components = [ … ]`. Lo stile può stare in un `<style>` dentro il template (vedi `examples/leics/components/barre.js`).

=== "Nel bundle (src/components/)"

    Ogni file in `src/components/*.js` con un `export default { name, render }` viene incluso da `npm run build`, senza registrarlo da nessuna parte. Qui puoi importare quello che vuoi dal resto del codice. Il distacco carichi è un esempio.

## Errori

Un errore di sintassi YAML, un componente sconosciuto o un errore dentro `render` mostrano un riquadro rosso al posto di quel blocco o di quella scheda, con file, riga e motivo. Il resto della pagina resta in piedi. Il primo errore compare anche in basso come notifica, e tutti finiscono nella console del browser. `LEICS.components()` nella console elenca i componenti registrati.
