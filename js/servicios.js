
/* ==========================================
   CMMR - SERVICIOS
   CSV: data/servicios.csv
   COORDENADAS: x, y
   FILTRO: NO_ESTACION
   VALORES: ECO_1 a ECO_5
========================================== */

var capasServicios = {};
var datosServicios = null;
var serviciosCargando = false;

// ==========================================
// MOSTRAR / OCULTAR ESTACIÓN
// ==========================================

function mostrarServicios(checkbox) {

    var numero = checkbox.value;
    var estacion = "ECO_" + numero;

    // Crear capa independiente
    if (!capasServicios[estacion]) {
        capasServicios[estacion] = L.layerGroup();
    }

    // Ocultar estación
    if (!checkbox.checked) {
        map.removeLayer(capasServicios[estacion]);
        return;
    }

    // Mostrar estación
    map.addLayer(capasServicios[estacion]);

    // Si ya se cargó el CSV
    if (datosServicios !== null) {
        dibujarEstacion(estacion);
        return;
    }

    // Evitar cargar varias veces
    if (serviciosCargando) return;

    serviciosCargando = true;

    // ======================================
    // LEER CSV
    // ======================================

    Papa.parse("data/servicios.csv", {

        download: true,
        header: true,
        skipEmptyLines: true,
        delimiter: "",

        transformHeader: function(header) {
            return header.replace(/^\uFEFF/, "").trim();
        },

        complete: function(resultado) {

            datosServicios = resultado.data;
            serviciosCargando = false;

            console.log("Columnas:", resultado.meta.fields);
            console.log("Registros:", datosServicios.length);

            // Dibujar todas las estaciones activadas
            document.querySelectorAll(
                'input[name="estaciones"]:checked'
            ).forEach(function(input) {

                var codigo = "ECO_" + input.value;

                if (!capasServicios[codigo]) {
                    capasServicios[codigo] = L.layerGroup();
                }

                capasServicios[codigo].addTo(map);
                dibujarEstacion(codigo);
            });
        },

        error: function(error) {
            serviciosCargando = false;
            console.error("Error CSV:", error);
        }
    });
}

// ==========================================
// DIBUJAR ESTACIÓN
// ==========================================

function dibujarEstacion(estacionSeleccionada) {

    var capa = capasServicios[estacionSeleccionada];

    capa.clearLayers();

    var puntos = [];

    datosServicios.forEach(function(fila) {

        // FILTRO POR ESTACIÓN
        var estacion = String(fila.NO_ESTACION ?? "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");

        if (estacion !== estacionSeleccionada) return;

        // COORDENADAS
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

        if (!Number.isFinite(x) ||
            !Number.isFinite(y) ||
            Math.abs(x) > 180 ||
            Math.abs(y) > 90) return;

        // MARCADOR
        var marcador = L.circleMarker([y, x], {
            radius: 4,
            color: "#dc2626",
            weight: 1,
            fillColor: "#ef4444",
            fillOpacity: 0.85
        });

        // POPUP CON TODOS LOS ATRIBUTOS
        var popup = document.createElement("div");

        Object.entries(fila).forEach(function(entrada) {

            var linea = document.createElement("div");
            var etiqueta = document.createElement("strong");

            etiqueta.textContent = entrada[0] + ": ";

            linea.appendChild(etiqueta);

            linea.appendChild(
                document.createTextNode(
                    String(entrada[1] ?? "")
                )
            );

            popup.appendChild(linea);
        });

        marcador.bindPopup(popup);
        marcador.addTo(capa);

        puntos.push([y, x]);
    });

    console.log(
        estacionSeleccionada + " - Puntos:", puntos.length
    );

// ==========================================
// MANTENER LA VISTA ACTUAL DEL MAPA
// ==========================================

console.log(
    estacionSeleccionada + " - Puntos:", puntos.length
);

} // Cierre de la función dibujarEstacion()

// ==========================================
// INICIAR TODAS LAS ESTACIONES ACTIVADAS
// ==========================================

document.querySelectorAll('input[name="estaciones"]').forEach(function(checkbox) {

    checkbox.checked = true;

    mostrarServicios(checkbox);

});

// ==========================================
// INICIAR TODAS LAS ESTACIONES ACTIVADAS
// ==========================================

document.querySelectorAll('input[name="estaciones"]').forEach(function(checkbox) {

    checkbox.checked = true;

    mostrarServicios(checkbox);

});
