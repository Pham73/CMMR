fetch("data/mpio_dgo.geojson")

    .then(function(response) {

        return response.json();

    })

    .then(function(data) {

        console.log("GeoJSON:", data);

        console.log(
            "Número de elementos:",
            data.features.length
        );


        var capaMunicipios = L.geoJSON(
            data,
            {

                style: function(feature) {

                    return {

                        color: "red",

                        weight: 5,

                        opacity: 1,

                        fillColor: "yellow",

                        fillOpacity: 0.5

                    };

                }

            }
        ).addTo(map);


        var limites =
            capaMunicipios.getBounds();


        console.log(
            "SW:",
            limites.getSouthWest()
        );

        console.log(
            "NE:",
            limites.getNorthEast()
        );


        map.fitBounds(
            limites,
            {
                padding: [20, 20]
            }
        );


        console.log(
            "Municipios agregados al mapa"
        );

    })

    .catch(function(error) {

        console.error(error);

    });