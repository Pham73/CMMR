
/* ==========================================================
   CMMR - SERVICIOS Y MAPA DE CALOR

   ARCHIVO: js/servicios.js
   CSV: data/servicios.csv

   COORDENADAS:
   x = LONGITUD
   y = LATITUD

   ESTACIONES:
   ECO_1, ECO_2, ECO_3, ECO_4, ECO_5

   CONFIGURACIÓN INICIAL:
   - Estaciones desactivadas
   - Mapa de calor activado
   - Sin modificar centro ni zoom
========================================================== */


// ==========================================================
// 1. VARIABLES GLOBALES
// ==========================================================

var capasServicios = {};

var datosServicios = null;

var serviciosCargando = false;

var capaCalor = null;


// ==========================================================
// 2. CAMPOS DEL POPUP
// ==========================================================

var camposMostrar = [

    "FECHA",
    "SUBCOMANDANTE",
    "NO_ESTACION",
    "ZONA",
    "SERVICIOS_PRIORIDAD_UNO",
    "SERVICIOS_PRIORIDAD_DOS",
    "SERVICIOS_PRIORIDAD_TRES",
    "SERVICIOS_PRIORIDAD_UNO_ZONARURAL",
    "LUGAR",
    "UNIDAD_PARTICIPAN",
    "PERSONAL_OPERATIVO",
    "ESTACION_QUE_APOYA",
    "CORPORACIONES_PARTICIPAN",
    "NARRATIVA_HECHOS"

];


// ==========================================================
// 3. CREAR PANELES LEAFLET
// ==========================================================

// El mapa debe existir previamente en mapa.js.

// Panel del Heatmap
if (!map.getPane("panelCalor")) {

    map.createPane("panelCalor");

}

map.getPane("panelCalor").style.zIndex = 400;

map.getPane("panelCalor").style.pointerEvents = "none";


// Panel de los marcadores
if (!map.getPane("panelServicios")) {

    map.createPane("panelServicios");

}

map.getPane("panelServicios").style.zIndex = 450;


// ==========================================================
// 4. OBTENER COORDENADAS
// ==========================================================

function obtenerCoordenadas(fila) {

    var x = parseFloat(
        String(fila.x ?? "")
            .trim()
            .replace(",", ".")
    );

    var y = parseFloat(
        String(fila.y ?? "")
            .trim()
            .replace(",", ".")
    );

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        Math.abs(x) > 180 ||
        Math.abs(y) > 90
    ) {

        return null;

    }

    return [y, x];

}


// ==========================================================
// 5. NORMALIZAR ESTACIÓN
// ==========================================================

function normalizarEstacion(valor) {

    return String(valor ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

}


// ==========================================================
// 6. MOSTRAR / OCULTAR ESTACIONES
// ==========================================================

function mostrarServicios(checkbox) {

    var estacion = "ECO_" + checkbox.value;

    // Crear capa independiente
    if (!capasServicios[estacion]) {

        capasServicios[estacion] = L.layerGroup();

    }

    // ------------------------------------------------------
    // OCULTAR ESTACIÓN
    // ------------------------------------------------------

    if (!checkbox.checked) {

        map.removeLayer(capasServicios[estacion]);

        console.log(estacion + " desactivada");

        return;

    }

    // ------------------------------------------------------
    // MOSTRAR ESTACIÓN
    // ------------------------------------------------------

    map.addLayer(capasServicios[estacion]);

    if (datosServicios !== null) {

        dibujarEstacion(estacion);

        return;

    }

    cargarServicios();

}


// ==========================================================
// 7. CARGAR CSV
// ==========================================================

function cargarServicios() {

    if (
        serviciosCargando ||
        datosServicios !== null
    ) {

        return;

    }

    serviciosCargando = true;

    console.log("Cargando servicios.csv...");

    Papa.parse("data/servicios.csv", {

        download: true,

        header: true,

        skipEmptyLines: true,

        delimiter: "",

        transformHeader: function(header) {

            return header
                .replace(/^\uFEFF/, "")
                .trim();

        },

        complete: function(resultado) {

            serviciosCargando = false;

            if (resultado.errors.length > 0) {

                console.warn(
                    "Advertencias del CSV:",
                    resultado.errors
                );

            }

            datosServicios = resultado.data;

            console.log(
                "Columnas:",
                resultado.meta.fields
            );

            console.log(
                "Total de registros:",
                datosServicios.length
            );

            // ----------------------------------------------
            // ESTACIONES ACTIVADAS
            // ----------------------------------------------

            document.querySelectorAll(
                'input[name="estaciones"]:checked'
            ).forEach(function(checkbox) {

                var estacion = "ECO_" + checkbox.value;

                if (!capasServicios[estacion]) {

                    capasServicios[estacion] =
                        L.layerGroup();

                }

                map.addLayer(capasServicios[estacion]);

                dibujarEstacion(estacion);

            });

            // ----------------------------------------------
            // MAPA DE CALOR
            // ----------------------------------------------

            var checkCalor =
                document.getElementById("heatmap");

            if (checkCalor && checkCalor.checked) {

                mostrarHeatmap(true);

            }

        },

        error: function(error) {

            serviciosCargando = false;

            console.error(
                "Error al cargar CSV:",
                error
            );

        }

    });

}


// ==========================================================
// 8. DIBUJAR ESTACIÓN
// ==========================================================

function dibujarEstacion(estacionSeleccionada) {

    if (datosServicios === null) return;

    var capa = capasServicios[estacionSeleccionada];

    if (!capa) return;

    capa.clearLayers();

    var contador = 0;

    datosServicios.forEach(function(fila) {

        // ----------------------------------------------
        // FILTRAR ESTACIÓN
        // ----------------------------------------------

        var estacion = normalizarEstacion(
            fila.NO_ESTACION
        );

        if (estacion !== estacionSeleccionada) {
            return;
        }

        // ----------------------------------------------
        // COORDENADAS
        // ----------------------------------------------

        var coordenadas = obtenerCoordenadas(fila);

        if (!coordenadas) return;

        // ----------------------------------------------
        // MARCADOR
        // ----------------------------------------------

        var marcador = L.circleMarker(
            coordenadas,
            {
                radius: 6,
                pane: "panelServicios",
                className: "punto-servicio"
            }
        );

        // ----------------------------------------------
        // POPUP
        // ----------------------------------------------

        var popup = document.createElement("div");

        popup.className = "popup-servicios";

        // ENCABEZADO
        var encabezado = document.createElement("div");

        encabezado.className = "popup-encabezado";

        encabezado.textContent =
            "REPORTE DE SERVICIO DE EMERGENCIA";

        popup.appendChild(encabezado);

        // CONTENIDO
        var contenido = document.createElement("div");

        contenido.className = "popup-contenido";

        // ----------------------------------------------
        // CAMPOS
        // ----------------------------------------------

        camposMostrar.forEach(function(campo) {

            var valor = fila[campo];

            if (
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ""
            ) {
                return;
            }

            var linea = document.createElement("div");

            linea.className = "popup-fila";

            var etiqueta = document.createElement("strong");

            etiqueta.className = "popup-etiqueta";

            etiqueta.textContent =
                campo.replace(/_/g, " ") + ":";

            var dato = document.createElement("span");

            dato.className = "popup-valor";

            dato.textContent = String(valor);

            linea.appendChild(etiqueta);

            linea.appendChild(dato);

            contenido.appendChild(linea);

        });

        popup.appendChild(contenido);

        // ----------------------------------------------
        // CONFIGURAR POPUP
        // ----------------------------------------------

        marcador.bindPopup(popup, {

            className: "popup-cmmr",

            autoPan: true,

            keepInView: true

        });

        marcador.addTo(capa);

        contador++;

    });

    console.log(
        estacionSeleccionada +
        " - Servicios: " +
        contador
    );

}


// ==========================================================
// 9. MOSTRAR / OCULTAR MAPA DE CALOR
// ==========================================================

function mostrarHeatmap(activar) {

    // ------------------------------------------------------
    // DESACTIVAR
    // ------------------------------------------------------

    if (!activar) {

        if (capaCalor) {

            map.removeLayer(capaCalor);

            capaCalor = null;

        }

        console.log("Mapa de calor desactivado");

        return;

    }

    // ------------------------------------------------------
    // VERIFICAR BIBLIOTECA
    // ------------------------------------------------------

    if (typeof L.heatLayer !== "function") {

        console.error(
            "Leaflet.heat no está cargado."
        );

        return;

    }

    // ------------------------------------------------------
    // VERIFICAR DATOS
    // ------------------------------------------------------

    if (datosServicios === null) {

        cargarServicios();

        return;

    }

    // ------------------------------------------------------
    // GENERAR PUNTOS
    // ------------------------------------------------------

    var puntosCalor = [];

    datosServicios.forEach(function(fila) {

        var coordenadas = obtenerCoordenadas(fila);

        if (!coordenadas) return;

        puntosCalor.push([
            coordenadas[0],
            coordenadas[1],
            1
        ]);

    });

    console.log(
        "Puntos Heatmap:",
        puntosCalor.length
    );

    if (puntosCalor.length === 0) {

        console.warn(
            "No existen coordenadas válidas."
        );

        return;

    }

    // ------------------------------------------------------
    // ELIMINAR CAPA ANTERIOR
    // ------------------------------------------------------

    if (capaCalor) {

        map.removeLayer(capaCalor);

        capaCalor = null;

    }

    // ------------------------------------------------------
    // CREAR NUEVA CAPA
    // ------------------------------------------------------

    capaCalor = L.heatLayer(puntosCalor, {

        pane: "panelCalor",

        radius: 23,

        blur: 15,

        maxZoom: 17,

        minOpacity: 0.3,

        gradient: {

            0.2: "blue",

            0.4: "cyan",

            0.6: "lime",

            0.8: "yellow",

            1.0: "red"

        }

    });

    // ------------------------------------------------------
    // MOSTRAR CAPA
    // ------------------------------------------------------

    capaCalor.addTo(map);

    // Solicitar redibujado
    if (typeof capaCalor.redraw === "function") {

        capaCalor.redraw();

    }

    console.log(
        "Mapa de calor activado correctamente"
    );

    // No se utiliza fitBounds ni setView.

}


// ==========================================================
// 10. CONFIGURACIÓN INICIAL
// ==========================================================

// ----------------------------------------------
// ESTACIONES DESACTIVADAS
// ----------------------------------------------

document.querySelectorAll(
    'input[name="estaciones"]'
).forEach(function(checkbox) {

    checkbox.checked = false;

});


// ----------------------------------------------
// MAPA DE CALOR ACTIVADO
// ----------------------------------------------

var checkCalorInicial =
    document.getElementById("heatmap");

if (checkCalorInicial) {

    checkCalorInicial.checked = true;

}


// ----------------------------------------------
// CARGAR CSV
// ----------------------------------------------

cargarServicios();


// ==========================================================
// FIN SERVICIOS.JS
// ==========================================================
