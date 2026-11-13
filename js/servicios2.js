
/* ==========================================================
   CMMR - SERVICIOS DE EMERGENCIA
   SUPABASE + POSTGRESQL + LEAFLET

   ARCHIVO: js/servicios.js

   FUENTE:
   public.servicios_mapa_publico

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
// 1. CONFIGURACIÓN SUPABASE
// ==========================================================

const SUPABASE_URL =
    "https://quqpxsxwieqievqkccpn.supabase.co";

// Colocar aquí la Publishable key o anon key.
// NUNCA colocar la contraseña PostgreSQL
// ni la clave service_role.

const SUPABASE_PUBLIC_KEY =
    "sb_publishable_ClvmTbRa6ursKGP0tnYgpw_9V9fe-nB";

const SUPABASE_TABLA =
    "servicios_mapa_publico";

const SUPABASE_PAGINA = 1000;


// ==========================================================
// 2. VARIABLES GLOBALES
// ==========================================================

var capasServicios = {};

var datosServicios = null;

var serviciosCargando = false;

var capaCalor = null;

var promesaServicios = null;


// ==========================================================
// 3. CAMPOS DEL POPUP
// ==========================================================

// Únicamente campos disponibles en la vista pública.

var camposMostrar = [
    "FECHA",
    "NO_ESTACION",
    "ZONA",
    "SERVICIOS_PRIORIDAD_UNO",
    "SERVICIOS_PRIORIDAD_DOS",
    "SERVICIOS_PRIORIDAD_TRES",
    "SERVICIOS_PRIORIDAD_UNO_ZONARURAL",
    "LUGAR"
];


// ==========================================================
// 4. CREAR PANELES LEAFLET
// ==========================================================

// El mapa debe existir previamente en mapa.js.

if (!map.getPane("panelCalor")) {
    map.createPane("panelCalor");
}

map.getPane("panelCalor").style.zIndex = 400;

map.getPane("panelCalor").style.pointerEvents = "none";


if (!map.getPane("panelServicios")) {
    map.createPane("panelServicios");
}

map.getPane("panelServicios").style.zIndex = 450;


// ==========================================================
// 5. OBTENER COORDENADAS
// ==========================================================

function obtenerCoordenadas(fila) {

    var x = Number(
        String(fila.x ?? "")
            .trim()
            .replace(",", ".")
    );

    var y = Number(
        String(fila.y ?? "")
            .trim()
            .replace(",", ".")
    );

    if (
        fila.x === null ||
        fila.y === null ||
        fila.x === "" ||
        fila.y === "" ||
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
// 6. NORMALIZAR ESTACIÓN
// ==========================================================

function normalizarEstacion(valor) {

    return String(valor ?? "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");
}


// ==========================================================
// 7. CONSULTAR SUPABASE
// ==========================================================

async function consultarPaginaServicios(inicio) {

    var fin = inicio + SUPABASE_PAGINA - 1;

    var url =
        SUPABASE_URL +
        "/rest/v1/" +
        SUPABASE_TABLA +
        "?select=*" +
        "&order=OBJECTID.asc" +
        "&offset=" + inicio +
        "&limit=" + SUPABASE_PAGINA;

    var respuesta = await fetch(url, {

        method: "GET",

        headers: {
            "apikey": SUPABASE_PUBLIC_KEY,
            "Authorization":
                "Bearer " + SUPABASE_PUBLIC_KEY,
            "Accept": "application/json"
        }

    });

    if (!respuesta.ok) {

        var detalle = await respuesta.text();

        throw new Error(
            "Supabase HTTP " +
            respuesta.status +
            ": " + detalle
        );
    }

    return await respuesta.json();
}


// ==========================================================
// 8. CARGAR TODOS LOS SERVICIOS
// ==========================================================

async function cargarServicios() {

    if (datosServicios !== null) {
        return datosServicios;
    }

    if (promesaServicios) {
        return promesaServicios;
    }

    serviciosCargando = true;

    promesaServicios = (async function() {

        var registros = [];

        var inicio = 0;

        while (true) {

            var pagina =
                await consultarPaginaServicios(inicio);

            registros.push(...pagina);

            if (pagina.length < SUPABASE_PAGINA) {
                break;
            }

            inicio += SUPABASE_PAGINA;
        }

        datosServicios = registros;

        console.log(
            "Total de servicios cargados:",
            datosServicios.length
        );

        actualizarCapasServicios();

        return datosServicios;

    })();

    try {

        return await promesaServicios;

    } catch (error) {

        datosServicios = null;

        console.error(
            "Error al consultar Supabase:",
            error
        );

        throw error;

    } finally {

        serviciosCargando = false;

        promesaServicios = null;
    }
}


// ==========================================================
// 9. ACTUALIZAR CAPAS ACTIVADAS
// ==========================================================

function actualizarCapasServicios() {

    document.querySelectorAll(
        'input[name="estaciones"]'
    ).forEach(function(checkbox) {

        var estacion =
            normalizarEstacion("ECO_" + checkbox.value);

        if (!capasServicios[estacion]) {
            capasServicios[estacion] = L.layerGroup();
        }

        if (checkbox.checked) {

            map.addLayer(capasServicios[estacion]);

            dibujarEstacion(estacion);

        } else {

            map.removeLayer(capasServicios[estacion]);
        }
    });

    var checkCalor =
        document.getElementById("heatmap");

    if (checkCalor && checkCalor.checked) {
        mostrarHeatmap(true);
    } else {
        mostrarHeatmap(false);
    }
}


// ==========================================================
// 10. MOSTRAR / OCULTAR ESTACIONES
// ==========================================================

function mostrarServicios(checkbox) {

    var estacion =
        normalizarEstacion("ECO_" + checkbox.value);

    if (!capasServicios[estacion]) {
        capasServicios[estacion] = L.layerGroup();
    }

    if (!checkbox.checked) {

        map.removeLayer(capasServicios[estacion]);

        console.log(estacion + " desactivada");

        return;
    }

    map.addLayer(capasServicios[estacion]);

    if (datosServicios !== null) {

        dibujarEstacion(estacion);

    } else {

        cargarServicios().catch(function(error) {
            console.error(error);
        });
    }
}


// ==========================================================
// 11. DIBUJAR ESTACIÓN
// ==========================================================

function dibujarEstacion(estacionSeleccionada) {

    if (datosServicios === null) return;

    var capa = capasServicios[estacionSeleccionada];

    if (!capa) return;

    capa.clearLayers();

    var contador = 0;

    datosServicios.forEach(function(fila) {

        var estacion =
            normalizarEstacion(fila.NO_ESTACION);

        if (estacion !== estacionSeleccionada) {
            return;
        }

        var coordenadas = obtenerCoordenadas(fila);

        if (!coordenadas) return;

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

        var encabezado =
            document.createElement("div");

        encabezado.className =
            "popup-encabezado";

        encabezado.textContent =
            "REPORTE DE SERVICIO DE EMERGENCIA";

        popup.appendChild(encabezado);

        var contenido =
            document.createElement("div");

        contenido.className =
            "popup-contenido";

        camposMostrar.forEach(function(campo) {

            var valor = fila[campo];

            if (
                valor === undefined ||
                valor === null ||
                String(valor).trim() === ""
            ) {
                return;
            }

            var linea =
                document.createElement("div");

            linea.className = "popup-fila";

            var etiqueta =
                document.createElement("strong");

            etiqueta.className =
                "popup-etiqueta";

            etiqueta.textContent =
                campo.replace(/_/g, " ") + ":";

            var dato =
                document.createElement("span");

            dato.className =
                "popup-valor";

            if (campo === "FECHA") {

                var fecha = new Date(valor);

                dato.textContent =
                    Number.isNaN(fecha.getTime())
                    ? String(valor)
                    : fecha.toLocaleString("es-MX");

            } else {

                dato.textContent = String(valor);
            }

            linea.appendChild(etiqueta);

            linea.appendChild(dato);

            contenido.appendChild(linea);
        });

        popup.appendChild(contenido);

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
// 12. MOSTRAR / OCULTAR MAPA DE CALOR
// ==========================================================

function mostrarHeatmap(activar) {

    if (!activar) {

        if (capaCalor) {

            map.removeLayer(capaCalor);

            capaCalor = null;
        }

        console.log("Mapa de calor desactivado");

        return;
    }

    if (typeof L.heatLayer !== "function") {

        console.error(
            "Leaflet.heat no está cargado."
        );

        return;
    }

    if (datosServicios === null) {

        cargarServicios().catch(function(error) {
            console.error(error);
        });

        return;
    }

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

    if (capaCalor) {

        map.removeLayer(capaCalor);

        capaCalor = null;
    }

    if (puntosCalor.length === 0) {
        return;
    }

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

    capaCalor.addTo(map);

    if (typeof capaCalor.redraw === "function") {
        capaCalor.redraw();
    }

    // No se modifica centro ni zoom.
}


// ==========================================================
// 13. RECARGAR DATOS DESDE SUPABASE
// ==========================================================

async function recargarServicios() {

    datosServicios = null;

    return await cargarServicios();
}


// ==========================================================
// 14. CONFIGURACIÓN INICIAL
// ==========================================================

// Estaciones desactivadas inicialmente.

document.querySelectorAll(
    'input[name="estaciones"]'
).forEach(function(checkbox) {

    checkbox.checked = false;
});


// Mapa de calor activado inicialmente.

var checkCalorInicial =
    document.getElementById("heatmap");

if (checkCalorInicial) {

    checkCalorInicial.checked = true;
}


// Cargar servicios desde Supabase.

cargarServicios().catch(function(error) {

    console.error(
        "No fue posible cargar los servicios:",
        error
    );
});


// ==========================================================
// FIN SERVICIOS.JS
// ==========================================================
