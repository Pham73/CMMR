/* =====================================================
   CMMR - FUENTES DE INFORMACIÓN CARTOGRÁFICA
===================================================== */

const fuentesCMMR = {

    municipioCheck: "INEGI",

    coloniasCheck: "Municipio de Durango",

    localidadesCheck: "INEGI",

    ejidosCheck: "RAN",

    redVialTodasCheck: "INEGI",

    vial_AUTOPISTA: "INEGI",
    vial_PAVIMENTADA: "INEGI",
    vial_VIALIDAD: "INEGI",
    vial_TERRACERIA: "INEGI",
    vial_BRECHA: "INEGI",
    vial_VEREDA: "INEGI",

    vegetacionCheck: "INEGI",

    elevacionCheck: "INEGI",

    pendienteCheck: "INEGI",

    areasPrioritariasCheck:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    incendiosForestalesCheck: "CONAFOR",

    atlas_8_0:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    atlas_8_1:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    atlas_8_2:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    atlas_8_3:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    atlas_8_4:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR",

    heatmap:
        "Municipio de Durango – Dirección Municipal de Protección Civil – CMMR"
};

let atribucionFuentesCMMR = "";

// ==========================================
// ACTUALIZAR FUENTES
// ==========================================

function actualizarFuentesCMMR() {

    const fuentesActivas = new Set();

    Object.entries(fuentesCMMR).forEach(
        ([id, fuente]) => {

            const checkbox = document.getElementById(id);

            if (checkbox && checkbox.checked) {

                fuentesActivas.add(fuente);

            }

        }
    );

    // Eliminar atribución anterior

    if (atribucionFuentesCMMR) {

        map.attributionControl.removeAttribution(
            atribucionFuentesCMMR
        );

    }

    // Incorporar fuentes activas

    atribucionFuentesCMMR = fuentesActivas.size

        ? "<b>Fuentes:</b> " +
          Array.from(fuentesActivas).join(" | ")

        : "";

    if (atribucionFuentesCMMR) {

        map.attributionControl.addAttribution(
            atribucionFuentesCMMR
        );

    }

}

// ==========================================
// INICIALIZACIÓN
// ==========================================

function iniciarFuentesCMMR() {

    if (typeof map === "undefined") return;

    if (!map.attributionControl) {

        L.control.attribution({
            position: "bottomright"
        }).addTo(map);

    }

    document.addEventListener("change", function(e) {

        if (e.target.type === "checkbox") {

            setTimeout(actualizarFuentesCMMR, 100);

        }

    });

    map.on("layeradd layerremove", function() {

        setTimeout(actualizarFuentesCMMR, 100);

    });

    actualizarFuentesCMMR();

}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarFuentesCMMR
    );

} else {

    iniciarFuentesCMMR();

}