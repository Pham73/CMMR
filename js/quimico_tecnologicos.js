/* =====================================================
   CMMR - RIESGOS QUÍMICO-TECNOLÓGICOS

   1. Riesgo de incendios de pastizales
   2. Riesgo de incendios forestales

   Leaflet XYZ + GeoRaster para consultas
   Sin leyendas ni popups independientes
===================================================== */

// ==========================================
// SIMBOLOGÍA ESTANDARIZADA
// ==========================================

var prioridades = {

    1: { nombre: "Muy baja", color: "#1a9641" },
    2: { nombre: "Baja",     color: "#a6d96a" },
    3: { nombre: "Media",    color: "#fdae61" },
    4: { nombre: "Alta",     color: "#f46d43" },
    5: { nombre: "Muy alta", color: "#d7191c" }
};

// ==========================================
// CONFIGURACIÓN DE CAPAS
// ==========================================

var capasQuimicoTecnologicas = {

    // INCENDIOS DE PASTIZALES

    pastizales: {

        archivo: "data/prioridad_incendios.tif",
        tiles: "data/pmtiles/incendios_pastizales.pmtiles",
        nombre: "Riesgo de incendios de pastizales",
        checkbox: "areasPrioritariasCheck",
        pane: "paneIncendios",
        zIndex: 415,
        activo: false,
        cargando: false,
        capa: null,
        georaster: null,


        prioridades: {

            1: prioridades[1],
            2: prioridades[2],
            3: prioridades[3],
            4: prioridades[4],
            5: prioridades[5]
        }
    },

    // INCENDIOS FORESTALES

    forestal: {

        archivo: "data/areas_prioritarias_forestal_mdgo.tif",
        tiles: "data/pmtiles/incendios_forestales.pmtiles",
        nombre: "Riesgo de incendios forestales",
        checkbox: "incendiosForestalesCheck",
        pane: "paneIncendiosForestales",
        zIndex: 410,
        activo: false,
        cargando: false,
        capa: null,
        georaster: null,


        prioridades: {

            1: { nombre: "No aplica", color: "#e1e1e1" },

            2: prioridades[1],
            3: prioridades[2],
            4: prioridades[3],
            5: prioridades[4],
            6: prioridades[5]
        }
    }
};

// ==========================================
// CONFIGURAR ORDEN DE LAS CAPAS
// ==========================================

function configurarPanelesQuimicos() {

    for (var tipo in capasQuimicoTecnologicas) {

        var c = capasQuimicoTecnologicas[tipo];

        var pane = map.getPane(c.pane) ||
                   map.createPane(c.pane);

        pane.style.zIndex = c.zIndex;

        pane.style.pointerEvents = "none";
    }
}

// ==========================================
// COLOR DE CADA PÍXEL
// ==========================================

function colorPixelQuimico(valores, config) {

    var valor = valores[0];

    // NODATA Y VALORES NO VÁLIDOS

    if (

        valor === null ||

        valor === undefined ||

        !Number.isFinite(valor) ||

        valor === config.georaster?.noDataValue

    ) {

        return null;
    }

    var prioridad = config.prioridades[valor];

    return prioridad ? prioridad.color : null;
}

// ==========================================
// MOSTRAR U OCULTAR CAPAS RASTER
// ==========================================

function mostrarCapaQuimica(tipo, activo) {
    var c = capasQuimicoTecnologicas[tipo];
    if (!c) return;
    c.activo = Boolean(activo);
    if (!c.activo) {
        if (c.capa && map.hasLayer(c.capa)) map.removeLayer(c.capa);
        return;
    }
    configurarPanelesQuimicos();
    if (!c.capa) c.capa = crearCapaPMTiles(c.tiles, {
        pane: c.pane, opacity: 0.85, minZoom: 0,
        minNativeZoom: 8, maxNativeZoom: 14, maxZoom: 22,
        tileSize: 256, keepBuffer: 2, tms: false
    });
    if (!map.hasLayer(c.capa)) c.capa.addTo(map);
}

async function cargarTiffQuimico(c) {
    if (c.georaster) return c.georaster;
    if (!c.promesa) c.promesa = (async function() {
        var r = await fetch(c.archivo);
        if (!r.ok) throw new Error("HTTP " + r.status + " " + c.archivo);
        c.georaster = await parseGeoraster(await r.arrayBuffer());
        return c.georaster;
    })().finally(function() { c.promesa = null; });
    return c.promesa;
}

// ==========================================
// MOSTRAR INCENDIOS DE PASTIZALES
// ==========================================

function mostrarAreasPrioritarias(activo) {

    return mostrarCapaQuimica(

        "pastizales",

        activo
    );
}

// ==========================================
// MOSTRAR INCENDIOS FORESTALES
// ==========================================

function mostrarIncendiosForestales(activo) {

    return mostrarCapaQuimica(

        "forestal",

        activo
    );
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Consulta de los TIFF activos para el popup general.
async function consultarRiesgosQuimicos(latlng) {
    var resultados = [];
    for (var tipo in capasQuimicoTecnologicas) {
        var c = capasQuimicoTecnologicas[tipo];
        if (!c.activo || !c.capa || !map.hasLayer(c.capa)) continue;
        var g;
        try { g = await cargarTiffQuimico(c); } catch (error) { console.error(error); continue; }
        if (!c.activo || !map.hasLayer(c.capa)) continue;
        var x = latlng.lng, y = latlng.lat;
        var epsg = Number(String(g.projection).replace(/^EPSG:/i, ""));
        if (epsg === 3857) {
            var punto = L.CRS.EPSG3857.project(latlng);
            x = punto.x; y = punto.y;
        } else if (epsg !== 4326) {
            if (typeof proj4 !== "function" || !Number.isFinite(epsg)) {
                console.warn("Proyección no disponible:", g.projection); continue;
            }
            try {
                if (epsg === 32613 && !proj4.defs("EPSG:32613")) proj4.defs("EPSG:32613", "+proj=utm +zone=13 +datum=WGS84 +units=m +no_defs");
                var xy = proj4("EPSG:4326", "EPSG:" + epsg, [x, y]);
                x = xy[0]; y = xy[1];
            } catch (error) { console.warn(error); continue; }
        }
        var columna = Math.floor((x - g.xmin) / g.pixelWidth);
        var fila = Math.floor((g.ymax - y) / Math.abs(g.pixelHeight));
        if (!Number.isFinite(columna) || !Number.isFinite(fila) || columna < 0 || fila < 0 || columna >= g.width || fila >= g.height) continue;
        var valor = g.values?.[0]?.[fila]?.[columna];
        if (!Number.isFinite(valor) || valor === g.noDataValue) continue;
        var prioridad = c.prioridades[valor];
        if (prioridad) resultados.push({titulo:c.nombre, nombre:prioridad.nombre, color:prioridad.color});
    }
    return resultados;
}

function iniciarQuimicoTecnologicos() {

    if (

        typeof L === "undefined" ||

        typeof map === "undefined"

    ) return;

    configurarPanelesQuimicos();

    // ESTADO INICIAL DE LAS CAPAS

    for (var tipo in capasQuimicoTecnologicas) {

        var c = capasQuimicoTecnologicas[tipo];

        var check = document.getElementById(

            c.checkbox
        );

        if (check) {

            check.checked = c.activo;
        }

        if (c.activo) {

            mostrarCapaQuimica(tipo, true);
        }
    }

    console.log(

        "CMMR: Riesgos químico-tecnológicos inicializados"
    );
}

// ==========================================
// EJECUTAR AL INICIAR
// ==========================================

if (document.readyState === "loading") {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarQuimicoTecnologicos
    );

} else {

    iniciarQuimicoTecnologicos();
}