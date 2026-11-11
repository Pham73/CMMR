
// ======================================================
// MAPA PRINCIPAL - CMMR
// Archivo: js/mapa.js
// ======================================================


// ======================================================
// 1. CREAR MAPA
// ======================================================

// Coordenadas iniciales
var latitudInicial = 24.021066;
var longitudInicial = -104.625549;
var zoomInicial = 12;

// Crear mapa
var map = L.map('map', {
    zoomControl: true,
    zoomAnimation: true
}).setView(
    [latitudInicial, longitudInicial],
    zoomInicial
);


// ======================================================
// 2. MAPA BASE - OPENSTREETMAP
// ======================================================

var osm = L.tileLayer(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }
);


// ======================================================
// 3. MAPA BASE - ESRI WORLD IMAGERY
// ======================================================

var satelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }
);


// ======================================================
// 4. MAPA BASE INICIAL
// ======================================================

// Mostrar OpenStreetMap al iniciar
osm.addTo(map);


// ======================================================
// 5. LISTA DE MAPAS BASE
// ======================================================

var mapasBase = {
    "OpenStreetMap": osm,
    "Satélite": satelite
};


// ======================================================
// 6. CONTROL DE MAPAS BASE
// ======================================================

L.control.layers(
    mapasBase,
    null,
    {
        position: "topright",
        collapsed: true
    }
).addTo(map);


// ======================================================
// 7. AJUSTAR MAPA AL ABRIR/CERRAR SIDEBAR
// SIN DESPLAZAMIENTO AUTOMÁTICO
// ======================================================

var botonSidebar =
    document.querySelector(".sidebar-toggler");

if (botonSidebar) {

    botonSidebar.addEventListener(
        "click",
        function () {

            setTimeout(function () {

                // Recalcular tamaño del contenedor
                // sin realizar desplazamiento automático
                map.invalidateSize({
                    pan: false,
                    animate: false
                });

            }, 300);

        }
    );
}


// ======================================================
// 8. MOSTRAR COORDENADAS Y ZOOM EN CONSOLA
// ======================================================

map.on("moveend zoomend", function () {

    var centro = map.getCenter();

    console.log(
        "Centro:",
        centro.lat.toFixed(6),
        centro.lng.toFixed(6),
        "| Zoom:",
        map.getZoom()
    );

});


// ======================================================
// 9. CONFIRMAR INICIALIZACIÓN
// ======================================================

console.log("Mapa CMMR inicializado correctamente.");


// Mostrar coordenadas al mover el cursor
var coordenadas = L.control({ position: 'bottomleft' });

coordenadas.onAdd = function(map) {
    this.div = L.DomUtil.create('div', 'coordenadas');
    this.div.innerHTML = 'Latitud: -- | Longitud: --';
    return this.div;
};

coordenadas.addTo(map);

map.on('mousemove', function(e) {

    var lat = e.latlng.lat.toFixed(6);
    var lon = e.latlng.lng.toFixed(6);

    coordenadas.div.innerHTML =
        'Latitud: ' + lat + ' | Longitud: ' + lon;

});

