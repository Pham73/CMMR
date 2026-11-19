
/* =====================================================
   CMMR - INFORMACIÓN GEOGRÁFICA
   Leaflet + GeoJSON

   CAPAS:
   - Colonias y fraccionamientos
   - Riesgo de incendios de pastizales

   COMPATIBLE CON:
   - mapa.js
   - servicios.js
   - Leaflet.heat
===================================================== */


// =====================================================
// 1. CONFIGURACIÓN
// =====================================================

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


// =====================================================
// 2. COLORES DE PRIORIDAD
// =====================================================

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


// =====================================================
// 3. CONFIGURAR PANELES LEAFLET
// =====================================================

function configurarPanelesCMMR() {

    const paneles = {

        // Mapa de calor al fondo
        panelCalor: 350,

        // Riesgo de incendios
        paneIncendios: 410,

        // Colonias
        paneColonias: 450,

        // Servicios de emergencia
        panelServicios: 500

    };

    Object.entries(paneles).forEach(([nombre, z]) => {

        if (!map.getPane(nombre)) {
            map.createPane(nombre);
        }

        map.getPane(nombre).style.zIndex = z;

    });

    map.getPane("panelCalor").style.pointerEvents = "none";

    map.getPane("paneIncendios").style.pointerEvents = "auto";

    map.getPane("paneColonias").style.pointerEvents = "auto";

    map.getPane("panelServicios").style.pointerEvents = "auto";

}


// =====================================================
// 4. SEGURIDAD HTML
// =====================================================

function escaparGeoHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


// =====================================================
// 5. VENTANAS EMERGENTES
// =====================================================

function crearPopupGeografico(propiedades = {}, tipo) {

    let titulo = "";
    let contenido = "";

    // ---------------------------------------------
    // COLONIAS
    // ---------------------------------------------

    if (tipo === "colonias") {

        titulo = "Colonias y fraccionamientos";

        const nombre =
            propiedades.nombre ??
            propiedades.NOMBRE ??
            "Sin nombre";

        contenido = `
            <strong>Nombre:</strong>
            ${escaparGeoHTML(nombre)}
        `;

    }

    // ---------------------------------------------
    // RIESGO DE INCENDIOS
    // ---------------------------------------------

    else {

        titulo = "Riesgo de incendios de pastizales";

        const prioridad = propiedades.PRIORIDAD;

        const nivel =
            nombresPrioridad[prioridad] ??
            "Sin clasificación";

        const color =
            coloresPrioridad[prioridad] ??
            "#808080";

        contenido = `
            <strong>Prioridad:</strong>

            <span style="
                color:${color};
                font-weight:bold;
            ">
                ${escaparGeoHTML(nivel)}
                (${escaparGeoHTML(prioridad ?? "N/D")})
            </span>
        `;

    }

    return `
        <div style="
            min-width:220px;
            max-width:300px;
            padding:5px;
            font-family:Arial;
        ">

            <div style="
                font-size:15px;
                font-weight:bold;
                text-align:center;
                margin-bottom:10px;
                padding-bottom:8px;
                border-bottom:1px solid #ccc;
            ">
                ${titulo}
            </div>

            <div style="
                font-size:14px;
                text-align:center;
            ">
                ${contenido}
            </div>

        </div>
    `;

}


// =====================================================
// 6. ESTILOS GEOGRÁFICOS
// =====================================================

function estiloGeografico(tipo, feature) {

    // ---------------------------------------------
    // COLONIAS
    // ---------------------------------------------

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

    // ---------------------------------------------
    // ÁREAS PRIORITARIAS
    // ---------------------------------------------

    const prioridad = feature.properties?.PRIORIDAD;

    const color =
        coloresPrioridad[prioridad] ??
        "#808080";

    return {

        color: color,

        weight: 0.6,

        opacity: 0.9,

        fill: true,

        fillColor: color,

        fillOpacity: 0.65

    };

}


// =====================================================
// 7. CREAR CAPAS GEOJSON
// =====================================================

function crearCapaGeografica(tipo, datos) {

    const config = capasGeograficas[tipo];

    // Renderer independiente para cada capa
    const renderer = L.canvas({

        pane: config.pane,

        padding: 0.5

    });

    return L.geoJSON(datos, {

        pane: config.pane,

        renderer: renderer,

        interactive: true,

        style: function(feature) {

            return estiloGeografico(tipo, feature);

        },

        pointToLayer: function(feature, latlng) {

            const estilo =
                estiloGeografico(tipo, feature);

            return L.circleMarker(latlng, {

                pane: config.pane,

                renderer: renderer,

                radius: 5,

                color: estilo.color,

                weight: 1,

                fillColor:
                    estilo.fillColor || estilo.color,

                fillOpacity: 0.8

            });

        },

        onEachFeature: function(feature, layer) {

            layer.bindPopup(

                crearPopupGeografico(
                    feature.properties,
                    tipo
                ),

                {

                    maxWidth: 350,

                    className:
                        "popup-geografico-cmmr"

                }

            );

        }

    });

}


// =====================================================
// 8. CARGAR GEOJSON
// =====================================================

async function cargarGeoJSON(tipo) {

    const config = capasGeograficas[tipo];

    if (!config) return;

    if (config.cargando) return;

    // Si ya existe, únicamente mostrarla
    if (config.capa) {

        if (config.activo &&
            !map.hasLayer(config.capa)) {

            config.capa.addTo(map);

        }

        return;

    }

    config.cargando = true;

    try {

        console.log(
            "CMMR: Cargando " + config.archivo
        );

        const respuesta = await fetch(config.archivo);

        if (!respuesta.ok) {

            throw new Error(
                "HTTP " + respuesta.status
            );

        }

        const datos = await respuesta.json();

        if (!datos || !datos.type) {

            throw new Error(
                "GeoJSON no válido"
            );

        }

        config.capa =
            crearCapaGeografica(tipo, datos);

        if (config.activo) {

            config.capa.addTo(map);

        }

        mantenerColoniasAlFrente();

        console.log(
            "CMMR: " +
            config.nombre +
            " cargado correctamente"
        );

    } catch (error) {

        console.error(
            "Error cargando " + config.nombre,
            error
        );

        config.activo = false;

        const checkbox =
            document.getElementById(
                config.checkbox
            );

        if (checkbox) {

            checkbox.checked = false;

        }

        alert(
            "No se pudo cargar " +
            config.nombre +
            ": " +
            error.message
        );

    } finally {

        config.cargando = false;

    }

}


// =====================================================
// 9. MANTENER COLONIAS AL FRENTE
// =====================================================

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


// =====================================================
// 10. ACTIVAR / DESACTIVAR CAPAS
// =====================================================

function activarCapaGeografica(tipo, activo) {

    const config = capasGeograficas[tipo];

    if (!config) return;

    config.activo = Boolean(activo);

    // ---------------------------------------------
    // DESACTIVAR
    // ---------------------------------------------

    if (!config.activo) {

        if (
            config.capa &&
            map.hasLayer(config.capa)
        ) {

            map.removeLayer(config.capa);

        }

        return;

    }

    // ---------------------------------------------
    // ACTIVAR
    // ---------------------------------------------

    if (config.capa) {

        if (!map.hasLayer(config.capa)) {

            config.capa.addTo(map);

        }

        mantenerColoniasAlFrente();

    } else {

        cargarGeoJSON(tipo);

    }

}


// =====================================================
// 11. FUNCIONES PARA HTML
// =====================================================

function mostrarColonias(activo) {

    activarCapaGeografica(
        "colonias",
        activo
    );

}

function mostrarAreasPrioritarias(activo) {

    activarCapaGeografica(
        "areas",
        activo
    );

}


// =====================================================
// 12. INICIALIZACIÓN
// =====================================================

function iniciarCapasGeograficas() {

    if (informacionGeograficaIniciada) return;

    informacionGeograficaIniciada = true;

    configurarPanelesCMMR();

    const colonias =
        document.getElementById(
            "coloniasCheck"
        );

    const areas =
        document.getElementById(
            "areasPrioritariasCheck"
        );

    // Colonias activadas inicialmente
    if (colonias) {

        colonias.checked = true;

    }

    // Áreas prioritarias desactivadas
    if (areas) {

        areas.checked = false;

    }

    map.whenReady(function() {

        mostrarColonias(true);

        mostrarAreasPrioritarias(false);

    });

}


// =====================================================
// 13. INICIAR INFORMACIÓN GEOGRÁFICA
// =====================================================

function iniciarInformacionGeografica() {

    if (
        typeof L === "undefined" ||
        typeof map === "undefined"
    ) {

        console.error(
            "CMMR: Leaflet o mapa.js no disponibles"
        );

        return;

    }

    iniciarCapasGeograficas();

}


// =====================================================
// 14. ESPERAR CARGA DEL DOCUMENTO
// =====================================================

if (document.readyState === "loading") {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarInformacionGeografica

    );

} else {

    iniciarInformacionGeografica();

}


// =====================================================
// FIN INFORMACION_GEOGRAFICA.JS
// =====================================================
