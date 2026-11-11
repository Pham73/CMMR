// ======================================================
// BUSQUEDA DE COORDENADAS
// Archivo: coordenadas.js
// ======================================================

// Formatos aceptados:
//
// 1. Grados decimales con coma:
// 24.046536, -104.632025
//
// 2. Grados decimales con espacio:
// 24.046536 -104.632025
//
// 3. GMS con símbolos:
// 24°02'47.5"N, 104°37'55.3"W
//
// 4. GMS sin símbolos con coma:
// 24 02 47.5, -104 37 55.3
//
// 5. GMS sin símbolos sin coma:
// 24 02 47.5 -104 37 55.3


var marcadorBusqueda;


// ======================================================
// CONVERTIR GMS A GRADOS DECIMALES
// ======================================================

function gmsDecimal(grados, minutos, segundos, direccion = "") {

    grados = parseFloat(grados);
    minutos = parseFloat(minutos);
    segundos = parseFloat(segundos);

    // Validar minutos y segundos
    if (
        minutos < 0 ||
        minutos >= 60 ||
        segundos < 0 ||
        segundos >= 60
    ) {
        return null;
    }

    var decimal =
        Math.abs(grados) +
        (minutos / 60) +
        (segundos / 3600);

    // Si los grados ya vienen negativos
    if (grados < 0) {
        decimal = -decimal;
    }

    direccion = direccion.toUpperCase();

    // Aplicar dirección
    if (direccion === "S" || direccion === "W") {
        decimal = -Math.abs(decimal);
    }

    if (direccion === "N" || direccion === "E") {
        decimal = Math.abs(decimal);
    }

    return decimal;
}


// ======================================================
// FUNCION PRINCIPAL DE BUSQUEDA
// ======================================================

function buscarCoordenadas() {

    var input = document.getElementById("coordenadas");

    if (!input) {
        console.error("No existe el elemento con id='coordenadas'");
        return;
    }

    var texto = input.value.trim();

    if (texto === "") {
        alert("Escribe una coordenada.");
        return;
    }

    // Eliminar espacios múltiples
    texto = texto.replace(/\s+/g, " ");

    var latitud;
    var longitud;


    // ==================================================
    // FORMATO 1
    // DECIMAL CON COMA
    // 24.046536, -104.632025
    // ==================================================

    var decimalComa = texto.match(
        /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/
    );

    if (decimalComa) {

        latitud = parseFloat(decimalComa[1]);
        longitud = parseFloat(decimalComa[2]);

    }


    // ==================================================
    // FORMATO 2
    // DECIMAL CON ESPACIO
    // 24.046536 -104.632025
    // ==================================================

    if (latitud === undefined) {

        var decimalEspacio = texto.match(
            /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/
        );

        if (decimalEspacio) {

            latitud = parseFloat(decimalEspacio[1]);
            longitud = parseFloat(decimalEspacio[2]);

        }

    }


    // ==================================================
    // FORMATO 3
    // GMS CON SIMBOLOS
    // 24°02'47.5"N, 104°37'55.3"W
    // ==================================================

    if (latitud === undefined) {

        var gmsSimbolos = texto.match(
            /^(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*([NS])\s*,?\s*(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?\s*([EW])$/i
        );

        if (gmsSimbolos) {

            latitud = gmsDecimal(
                gmsSimbolos[1],
                gmsSimbolos[2],
                gmsSimbolos[3],
                gmsSimbolos[4]
            );

            longitud = gmsDecimal(
                gmsSimbolos[5],
                gmsSimbolos[6],
                gmsSimbolos[7],
                gmsSimbolos[8]
            );

        }

    }


    // ==================================================
    // FORMATO 4
    // GMS SIN SIMBOLOS CON COMA
    // 24 02 47.5, -104 37 55.3
    // ==================================================

    if (latitud === undefined) {

        var gmsComa = texto.match(
            /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/
        );

        if (gmsComa) {

            latitud = gmsDecimal(
                gmsComa[1],
                gmsComa[2],
                gmsComa[3]
            );

            longitud = gmsDecimal(
                gmsComa[4],
                gmsComa[5],
                gmsComa[6]
            );

        }

    }


    // ==================================================
    // FORMATO 5
    // GMS SIN SIMBOLOS SIN COMA
    // 24 02 47.5 -104 37 55.3
    // ==================================================

    if (latitud === undefined) {

        var gmsEspacio = texto.match(
            /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/
        );

        if (gmsEspacio) {

            latitud = gmsDecimal(
                gmsEspacio[1],
                gmsEspacio[2],
                gmsEspacio[3]
            );

            longitud = gmsDecimal(
                gmsEspacio[4],
                gmsEspacio[5],
                gmsEspacio[6]
            );

        }

    }


    // ==================================================
    // VALIDAR FORMATO
    // ==================================================

    if (
        latitud === undefined ||
        longitud === undefined ||
        latitud === null ||
        longitud === null ||
        isNaN(latitud) ||
        isNaN(longitud)
    ) {

        alert(
            "Formato de coordenadas no reconocido.\n\n" +

            "Ejemplos:\n\n" +

            "24.046536, -104.632025\n" +

            "24.046536 -104.632025\n" +

            "24°02'47.5\"N, 104°37'55.3\"W\n" +

            "24 02 47.5, -104 37 55.3\n" +

            "24 02 47.5 -104 37 55.3"
        );

        return;
    }


    // ==================================================
    // VALIDAR RANGOS
    // ==================================================

    if (
        latitud < -90 ||
        latitud > 90
    ) {

        alert("La latitud debe estar entre -90 y 90.");
        return;

    }

    if (
        longitud < -180 ||
        longitud > 180
    ) {

        alert("La longitud debe estar entre -180 y 180.");
        return;

    }


    // ==================================================
    // VALIDAR QUE EL MAPA EXISTA
    // ==================================================

    if (typeof map === "undefined") {

        console.error(
            "La variable 'map' no existe. Debes crear el mapa antes de cargar coordenadas.js"
        );

        return;
    }


    // ==================================================
    // MOVER MAPA
    // ==================================================

    map.setView(
        [latitud, longitud],
        12
    );


    // ==================================================
    // ELIMINAR MARCADOR DE BUSQUEDA ANTERIOR
    // ==================================================

    if (marcadorBusqueda) {

        map.removeLayer(marcadorBusqueda);

    }


    // ==================================================
    // CREAR NUEVO MARCADOR
    // ==================================================

    marcadorBusqueda = L.marker(
        [latitud, longitud]
    ).addTo(map);


    // ==================================================
    // MOSTRAR POPUP
    // ==================================================

    marcadorBusqueda
        .bindPopup(
            "<b>Ubicación encontrada</b><br>" +
            "Latitud: " + latitud.toFixed(6) + "<br>" +
            "Longitud: " + longitud.toFixed(6)
        )
        .openPopup();

}


// ======================================================
// BUSCAR AL PRESIONAR ENTER
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        var input = document.getElementById("coordenadas");

        if (!input) {

            console.error(
                "No existe el input con id='coordenadas'"
            );

            return;
        }

        input.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    buscarCoordenadas();

                }

            }
        );

    }
);