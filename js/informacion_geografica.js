// Adaptador raster PMTiles para Leaflet. Requiere HTTP Range.
function crearCapaPMTiles(ruta, opciones) {
    var archivo = new pmtiles.PMTiles(new URL(ruta, document.baseURI).href);
    var Capa = L.GridLayer.extend({
        createTile: function(coords, done) {
            var tile = document.createElement("img");
            tile.alt = "";
            archivo.getZxy(coords.z, coords.x, coords.y).then(function(r) {
                if (!r) { tile.style.visibility = "hidden"; done(null, tile); return; }
                var url = URL.createObjectURL(new Blob([r.data], {type:"image/png"}));
                tile.onload = function(){ URL.revokeObjectURL(url); done(null,tile); };
                tile.onerror = function(){ URL.revokeObjectURL(url); done(new Error("PNG inválido"),tile); };
                tile.src = url;
            }).catch(function(error){ console.error("PMTiles:", ruta, error); done(error,tile); });
            return tile;
        }
    });
    return new Capa(opciones);
}

/* =====================================================
   CMMR - INFORMACIÓN GEOGRÁFICA BÁSICA

   1. Límite municipal
   2. Colonias y fraccionamientos
   3. Localidades
   4. Ejidos y comunidades
   5. Uso de suelo y vegetación

   Leaflet + GeoJSON
===================================================== */

// ==========================================
// CONFIGURACIÓN DE CAPAS
// ==========================================

var capasGeograficas = {

    // LÍMITE MUNICIPAL

    municipio: {
        archivo: "data/mpio_dgo.geojson",
        pane: "paneMunicipio",
        checkbox: "municipioCheck",
        activo: false,
        capa: null,
        cargando: false,

        estilo: {
            color: "#000000",
            weight: 2,
            opacity: 1,
            fill: false,
            dashArray: "6, 4"
        }
    },

    // COLONIAS Y FRACCIONAMIENTOS

    colonias: {
        archivo: "data/colonias.geojson",
        pane: "paneColonias",
        checkbox: "coloniasCheck",
        activo: true,
        capa: null,
        cargando: false,

        estilo: {
            color: "#000000",
            weight: 0.5,
            fill: false
        }
    },

    // LOCALIDADES

    localidades: {
        archivo: "data/localidades_mdgo.geojson",
        pane: "paneLocalidades",
        checkbox: "localidadesCheck",
        activo: false,
        capa: null,
        cargando: false,

        estilo: {
            radius: 4,
            color: "#000000",
            weight: 1,
            fillColor: "#2563eb",
            fillOpacity: 0.85
        }
    },

    // EJIDOS Y COMUNIDADES

    ejidos: {
        archivo: "data/Perimetrales_mDGO.geojson",
        pane: "paneEjidos",
        checkbox: "ejidosCheck",
        activo: false,
        capa: null,
        cargando: false,

        estilo: {
            color: "#795548",
            weight: 1.5,
            opacity: 1,
            fill: true,
            fillColor: "#a1887f",
            fillOpacity: 0.15
        }
    },

    // USO DE SUELO Y VEGETACIÓN

    vegetacion: {
        archivo: "data/usv250s7gw_mdgo.geojson",
        pane: "paneVegetacion",
        checkbox: "vegetacionCheck",
        activo: false,
        capa: null,
        cargando: false
    }
};

// ==========================================
// SIMBOLOGÍA DE USO DE SUELO Y VEGETACIÓN
// ==========================================

var coloresVegetacion = {

    "DESPROVISTO DE VEGETACIÓN": "#d7ccc8",

    "ASENTAMIENTOS HUMANOS": "#e53935",

    "BOSQUE CULTIVADO": "#388e3c",

    "BOSQUE DE PINO": "#005a32",

    "BOSQUE DE PINO-ENCINO": "#238443",

    "BOSQUE DE ENCINO": "#78c679",

    "BOSQUE DE ENCINO-PINO": "#41ab5d",

    "SIN VEGETACIÓN APARENTE": "#bdbdbd",

    "CUERPO DE AGUA": "#2196f3",

    "MATORRAL CRASICAULE": "#c49a45",

    "BOSQUE DE MEZQUITE": "#827717",

    "PASTIZAL HALÓFILO": "#d4e157",

    "PASTIZAL INDUCIDO": "#cddc39",

    "PASTIZAL NATURAL": "#aeea00",

    "AGRICULTURA DE RIEGO ANUAL": "#ffeb3b",

    "AGRICULTURA DE RIEGO ANUAL Y PERMANENTE": "#fdd835",

    "AGRICULTURA DE RIEGO ANUAL Y SEMIPERMANENTE": "#fbc02d",

    "AGRICULTURA DE RIEGO PERMANENTE": "#f9a825",

    "SELVA BAJA CADUCIFOLIA": "#00897b",

    "AGRICULTURA DE TEMPORAL ANUAL": "#ffcc80",

    "AGRICULTURA DE TEMPORAL PERMANENTE": "#ff9800",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE BOSQUE DE TÁSCATE": "#8d6e63",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE BOSQUE DE PINO": "#66bb6a",

    "VEGETACIÓN SECUNDARIA ARBÓREA DE BOSQUE DE PINO": "#2e7d32",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE BOSQUE DE PINO-ENCINO": "#81c784",

    "VEGETACIÓN SECUNDARIA ARBÓREA DE BOSQUE DE PINO-ENCINO": "#43a047",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE BOSQUE DE ENCINO": "#a5d6a7",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE BOSQUE DE ENCINO-PINO": "#9ccc65",

    "VEGETACIÓN SECUNDARIA ARBÓREA DE BOSQUE DE ENCINO-PINO": "#558b2f",

    "VEGETACIÓN SECUNDARIA ARBÓREA DE BOSQUE DE AYARÍN": "#004d40",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE MATORRAL CRASICAULE": "#d4b483",

    "VEGETACIÓN SECUNDARIA ARBUSTIVA DE PASTIZAL NATURAL": "#e6ee9c",

    "VEGETACIÓN SECUNDARIA ARBÓREA DE SELVA BAJA CADUCIFOLIA": "#4db6ac"
};

// ==========================================
// ORDEN DE LAS CAPAS
// ==========================================

function configurarPanelesCMMR() {

    var paneles = {

        panelCalor: 350,
        paneVegetacion: 400,
        paneIncendios: 415,
        paneEjidos: 440,
        paneColonias: 450,
        paneRedVial: 445,
        paneMunicipio: 460,
        paneLocalidades: 470,
        panelServicios: 500
    };

    for (var n in paneles) {

        var pane = map.getPane(n) ||
                   map.createPane(n);

        pane.style.zIndex = paneles[n];
    }

    map.getPane("panelCalor").style.pointerEvents = "none";

    map.getPane("paneVegetacion").style.pointerEvents = "none";

    map.getPane("paneEjidos").style.pointerEvents = "none";

    map.getPane("paneMunicipio").style.pointerEvents = "none";

    map.getPane("paneColonias").style.pointerEvents = "none";
    map.getPane("paneLocalidades").style.pointerEvents = "none";
    map.getPane("paneRedVial").style.pointerEvents = "none";
}

// ==========================================
// TEXTO SEGURO PARA HTML
// ==========================================

function escaparGeoHTML(v) {

    var d = document.createElement("div");

    d.textContent = v ?? "";

    return d.innerHTML;
}

// ==========================================
// CONTROL DE ERRORES
// ==========================================

function avisarError(config, error) {

    console.error(
        "Error cargando " + config.archivo,
        error
    );

    config.activo = false;

    var check = document.getElementById(
        config.checkbox
    );

    if (check) check.checked = false;
}

// ==========================================
// NORMALIZAR DESCRIPCIÓN DE VEGETACIÓN
// ==========================================

function obtenerDescripcionVegetacion(feature) {

    return String(

        feature?.properties?.DESCRIPCIO ??
        "SIN INFORMACIÓN"

    ).trim()
     .replace(/\s+/g, " ")
     .normalize("NFC")
     .toUpperCase();
}

// ==========================================
// ESTILO DE USO DE SUELO Y VEGETACIÓN
// ==========================================

function estiloVegetacion(feature) {

    var descripcion = obtenerDescripcionVegetacion(
        feature
    );

    return {

        color: "#555555",

        weight: 0.3,

        opacity: 0.8,

        fill: true,

        fillColor:
            coloresVegetacion[descripcion] ||
            "#cccccc",

        fillOpacity: 0.65
    };
}

// ==========================================
// PUNTO DENTRO DE UN ANILLO
// ==========================================

function puntoEnAnillo(x, y, anillo) {

    var dentro = false;

    for (
        var i = 0, j = anillo.length - 1;
        i < anillo.length;
        j = i++
    ) {

        var [xi, yi] = anillo[i];
        var [xj, yj] = anillo[j];

        if (

            (yi > y) !== (yj > y) &&

            x < (xj - xi) *
                (y - yi) /
                (yj - yi) + xi

        ) {

            dentro = !dentro;
        }
    }

    return dentro;
}

// ==========================================
// PUNTO DENTRO DE UNA GEOMETRÍA
// ==========================================

function puntoEnGeometria(ll, g) {

    var polis =

        g?.type === "Polygon"

        ? [g.coordinates]

        : g?.type === "MultiPolygon"

        ? g.coordinates

        : [];

    return polis.some(([exterior, ...huecos]) =>

        exterior &&

        puntoEnAnillo(
            ll.lng,
            ll.lat,
            exterior
        ) &&

        !huecos.some(h =>

            puntoEnAnillo(
                ll.lng,
                ll.lat,
                h
            )
        )
    );
}

// ==========================================
// BUSCAR POLÍGONO DE UNA CAPA
// ==========================================

function buscarPoligonoGeografico(tipo, ll) {

    var config = capasGeograficas[tipo];

    if (!config) return null;

    var capa = config.capa;

    if (!capa || !map.hasLayer(capa)) {

        return null;
    }

    return capa.getLayers().find(l =>

        l.getBounds &&

        l.getBounds().contains(ll) &&

        puntoEnGeometria(
            ll,
            l.feature?.geometry
        )

    ) || null;
}

// ==========================================
// BUSCAR NOMBRE DE LA COLONIA
// ==========================================

function buscarColonia(ll) {

    var hallada = buscarPoligonoGeografico(
        "colonias",
        ll
    );

    if (!hallada) return null;

    var p = hallada.feature.properties || {};

    return p.nombre ??
           p.NOMBRE ??
           "Sin nombre";
}

// ==========================================
// BUSCAR EJIDO O COMUNIDAD
// ==========================================

function buscarEjido(ll) {

    var hallada = buscarPoligonoGeografico(
        "ejidos",
        ll
    );

    if (!hallada) return null;

    var p = hallada.feature.properties || {};

    return {

        nombre: p.NOM_NUC ??
                p.nom_nuc ??
                "Sin nombre",

        tipo: p.tipo ??
              p.TIPO ??
              "Sin información"
    };
}

// ==========================================
// BUSCAR USO DE SUELO Y VEGETACIÓN
// ==========================================

function buscarVegetacion(ll) {

    var hallada = buscarPoligonoGeografico(
        "vegetacion",
        ll
    );

    if (!hallada) return null;

    return obtenerDescripcionVegetacion(
        hallada.feature
    );
}

// ==========================================
// POPUP DE INFORMACIÓN GEOGRÁFICA BÁSICA
// ==========================================

function formatoNombrePropio(valor) {
    var texto = String(valor ?? "").trim();
    if (!texto) return "Sin nombre";
    var conectores = ["de", "del", "la", "las", "los", "y", "en", "el"];
    return texto.toLocaleLowerCase("es-MX").split(/\s+/).map(function(palabra, i) {
        if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(palabra) && palabra !== "y") return palabra.toUpperCase();
        if (i > 0 && conectores.includes(palabra)) return palabra;
        return palabra.charAt(0).toLocaleUpperCase("es-MX") + palabra.slice(1);
    }).join(" ");
}

function formatoPopupGeo(titulo, contenido) {
    return '<div style="text-align:center;font-family:Arial;min-width:200px;">' +
        '<b>' + escaparGeoHTML(titulo) + ':</b><br>' + contenido + '</div>';
}

function simboloPopupGeo(color, tipo) {
    return '<span style="display:inline-block;vertical-align:middle;margin-right:5px;background:' + color + ';' +
        (tipo === 'linea' ? 'width:20px;height:3px;' : tipo === 'punto' ? 'width:9px;height:9px;border-radius:50%;' : 'width:12px;height:12px;border:1px solid #777;') + '"></span>';
}

var consultaGeoId = 0;
async function mostrarPopupMapa(e) {
    var id = ++consultaGeoId;
    var colonia = buscarColonia(e.latlng);
    var ejido = buscarEjido(e.latlng);
    var vegetacion = buscarVegetacion(e.latlng);
    var bloques = [];
    var localidad = buscarLocalidad(e.latlng);
    var vias = buscarRedVial(e.latlng);
    if (colonia) bloques.push(formatoPopupGeo('Colonias y fraccionamientos', escaparGeoHTML(formatoNombrePropio(colonia))));
    if (ejido) bloques.push(formatoPopupGeo('Ejidos y comunidades', simboloPopupGeo('#a1887f') + escaparGeoHTML(formatoNombrePropio(ejido.nombre)) + '<br>Tipo: ' + escaparGeoHTML(formatoNombrePropio(ejido.tipo))));
    if (localidad) bloques.push(formatoPopupGeo('Localidad', simboloPopupGeo('#2563eb', 'punto') + escaparGeoHTML(formatoNombrePropio(localidad))));
    if (vias.length) bloques.push(formatoPopupGeo('Red vial', vias.map(function(v) {
        return escaparGeoHTML(formatoNombrePropio(v.nombre)) + '<br>' + simboloPopupGeo(v.color, 'linea') + escaparGeoHTML(formatoNombrePropio(v.tipo));
    }).join('<br>')));
    if (vegetacion) bloques.push(formatoPopupGeo('Uso de suelo y vegetación', simboloPopupGeo(coloresVegetacion[vegetacion] || '#cccccc') + escaparGeoHTML(formatoNombrePropio(vegetacion))));
    if (typeof consultarRiesgosQuimicos === "function") {
        (await consultarRiesgosQuimicos(e.latlng)).forEach(function(riesgo) {
            bloques.push(formatoPopupGeo(riesgo.titulo,
                simboloPopupGeo(riesgo.color) + escaparGeoHTML(riesgo.nombre)));
        });
    }
    var topografia = await consultarTopografia(e.latlng);
    if (id !== consultaGeoId) return;
    topografia.forEach(function(t) {
        bloques.push(formatoPopupGeo(t.titulo, simboloPopupGeo(t.color) + escaparGeoHTML(t.texto)));
    });
    if (!bloques.length) return;
    L.popup({maxWidth:350}).setLatLng(e.latlng)
        .setContent(bloques.join('<div style="height:6px;"></div>')).openOn(map);
}

// Consulta de puntos y líneas en píxeles de pantalla.
function buscarLocalidad(ll) {
    var c = capasGeograficas.localidades;
    if (!c.activo || !c.capa || !map.hasLayer(c.capa)) return null;
    var punto = map.latLngToLayerPoint(ll), mejor = null, distancia = 8;
    c.capa.eachLayer(function(l) {
        if (!l.getLatLng) return;
        var d = punto.distanceTo(map.latLngToLayerPoint(l.getLatLng()));
        if (d > distancia) return;
        var p = l.feature?.properties || {};
        distancia = d;
        mejor = p.NOM_LOC ?? p.nom_loc ?? p.NOMBRE ?? p.nombre ?? p.NOMLOCAL ?? 'Sin nombre';
    });
    return mejor;
}

function buscarRedVial(ll) {
    var punto = map.latLngToLayerPoint(ll), resultados = [];
    Object.values(redVial.categorias).forEach(function(c) {
        if (!c.activo || !c.capa || !map.hasLayer(c.capa)) return;
        var mejor = null, distancia = 8;
        c.capa.eachLayer(function(l) {
            if (!l.closestLayerPoint || !l.getBounds) return;
            var bounds = l.getBounds();
            var a = map.latLngToLayerPoint(bounds.getNorthWest());
            var b = map.latLngToLayerPoint(bounds.getSouthEast());
            if (punto.x < Math.min(a.x,b.x)-8 || punto.x > Math.max(a.x,b.x)+8 ||
                punto.y < Math.min(a.y,b.y)-8 || punto.y > Math.max(a.y,b.y)+8) return;
            var cercano = l.closestLayerPoint(punto);
            if (!cercano || cercano.distance > distancia) return;
            distancia = cercano.distance;
            mejor = {nombre: String(l.feature?.properties?.NOMBRE ?? '').trim() || 'Sin nombre', tipo:c.nombre, color:c.color};
        });
        if (mejor) resultados.push(mejor);
    });
    return resultados;
}

// ==========================================
// MOSTRAR U OCULTAR CAPAS GEOJSON
// ==========================================

async function mostrarCapaGeografica(tipo, activo) {

    var c = capasGeograficas[tipo];

    if (!c) return;

    c.activo = Boolean(activo);

    // OCULTAR CAPA

    if (!c.activo) {

        if (c.capa && map.hasLayer(c.capa)) {

            map.removeLayer(c.capa);
        }

        return;
    }

    // EVITAR CARGAS DUPLICADAS

    if (c.cargando) return;

    try {

        // CARGAR POR PRIMERA VEZ

        if (!c.capa) {

            c.cargando = true;

            var r = await fetch(c.archivo);

            if (!r.ok) {

                throw new Error(
                    "HTTP " + r.status
                );
            }

            var geojson = await r.json();

            // SVG para localidades: evita bloquear clics sobre la red vial.
            var renderer = tipo === "localidades"
                ? L.svg({ pane: c.pane })
                : L.canvas({ pane: c.pane });

            c.capa = L.geoJSON(geojson, {

                pane: c.pane,

                renderer: renderer,

                interactive: false,

                bubblingMouseEvents: false,

                // ESTILO DE POLÍGONOS

                style: tipo === "vegetacion"

                    ? estiloVegetacion

                    : c.estilo,

                // GEOMETRÍAS DE PUNTOS

                pointToLayer: function (feature, latlng) {

                    return L.circleMarker(latlng, {

                        ...(c.estilo || {}),

                        pane: c.pane,

                        renderer: renderer,

                        interactive: false,

                        bubblingMouseEvents: false
                    });
                }
            });

            console.log(

                "CMMR: Capa cargada correctamente:",

                c.archivo
            );
        }

        // MOSTRAR CAPA

        if (c.activo && !map.hasLayer(c.capa)) {

            c.capa.addTo(map);
        }

    } catch (err) {

        avisarError(c, err);

    } finally {

        c.cargando = false;
    }
}

// ==========================================
// MOSTRAR LÍMITE MUNICIPAL
// ==========================================

function mostrarMunicipio(activo) {

    return mostrarCapaGeografica(
        "municipio",
        activo
    );
}

// ==========================================
// MOSTRAR COLONIAS Y FRACCIONAMIENTOS
// ==========================================

function mostrarColonias(activo) {

    return mostrarCapaGeografica(
        "colonias",
        activo
    );
}

// ==========================================
// MOSTRAR LOCALIDADES
// ==========================================

function mostrarLocalidades(activo) {

    return mostrarCapaGeografica(
        "localidades",
        activo
    );
}

// ==========================================
// MOSTRAR EJIDOS Y COMUNIDADES
// ==========================================

function mostrarEjidos(activo) {

    return mostrarCapaGeografica(
        "ejidos",
        activo
    );
}

// ==========================================
// MOSTRAR USO DE SUELO Y VEGETACIÓN
// ==========================================

function mostrarVegetacion(activo) {

    return mostrarCapaGeografica(
        "vegetacion",
        activo
    );
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

function iniciarInformacionGeografica() {

    if (

        typeof L === "undefined" ||

        typeof map === "undefined"

    ) return;

    configurarPanelesCMMR();

    // ESTADO INICIAL DE LAS CAPAS

    for (var tipo in capasGeograficas) {

        var c = capasGeograficas[tipo];

        var check = document.getElementById(
            c.checkbox
        );

        if (check) {

            check.checked = c.activo;
        }

        if (c.activo) {

            mostrarCapaGeografica(tipo, true);
        }
    }

    // ACTIVAR POPUP DEL MAPA

    map.off("click", mostrarPopupMapa);

    map.on("click", mostrarPopupMapa);

    console.log(

        "CMMR: Información geográfica inicializada"
    );
}

// RED VIAL: una descarga, seis subcapas independientes.
var redVial = { archivo: "data/red_vial.geojson", promesa: null, renderer: null, categorias: {} };
[
    ["AUTOPISTA", "Autopista", "#d32f2f", 3, null],
    ["PAVIMENTADA", "Pavimentada", "#f57c00", 2.5, null],
    ["VIALIDAD", "Vialidad", "#616161", 1.5, null],
    ["TERRACERIA", "Terracería", "#795548", 1.5, null],
    ["BRECHA", "Brecha", "#a1887f", 1.2, "5, 4"],
    ["VEREDA", "Vereda", "#388e3c", 1, "2, 4"]
].forEach(function(t) {
    redVial.categorias[t[0]] = { nombre:t[1], color:t[2], weight:t[3], dashArray:t[4], activo:false, capa:null };
});
function cargarRedVial() {
    if (!redVial.promesa) {
        redVial.promesa = fetch(redVial.archivo).then(function(r) {
            if (!r.ok) throw new Error("HTTP " + r.status + " " + redVial.archivo);
            return r.json();
        }).catch(function(e) { redVial.promesa = null; throw e; });
    }
    return redVial.promesa;
}
function obtenerTipoRedVial(f) {
    return String(f.properties?.layer ?? f.properties?.LAYER ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
function actualizarCheckRedVial() {
    var check = document.getElementById("redVialTodasCheck");
    if (!check) return;
    var cs = Object.values(redVial.categorias), n = cs.filter(c => c.activo).length;
    check.checked = n === cs.length;
    check.indeterminate = n > 0 && n < cs.length;
}
async function mostrarRedVial(tipo, activo) {
    var c = redVial.categorias[tipo];
    if (!c) return;
    c.activo = Boolean(activo);
    var check = document.getElementById("vial_" + tipo);
    if (check) check.checked = c.activo;
    actualizarCheckRedVial();
    try {
        if (!c.activo) {
            if (c.capa && map.hasLayer(c.capa)) map.removeLayer(c.capa);
            return;
        }
        var datos = await cargarRedVial();
        if (!c.activo) return;
        var pane = map.getPane("paneRedVial") || map.createPane("paneRedVial");
        pane.style.zIndex = 445;
        pane.style.pointerEvents = "none";
        if (!redVial.renderer) redVial.renderer = L.canvas({pane:"paneRedVial", tolerance:5});
        if (!c.capa) c.capa = L.geoJSON(datos, {
            pane:"paneRedVial", renderer:redVial.renderer, interactive:false, bubblingMouseEvents:false,
            filter:f => obtenerTipoRedVial(f) === tipo,
            style:() => ({color:c.color, weight:c.weight, dashArray:c.dashArray, opacity:0.9, fill:false})
        });
        if (!map.hasLayer(c.capa)) c.capa.addTo(map);
    } catch(e) {
        console.error("Error cargando red vial:", tipo, e);
        c.activo = false;
        if (check) check.checked = false;
    } finally { actualizarCheckRedVial(); }
}
function mostrarTodaRedVial(activo) {
    return Promise.all(Object.keys(redVial.categorias).map(tipo => mostrarRedVial(tipo, activo)));
}

// ==========================================
// EJECUTAR AL INICIAR
// ==========================================

// VARIABLES TOPOGRÁFICAS: TIFF originales, sin leyendas.
var unidadPendiente = "°"; // Cambiar a "%" si el TIFF está en porcentaje.
var capasTopograficas = {
    elevacion: {archivo:"data/01_ELEVACION.tif", nombre:"Elevación", unidad:" m s. n. m.", colores:["#245b39","#a7bd70","#d9c59c","#89634c","#f4f1eb"], z:370},
    pendiente: {archivo:"data/02_PENDIENTE.tif", nombre:"Pendiente", colores:["#ffffcc","#fed976","#fd8d3c","#e31a1c","#800026"], z:371}
};
if (typeof proj4 === "function") proj4.defs("EPSG:32613", "+proj=utm +zone=13 +datum=WGS84 +units=m +no_defs");
function colorTopografia(tipo, v, g) {
    if (!Number.isFinite(v) || v === g.noDataValue) return null;
    var c = capasTopograficas[tipo];
    var min = g.mins?.[0], max = g.maxs?.[0];
    var t = Number.isFinite(min) && max > min ? (v-min)/(max-min) : 0;
    return c.colores[Math.max(0,Math.min(4,Math.floor(t*5)))];
}
function mostrarTopografia(tipo, activo) {
    var c = capasTopograficas[tipo];
    if (!c) return;
    c.activo = Boolean(activo);
    if (!c.activo) { if(c.capa && map.hasLayer(c.capa)) map.removeLayer(c.capa); return; }
    if (!c.capa) {
        var pane = map.getPane("topo_"+tipo) || map.createPane("topo_"+tipo);
        pane.style.zIndex = c.z; pane.style.pointerEvents = "none";
        c.capa = crearCapaPMTiles("data/pmtiles/"+tipo+".pmtiles", {
            pane:"topo_"+tipo, minZoom:0, minNativeZoom:8, maxNativeZoom:14, maxZoom:22,
            opacity:0.85, keepBuffer:1, updateWhenIdle:true, noWrap:true, tms:false
        });
    }
    if (!map.hasLayer(c.capa)) c.capa.addTo(map);
}
async function cargarRasterConsulta(c) {
    if (!c.promesa) c.promesa = fetch(c.archivo).then(function(r){
        if (!r.ok) throw new Error("HTTP "+r.status+" "+c.archivo);
        return r.arrayBuffer();
    }).then(function(b){return parseGeoraster(b);}).catch(function(e){c.promesa=null;throw e;});
    return c.promesa;
}
async function consultarTopografia(ll) {
    var resultados=[];
    await Promise.all(Object.keys(capasTopograficas).map(async function(tipo){
        var c=capasTopograficas[tipo];
        if(!c.activo || !c.capa || !map.hasLayer(c.capa)) return;
        var g;
        try { g=await cargarRasterConsulta(c); } catch(e) { console.error(e); resultados.push({titulo:c.nombre,texto:"Consulta no disponible",color:"#999999"}); return; }
        if(!c.activo || !map.hasLayer(c.capa)) return;
        var x=ll.lng,y=ll.lat, epsg=Number(String(g.projection).replace(/^EPSG:/i,""));
        if(epsg===3857){var p=L.CRS.EPSG3857.project(ll); x=p.x;y=p.y;}
        else if(epsg!==4326){try{var xy=proj4("EPSG:4326","EPSG:"+epsg,[x,y]);x=xy[0];y=xy[1];}catch(e){console.warn(e);return;}}
        var col=Math.floor((x-g.xmin)/Math.abs(g.pixelWidth)), fila=Math.floor((g.ymax-y)/Math.abs(g.pixelHeight));
        if(!Number.isFinite(col)||!Number.isFinite(fila)||col<0||fila<0||col>=g.width||fila>=g.height)return;
        var v=g.values?.[0]?.[fila]?.[col];
        if(!Number.isFinite(v)||v===g.noDataValue)return;
        var color=colorTopografia(tipo,v,g); if(!color)return;
        var texto=String(v)+(tipo==="pendiente"?unidadPendiente:c.unidad||"°");
        resultados.push({titulo:c.nombre,texto:texto,color:color});
    }));
    return resultados.sort(function(a,b){return ["Elevación","Pendiente"].indexOf(a.titulo)-["Elevación","Pendiente"].indexOf(b.titulo);});
}

if (document.readyState === "loading") {

    document.addEventListener(

        "DOMContentLoaded",

        iniciarInformacionGeografica
    );

} else {

    iniciarInformacionGeografica();
}