
/* =====================================================
   CMMR - INFORMACIÓN GEOGRÁFICA
   Leaflet + GeoJSON
===================================================== */

// 1. CONFIGURACIÓN

var capasGeograficas = {
    colonias: {
        archivo: "data/colonias.geojson",
        nombre: "Colonias y fraccionamientos",
        checkbox: "coloniasCheck",
        pane: "paneColonias",
        activo: true,
        capa: null,
        cargando: false
    },
    areas: {
        archivo: "data/areas_prioritarias_ince.geojson",
        nombre: "Riesgo de incendios de pastizales",
        checkbox: "areasPrioritariasCheck",
        pane: "paneIncendios",
        activo: false,
        capa: null,
        cargando: false
    }
};

var coloresPrioridad = {
    0: "#808080",
    1: "#1a9641",
    2: "#a6d96a",
    3: "#fdae61",
    4: "#f46d43",
    5: "#d7191c"
};

var nombresPrioridad = {
    0: "Sin datos",
    1: "Muy baja",
    2: "Baja",
    3: "Media",
    4: "Alta",
    5: "Muy alta"
};

var informacionGeograficaIniciada = false;

// 2. PANELES Y ORDEN DE CAPAS

function configurarPanelesCMMR() {

    const paneles = {
        paneCalor: 350,
        paneIncendios: 410,
        paneColonias: 450,
        paneEstaciones: 460
    };

    Object.entries(paneles).forEach(([nombre, z]) => {
        if (!map.getPane(nombre)) {
            map.createPane(nombre);
        }
        map.getPane(nombre).style.zIndex = z;
    });

    map.getPane("paneCalor").style.pointerEvents = "none";
    map.getPane("paneIncendios").style.pointerEvents = "auto";
    map.getPane("paneColonias").style.pointerEvents = "auto";
}

// 3. SEGURIDAD HTML

function escaparGeoHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// 4. VENTANAS EMERGENTES

function crearPopupGeografico(propiedades = {}, tipo) {

    let titulo, contenido;

    if (tipo === "colonias") {

        titulo = "Colonias y fraccionamientos";

        contenido = `
            <strong>Nombre:</strong>
            ${escaparGeoHTML(propiedades.nombre ?? "Sin nombre")}
        `;

    } else {

        titulo = "Riesgo de incendios de pastizales";

        const prioridad = propiedades.PRIORIDAD;
        const nivel = nombresPrioridad[prioridad] ?? "Sin clasificación";
        const color = coloresPrioridad[prioridad] ?? "#808080";

        contenido = `
            <strong>Prioridad:</strong>
            <span style="color:${color};font-weight:bold">
                ${escaparGeoHTML(nivel)}
                (${escaparGeoHTML(prioridad ?? "N/D")})
            </span>
        `;
    }

    return `
        <div style="min-width:220px;max-width:300px;
                    padding:5px;font-family:Arial">
            <div style="font-size:15px;font-weight:bold;
                        text-align:center;margin-bottom:10px;
                        padding-bottom:8px;
                        border-bottom:1px solid #ccc">
                ${titulo}
            </div>
            <div style="font-size:14px;text-align:center">
                ${contenido}
            </div>
        </div>
    `;
}

// 5. ESTILOS

function estiloGeografico(tipo, feature) {

    if (tipo === "colonias") {
        return {
            color: "#000000",
            weight: 0.5,
            opacity: 1,
            fill: true,
            fillColor: "#000000",
            fillOpacity: 0
        };
    }

    const prioridad = feature.properties?.PRIORIDAD;
    const color = coloresPrioridad[prioridad] ?? "#808080";

    return {
        color: color,
        weight: 0.6,
        opacity: 0.9,
        fill: true,
        fillColor: color,
        fillOpacity: 0.65
    };
}

// 6. CREAR CAPAS GEOJSON

function crearCapaGeografica(tipo, datos) {

    const config = capasGeograficas[tipo];

    const renderer = L.canvas({
        pane: config.pane,
        padding: 0.5
    });

    return L.geoJSON(datos, {

        pane: config.pane,
        renderer: renderer,

        interactive: true,

        style: feature => estiloGeografico(tipo, feature),

        pointToLayer: (feature, latlng) => {
            const estilo = estiloGeografico(tipo, feature);

            return L.circleMarker(latlng, {
                pane: config.pane,
                renderer: renderer,
                radius: 5,
                color: estilo.color,
                weight: 1,
                fillColor: estilo.fillColor || estilo.color,
                fillOpacity: 0.8
            });
        },

        onEachFeature: (feature, layer) => {

            layer.bindPopup(
                crearPopupGeografico(feature.properties, tipo),
                {
                    maxWidth: 350,
                    className: "popup-geografico-cmmr"
                }
            );
        }
    });
}

// 7. CARGAR GEOJSON

async function cargarGeoJSON(tipo) {

    const config = capasGeograficas[tipo];

    if (!config || config.cargando || config.capa) return;

    config.cargando = true;

    try {

        const respuesta = await fetch(config.archivo);

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!datos || !datos.type) {
            throw new Error("GeoJSON no válido");
        }

        config.capa = crearCapaGeografica(tipo, datos);

        if (config.activo) {
            config.capa.addTo(map);
        }

        mantenerColoniasAlFrente();

        console.log(
            `CMMR: ${config.nombre} cargado correctamente`
        );

    } catch (error) {

        console.error(error);

        config.activo = false;

        const checkbox = document.getElementById(config.checkbox);

        if (checkbox) checkbox.checked = false;

        alert(`No se pudo cargar ${config.nombre}: ${error.message}`);

    } finally {
        config.cargando = false;
    }
}

// 8. ORDEN DE COLONIAS

function mantenerColoniasAlFrente() {

    const colonias = capasGeograficas.colonias;

    if (
        colonias.capa &&
        colonias.activo &&
        map.hasLayer(colonias.capa)
    ) {
        colonias.capa.bringToFront();
    }
}

// 9. ACTIVAR / DESACTIVAR

function activarCapaGeografica(tipo, activo) {

    const config = capasGeograficas[tipo];

    if (!config) return;

    config.activo = Boolean(activo);

    if (!config.activo) {

        if (config.capa && map.hasLayer(config.capa)) {
            map.removeLayer(config.capa);
        }

        return;
    }

    if (config.capa) {

        if (!map.hasLayer(config.capa)) {
            config.capa.addTo(map);
        }

        mantenerColoniasAlFrente();

    } else {
        cargarGeoJSON(tipo);
    }
}

// 10. FUNCIONES DEL HTML

function mostrarColonias(activo) {
    activarCapaGeografica("colonias", activo);
}

function mostrarAreasPrioritarias(activo) {
    activarCapaGeografica("areas", activo);
}

// 11. INICIALIZACIÓN

function iniciarCapasGeograficas() {

    if (informacionGeograficaIniciada) return;

    informacionGeograficaIniciada = true;

    configurarPanelesCMMR();

    const colonias = document.getElementById("coloniasCheck");
    const areas = document.getElementById("areasPrioritariasCheck");

    if (colonias) colonias.checked = true;
    if (areas) areas.checked = false;

    map.whenReady(() => {
        mostrarColonias(true);
        mostrarAreasPrioritarias(false);
    });
}

function iniciarInformacionGeografica() {

    if (typeof L === "undefined" || typeof map === "undefined") {
        console.error("CMMR: Leaflet o mapa.js no disponibles");
        return;
    }

    iniciarCapasGeograficas();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarInformacionGeografica
    );
} else {
    iniciarInformacionGeografica();
}
