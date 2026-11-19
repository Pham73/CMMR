
/* =====================================================
   CMMR - INFORMACIÓN GEOGRÁFICA
   Leaflet + GeoJSON + GeoTIFF

   CAPAS:
   - Colonias y fraccionamientos
   - Áreas prioritarias de incendios (GeoTIFF)

   GEOTIFF:
   0 = Sin datos
   1 = Muy baja
   2 = Baja
   3 = Media
   4 = Alta
   5 = Muy alta

   RESOLUCIÓN DEL RASTER: 10 METROS
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
        archivo: "data/prioridad_incendios_hexagonal.tif",
        nombre: "Áreas prioritarias de incendios",
        checkbox: "areasPrioritariasCheck",
        pane: "paneIncendios",
        activo: false,
        capa: null,
        cargando: false,
        georaster: null
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
var leyendaPrioridad = null;


// =====================================================
// 3. CONFIGURAR PANELES LEAFLET
// =====================================================

function configurarPanelesCMMR() {

    const paneles = {
        panelCalor: 350,
        paneIncendios: 410,
        paneColonias: 450,
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
// 5. POPUP DE COLONIAS
// =====================================================

function crearPopupGeografico(propiedades = {}, tipo) {

    const nombre =
        propiedades.nombre ??
        propiedades.NOMBRE ??
        "Sin nombre";

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
                Colonias y fraccionamientos
            </div>

            <div style="font-size:14px;text-align:center;">
                <strong>Nombre:</strong>
                ${escaparGeoHTML(nombre)}
            </div>

        </div>
    `;

}


// =====================================================
// 6. ESTILO DE COLONIAS
// =====================================================

function estiloGeografico(tipo, feature) {

    return {

        color: "#000000",
        weight: 0.5,
        opacity: 1,
        fill: true,
        fillColor: "#000000",
        fillOpacity: 0

    };

}


// =====================================================
// 7. CREAR CAPA GEOJSON
// =====================================================

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

        style: function(feature) {

            return estiloGeografico(tipo, feature);

        },

        pointToLayer: function(feature, latlng) {

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

        onEachFeature: function(feature, layer) {

            layer.bindPopup(

                crearPopupGeografico(
                    feature.properties,
                    tipo
                ),

                {
                    maxWidth: 350,
                    className: "popup-geografico-cmmr"
                }

            );

        }

    });

}


// =====================================================
// 8. CARGAR GEOJSON DE COLONIAS
// =====================================================

async function cargarGeoJSON(tipo) {

    const config = capasGeograficas[tipo];

    if (!config || config.cargando || config.capa) return;

    config.cargando = true;

    try {

        console.log("CMMR: Cargando " + config.archivo);

        const respuesta = await fetch(config.archivo);

        if (!respuesta.ok) {

            throw new Error("HTTP " + respuesta.status);

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
            "CMMR: " + config.nombre +
            " cargado correctamente"
        );

    } catch (error) {

        console.error(
            "Error cargando " + config.nombre,
            error
        );

        config.activo = false;

        const checkbox =
            document.getElementById(config.checkbox);

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
// 9. SIMBOLOGÍA DEL GEOTIFF
// =====================================================

function colorPixelPrioridad(valores) {

    if (!valores || valores.length === 0) {

        return null;

    }

    const valor = Number(valores[0]);

    if (!Number.isFinite(valor) || valor === 0) {

        return null;

    }

    const prioridad = Math.round(valor);

    return coloresPrioridad[prioridad] || null;

}


// =====================================================
// 10. LEYENDA DE PRIORIDADES
// =====================================================

function crearLeyendaPrioridad() {

    if (leyendaPrioridad) {

        return leyendaPrioridad;

    }

    leyendaPrioridad = L.control({

        position: "bottomright"

    });

    leyendaPrioridad.onAdd = function() {

        const div = L.DomUtil.create(
            "div",
            "leyenda-prioridad-cmmr"
        );

        div.style.background = "rgba(255,255,255,0.95)";
        div.style.padding = "10px 12px";
        div.style.borderRadius = "5px";
        div.style.boxShadow = "0 1px 5px rgba(0,0,0,0.35)";
        div.style.font = "12px Arial";
        div.style.lineHeight = "18px";

        let html = `
            <div style="
                font-weight:bold;
                margin-bottom:6px;
                font-size:13px;
            ">
                Riesgo de Incendios
				Pastizales
            </div>
        `;

        [5, 4, 3, 2, 1].forEach(function(valor) {

            html += `
                <div style="white-space:nowrap;">

                    <span style="
                        display:inline-block;
                        width:12px;
                        height:12px;
                        margin-right:6px;
                        background:${coloresPrioridad[valor]};
                    "></span>

                    ${nombresPrioridad[valor]}

                </div>
            `;

        });

        div.innerHTML = html;

        L.DomEvent.disableClickPropagation(div);

        return div;

    };

    return leyendaPrioridad;

}


// =====================================================
// 11. CARGAR GEOTIFF
// =====================================================

async function cargarGeoTIFF(tipo) {

    const config = capasGeograficas[tipo];

    if (!config || config.cargando || config.capa) return;

    config.cargando = true;

    try {

        if (typeof parseGeoraster !== "function") {

            throw new Error(
                "No se encontró georaster. Verifica las librerías."
            );

        }

        if (typeof GeoRasterLayer !== "function") {

            throw new Error(
                "No se encontró GeoRasterLayer. Verifica las librerías."
            );

        }

        console.log(
            "CMMR: Cargando GeoTIFF " + config.archivo
        );

        const respuesta = await fetch(config.archivo);

        if (!respuesta.ok) {

            throw new Error("HTTP " + respuesta.status);

        }

        const arrayBuffer = await respuesta.arrayBuffer();

        config.georaster = await parseGeoraster(arrayBuffer);

        config.capa = new GeoRasterLayer({

            georaster: config.georaster,

            pane: config.pane,

            opacity: 0.85,

            resolution: 256,

            pixelValuesToColorFn: colorPixelPrioridad

        });

        if (config.activo) {

            config.capa.addTo(map);

            crearLeyendaPrioridad().addTo(map);

        }

        console.log(
            "CMMR: GeoTIFF cargado correctamente"
        );

        console.log(
            "Dimensiones:",
            config.georaster.width,
            "columnas x",
            config.georaster.height,
            "filas"
        );

        console.log(
            "Resolución del píxel:",
            config.georaster.pixelWidth,
            config.georaster.pixelHeight
        );

    } catch (error) {

        console.error(
            "Error cargando GeoTIFF:",
            error
        );

        config.activo = false;

        const checkbox =
            document.getElementById(config.checkbox);

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
// 12. MANTENER COLONIAS AL FRENTE
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
// 13. ACTIVAR / DESACTIVAR CAPAS
// =====================================================

function activarCapaGeografica(tipo, activo) {

    const config = capasGeograficas[tipo];

    if (!config) return;

    config.activo = Boolean(activo);


    // DESACTIVAR

    if (!config.activo) {

        if (

            config.capa &&
            map.hasLayer(config.capa)

        ) {

            map.removeLayer(config.capa);

        }

        if (

            tipo === "areas" &&
            leyendaPrioridad

        ) {

            map.removeControl(leyendaPrioridad);

        }

        return;

    }


    // ACTIVAR COLONIAS

    if (tipo === "colonias") {

        if (config.capa) {

            if (!map.hasLayer(config.capa)) {

                config.capa.addTo(map);

            }

            mantenerColoniasAlFrente();

        } else {

            cargarGeoJSON(tipo);

        }

        return;

    }


    // ACTIVAR ÁREAS PRIORITARIAS

    if (tipo === "areas") {

        if (config.capa) {

            if (!map.hasLayer(config.capa)) {

                config.capa.addTo(map);

            }

            crearLeyendaPrioridad().addTo(map);

        } else {

            cargarGeoTIFF(tipo);

        }

    }

}


// =====================================================
// 14. FUNCIONES PARA HTML
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
// 15. INICIALIZACIÓN
// =====================================================

function iniciarCapasGeograficas() {

    if (informacionGeograficaIniciada) return;

    informacionGeograficaIniciada = true;

    configurarPanelesCMMR();

    const colonias =
        document.getElementById("coloniasCheck");

    const areas =
        document.getElementById("areasPrioritariasCheck");


    // COLONIAS ACTIVADAS INICIALMENTE

    if (colonias) {

        colonias.checked = true;

    }


    // ÁREAS PRIORITARIAS DESACTIVADAS INICIALMENTE

    if (areas) {

        areas.checked = false;

    }

    map.whenReady(function() {

        mostrarColonias(true);

        mostrarAreasPrioritarias(false);

    });

}


// =====================================================
// 16. INICIAR INFORMACIÓN GEOGRÁFICA
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
// 17. ESPERAR CARGA DEL DOCUMENTO
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
