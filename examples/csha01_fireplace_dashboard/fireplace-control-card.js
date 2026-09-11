class FireplaceControlCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rememberedColors = {};
    this._suppressColorMemory = false;
    this.shadowRoot.addEventListener("click", (event) => this._click(event));
    this.shadowRoot.addEventListener("change", (event) => this._change(event));
  }

  setConfig(config) { this.config = config; }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 9; }
  _state(id) { return this._hass?.states?.[id]; }
  _on(id) { return this._state(id)?.state === "on"; }
  _num(id, fallback = 0) {
    const value = Number.parseFloat(this._state(id)?.state);
    return Number.isFinite(value) ? value : fallback;
  }
  _call(domain, service, data) { return this._hass.callService(domain, service, data); }

  _rememberColors() {
    for (const id of ["select.fireplace_csh_a01_flame_color", "select.fireplace_csh_a01_ember_bed_color"]) {
      const value = this._state(id)?.state;
      if (value) this._rememberedColors[id] = value;
    }
  }

  _selectedValue(id, entity) {
    if (this._suppressColorMemory && this._rememberedColors[id]) return this._rememberedColors[id];
    return entity?.state;
  }

  _label(id, value) {
    const labels = {
      "select.fireplace_csh_a01_operating_mode": { off: "Aus", h1: "Stufe 1", h2: "Stufe 2" },
      "select.fireplace_csh_a01_countdown": { cancel: "Aus", "1_hour": "1 Stunde", "2_hours": "2 Stunden", "3_hours": "3 Stunden", "4_hours": "4 Stunden", "5_hours": "5 Stunden" },
      "select.fireplace_csh_a01_temperatur_einheit": { celsius: "Celsius", fahrenheit: "Fahrenheit" },
      "select.fireplace_csh_a01_flame_brightness": { L1: "Helligkeit 1", L2: "Helligkeit 2", L3: "Helligkeit 3", L4: "Helligkeit 4", L5: "Helligkeit 5" },
      "select.fireplace_csh_a01_flame_color": { C0: "Flammenfarbe 1", C1: "Flammenfarbe 2", C2: "Flammenfarbe 3", C3: "Flammenfarbe 4", C4: "Flammenfarbe 5", C5: "Flammenfarbe 6" },
      "select.fireplace_csh_a01_ember_bed_brightness": { "1": "Helligkeit 1", "2": "Helligkeit 2", "3": "Helligkeit 3", "4": "Helligkeit 4", "5": "Helligkeit 5" },
      "select.fireplace_csh_a01_ember_bed_color": { F0: "Glutbettfarbe 1", F1: "Glutbettfarbe 2", F2: "Glutbettfarbe 3", F3: "Glutbettfarbe 4", F4: "Glutbettfarbe 5", F5: "Glutbettfarbe 6" },
    };
    return labels[id]?.[value] ?? value;
  }

  _options(id) {
    const entity = this._state(id);
    const selected = this._selectedValue(id, entity);
    return (entity?.attributes?.options ?? []).map((value) =>
      `<option value="${value}" ${selected === value ? "selected" : ""}>${this._label(id, value)}</option>`
    ).join("");
  }

  _click(event) {
    const item = event.target.closest("[data-action]");
    if (!item) return;
    if (item.dataset.action === "toggle") {
      if (item.dataset.entity === "switch.fireplace_csh_a01_flame" && this._on(item.dataset.entity)) {
        this._rememberColors();
        this._suppressColorMemory = true;
      }
      this._call("homeassistant", "toggle", { entity_id: item.dataset.entity });
    }
    if (item.dataset.action === "mode") {
      this._call("select", "select_option", { entity_id: "select.fireplace_csh_a01_operating_mode", option: item.dataset.value });
    }
    if (item.dataset.action === "temperature") {
      const climate = this._state("climate.fireplace_csh_a01");
      const current = Number(climate?.attributes?.temperature ?? this._num("sensor.fireplace_csh_a01_target_temperature", 25));
      this._call("climate", "set_temperature", {
        entity_id: "climate.fireplace_csh_a01",
        temperature: Math.max(0, Math.min(37, current + Number(item.dataset.delta))),
      });
    }
  }

  _change(event) {
    const item = event.target.closest("select[data-entity]");
    if (item) this._call("select", "select_option", { entity_id: item.dataset.entity, option: item.value });
  }

  _render() {
    if (!this._hass) return;
    const power = this._on("switch.fireplace_csh_a01_power");
    const flame = this._on("switch.fireplace_csh_a01_flame");
    const current = this._num("sensor.fireplace_csh_a01_current_temperature");
    const target = this._num("sensor.fireplace_csh_a01_target_temperature");
    const mode = this._state("select.fireplace_csh_a01_operating_mode")?.state ?? "off";
    const flameColor = this._state("select.fireplace_csh_a01_flame_color")?.state;
    const emberColor = this._state("select.fireplace_csh_a01_ember_bed_color")?.state;
    if (!flame) {
      this._suppressColorMemory = true;
    } else if (!this._suppressColorMemory ||
      ((flameColor !== "C0" || this._rememberedColors["select.fireplace_csh_a01_flame_color"] === "C0") &&
       (emberColor !== "F0" || this._rememberedColors["select.fireplace_csh_a01_ember_bed_color"] === "F0"))) {
      this._rememberColors();
      this._suppressColorMemory = false;
    }
    const selector = (id, title, icon) => `
      <label class="setting"><span class="setting-icon"><ha-icon icon="${icon}"></ha-icon></span>
      <strong>${title}</strong><select data-entity="${id}">${this._options(id)}</select></label>`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; --orange:#ff8534; --accent:#55d6c2; }
        * { box-sizing:border-box; }
        .page { min-height:calc(100vh - 64px); padding:clamp(12px,1.8vw,24px); color:#f8fbff; font-family:system-ui,sans-serif;
          background:radial-gradient(circle at 14% 8%,rgba(45,181,164,.15),transparent 32%),radial-gradient(circle at 88% 86%,rgba(94,76,180,.12),transparent 34%),linear-gradient(145deg,#0b0f14,#131922 54%,#0b0e13); }
        .shell { max-width:1180px; margin:auto; }
        .layout { display:grid; grid-template-columns:minmax(330px,1fr) minmax(400px,1.35fr); gap:14px; }
        .glass { background:rgba(19,25,34,.88); border:1px solid rgba(132,159,185,.18); border-radius:24px; box-shadow:0 22px 60px #0008; backdrop-filter:blur(22px); }
        .hero { padding:18px 24px; display:flex; flex-direction:column; align-items:center; align-self:start; }
        .ring { width:min(222px,55vw); aspect-ratio:1; border-radius:50%; display:grid; place-items:center; position:relative; margin:0 0 4px;
          background:linear-gradient(145deg,#ff6d24,#ffad4e); box-shadow:0 0 42px #ff7a182b; }
        .ring:before { content:""; position:absolute; inset:11px; border-radius:50%; background:radial-gradient(circle at 50% 28%,#24303d,#0e131a 72%); }
        .temperature { position:relative; text-align:center; }
        .temperature strong { display:block; font-size:clamp(62px,7vw,82px); font-weight:300; letter-spacing:-.07em; line-height:.9; }
        .temperature strong span { font-size:.31em; vertical-align:top; letter-spacing:0; margin-left:8px; }
        .temperature small { display:block; margin-top:10px; color:#c7d3df; font-size:13px; }
        .temperature b { color:white; }
        .stepper-label { color:#9fb6ce; font-size:12px; margin-bottom:5px; }
        .temp-actions { display:grid; grid-template-columns:42px 104px 42px; align-items:stretch; overflow:hidden; border:1px solid #ffffff2b; border-radius:14px; background:#ffffff09; }
        .round { width:42px; height:42px; border:0; border-radius:0; background:#ffffff09; color:white; font-size:24px; cursor:pointer; }
        .round:first-child { border-right:1px solid #ffffff20; }
        .round:last-child { border-left:1px solid #ffffff20; }
        .round:hover { background:#ffffff25; transform:translateY(-2px); }
        .target { display:grid; place-items:center; min-width:0; text-align:center; }
        .target strong { display:block; font-size:20px; }
        .quick { width:100%; display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:12px; }
        .quick button { min-height:62px; border:1px solid rgba(132,159,185,.2); border-radius:17px; background:rgba(255,255,255,.045); color:white; display:flex; align-items:center; gap:11px; padding:12px 14px; cursor:pointer; text-align:left; }
        .quick button.active { background:linear-gradient(135deg,#ff6a1b4d,#ffae461f); border-color:#ff9442a8; box-shadow:inset 0 0 0 1px #ff9b4120; }
        .quick ha-icon { width:30px; height:30px; color:#8da6bf; } .quick .active ha-icon { color:#ffb347; filter:drop-shadow(0 0 8px #ff801caa); }
        .quick strong,.quick small { display:block; } .quick small { color:#aebed0; margin-top:4px; }
        .controls { padding:9px 18px; }
        h2 { display:flex; align-items:center; gap:8px; margin:0 0 5px; font-size:16px; } h2 ha-icon { color:#ffb347; }
        .modes { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:7px; }
        .mode { border:1px solid #ffffff20; border-radius:13px; padding:9px; background:#ffffff0e; color:#c9d8e8; font-weight:750; cursor:pointer; }
        .mode.active { color:white; border-color:#ff9135b3; background:linear-gradient(135deg,#e65316,#ff922e); box-shadow:0 9px 24px #ff5c1538; }
        .settings { display:grid; gap:3px; }
        .setting { height:44px; display:grid; grid-template-columns:34px 1fr minmax(110px,145px); gap:10px; align-items:center; padding:4px 10px; border-radius:13px; background:rgba(255,255,255,.04); border:1px solid rgba(132,159,185,.13); }
        .setting-icon { width:32px; height:32px; border-radius:10px; display:grid; place-items:center; background:rgba(85,214,194,.12); color:var(--accent); }
        .setting strong { font-size:14px; }
        select { width:100%; height:35px; color:#f5f8fc; background:#18212c; border:1px solid rgba(132,159,185,.2); border-radius:10px; padding:6px 10px; font:inherit; cursor:pointer; }
        @media(max-width:850px){ .layout{grid-template-columns:1fr} }
        @media(max-width:520px){ .page{padding:12px}.glass{border-radius:21px}.setting{grid-template-columns:40px 1fr}.setting select{grid-column:1/-1}.status span:last-child{display:none} }
      </style>
      <div class="page"><div class="shell">
        <main class="layout">
          <section class="glass hero">
            <div class="ring"><div class="temperature"><strong>${current}<span>°C</span></strong><small>Ziel <b>${target} °C</b></small></div></div>
            <div class="stepper-label">Solltemperatur</div>
            <div class="temp-actions"><button class="round" data-action="temperature" data-delta="-1">−</button><div class="target"><strong>${target} °C</strong></div><button class="round" data-action="temperature" data-delta="1">+</button></div>
            <div class="quick">
              <button class="${power ? "active" : ""}" data-action="toggle" data-entity="switch.fireplace_csh_a01_power"><ha-icon icon="mdi:power"></ha-icon><span><strong>Ein/Aus</strong><small>${power ? "Eingeschaltet" : "Ausgeschaltet"}</small></span></button>
              <button class="${flame ? "active" : ""}" data-action="toggle" data-entity="switch.fireplace_csh_a01_flame"><ha-icon icon="mdi:fire"></ha-icon><span><strong>Flamme</strong><small>${flame ? "Eingeschaltet" : "Ausgeschaltet"}</small></span></button>
            </div>
          </section>
          <section class="glass controls">
            <h2><ha-icon icon="mdi:radiator"></ha-icon>Heizbetrieb</h2>
            <div class="modes"><button class="mode ${mode === "off" ? "active" : ""}" data-action="mode" data-value="off">Aus</button><button class="mode ${mode === "h1" ? "active" : ""}" data-action="mode" data-value="h1">Stufe 1</button><button class="mode ${mode === "h2" ? "active" : ""}" data-action="mode" data-value="h2">Stufe 2</button></div>
            <h2><ha-icon icon="mdi:fire-circle"></ha-icon>Flammenbild</h2>
            <div class="settings">
              ${selector("select.fireplace_csh_a01_flame_brightness", "Flammenhelligkeit", "mdi:brightness-7")}
              ${selector("select.fireplace_csh_a01_flame_color", "Flammenfarbe", "mdi:palette-outline")}
              ${selector("select.fireplace_csh_a01_ember_bed_brightness", "Glutbett-Helligkeit", "mdi:brightness-6")}
              ${selector("select.fireplace_csh_a01_ember_bed_color", "Glutbettfarbe", "mdi:palette")}
              ${selector("select.fireplace_csh_a01_countdown", "Countdown", "mdi:timer-outline")}
              ${selector("select.fireplace_csh_a01_temperatur_einheit", "Temperatur-Einheit", "mdi:thermometer")}
            </div>
          </section>
        </main>
      </div></div>`;
  }
}

if (!customElements.get("fireplace-control-card")) customElements.define("fireplace-control-card", FireplaceControlCard);
