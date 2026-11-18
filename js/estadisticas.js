
/* CMMR - ESTADÍSTICAS DESDE SUPABASE */

// CONFIGURACIÓN
const SUPABASE_URL = "https://quqpxsxwieqievqkccpn.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_ClvmTbRa6ursKGP0tnYgpw_9V9fe-nB";

const TABLA = "servicios_mapa_publico";

const CAMPOS = [
    "OBJECTID",
    "FECHA",
    "NO_ESTACION",
    "ZONA",
    "SERVICIOS_PRIORIDAD_UNO",
    "SERVICIOS_PRIORIDAD_DOS",
    "SERVICIOS_PRIORIDAD_TRES",
    "SERVICIOS_PRIORIDAD_UNO_ZONARURAL"
].join(",");

const TAMANO_PAGINA = 1000;
const graficas = {};
let registros = [];

const $ = id => document.getElementById(id);

const texto = valor => String(valor ?? "").trim();

const tieneDato = valor => {
    const s = texto(valor).toLowerCase();
    return s !== "" &&
        !["null", "n/a", "ninguno", "sin datos", "0", "no"].includes(s);
};

const claves = {
    uno: "SERVICIOS_PRIORIDAD_UNO",
    dos: "SERVICIOS_PRIORIDAD_DOS",
    tres: "SERVICIOS_PRIORIDAD_TRES",
    rural: "SERVICIOS_PRIORIDAD_UNO_ZONARURAL"
};

// FECHAS
function fechaPartes(valor) {
    const m = texto(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);

    return m ? {
        anio: m[1],
        mes: Number(m[2])
    } : null;
}

// MENSAJES
function estado(mensaje, error = false) {
    $("estado").className =
        "alert " + (error ? "alert-danger" : "alert-secondary");

    $("estado").textContent = mensaje;
}

// FILTROS
function llenarFiltro(id, valores) {
    const select = $(id);
    const anterior = select.value;

    select.replaceChildren(
        new Option(id === "anio" ? "Todos" : "Todas", "")
    );

    valores.forEach(v => select.add(new Option(v, v)));

    if ([...select.options].some(o => o.value === anterior)) {
        select.value = anterior;
    }
}

function prepararFiltros() {
    const unicos = campo =>
        [...new Set(
            registros.map(r => texto(r[campo])).filter(Boolean)
        )].sort((a, b) =>
            a.localeCompare(b, "es", { numeric: true })
        );

    const anios = [...new Set(
        registros.map(r => fechaPartes(r.FECHA)?.anio)
            .filter(Boolean)
    )].sort().reverse();

    llenarFiltro("anio", anios);
    llenarFiltro("estacion", unicos("NO_ESTACION"));
    llenarFiltro("zona", unicos("ZONA"));
}

// CONTAR REGISTROS
function contarPor(datos, obtenerClave) {
    const conteo = new Map();

    datos.forEach(r => {
        const clave = obtenerClave(r) || "Sin especificar";

        conteo.set(
            clave,
            (conteo.get(clave) || 0) + 1
        );
    });

    return conteo;
}

// CREAR GRÁFICAS
function dibujar(id, tipo, etiquetas, valores, colores) {

    if (graficas[id]) {
        graficas[id].destroy();
    }

    graficas[id] = new Chart($(id), {
        type: tipo,

        data: {
            labels: etiquetas,
            datasets: [{
                label: "Servicios",
                data: valores,
                backgroundColor: colores || "#20a7ba",
                borderColor: "#20a7ba",
                borderWidth: tipo === "line" ? 2 : 1,
                fill: false,
                tension: 0.25
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: tipo === "doughnut"
                }
            },

            scales: tipo === "doughnut" ? {} : {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

// ACTUALIZAR ESTADÍSTICAS
function actualizarGraficas() {

    const anio = $("anio").value;
    const estacion = $("estacion").value;
    const zona = $("zona").value;
    const prioridad = $("prioridad").value;

    const datos = registros.filter(r =>
        (!anio || fechaPartes(r.FECHA)?.anio === anio) &&
        (!estacion || texto(r.NO_ESTACION) === estacion) &&
        (!zona || texto(r.ZONA) === zona) &&
        (!prioridad || tieneDato(r[claves[prioridad]]))
    );

    // INDICADORES
    $("total").textContent =
        datos.length.toLocaleString("es-MX");

    $("estaciones").textContent =
        new Set(
            datos.map(r => texto(r.NO_ESTACION)).filter(Boolean)
        ).size;

    $("zonas").textContent =
        new Set(
            datos.map(r => texto(r.ZONA)).filter(Boolean)
        ).size;

    $("p1").textContent =
        datos.filter(r =>
            tieneDato(r.SERVICIOS_PRIORIDAD_UNO)
        ).length.toLocaleString("es-MX");

    // GRÁFICA POR ESTACIÓN
    const porEstacion = [
        ...contarPor(datos, r => texto(r.NO_ESTACION)).entries()
    ].sort((a, b) =>
        a[0].localeCompare(b[0], "es", { numeric: true })
    );

    dibujar(
        "graficaEstacion",
        "bar",
        porEstacion.map(x => x[0]),
        porEstacion.map(x => x[1])
    );

    // GRÁFICA MENSUAL
    const meses = Array(12).fill(0);

    datos.forEach(r => {
        const f = fechaPartes(r.FECHA);

        if (f && f.mes >= 1 && f.mes <= 12) {
            meses[f.mes - 1]++;
        }
    });

    dibujar(
        "graficaMes",
        "line",
        ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
         "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
        meses
    );

    // GRÁFICA POR ZONA
    const porZona = [
        ...contarPor(datos, r => texto(r.ZONA)).entries()
    ].sort((a, b) => b[1] - a[1]);

    dibujar(
        "graficaZona",
        "bar",
        porZona.map(x => x[0]),
        porZona.map(x => x[1])
    );

    // GRÁFICA POR PRIORIDAD
    const etiquetas = [
        "Prioridad 1",
        "Prioridad 2",
        "Prioridad 3",
        "Prioridad 1 rural"
    ];

    const valores = Object.values(claves).map(campo =>
        datos.filter(r => tieneDato(r[campo])).length
    );

    dibujar(
        "graficaPrioridad",
        "doughnut",
        etiquetas,
        valores,
        ["#dc3545", "#fd7e14", "#198754", "#6f42c1"]
    );
}

// CONSULTAR SUPABASE
async function cargarDatos() {

    if (!window.supabase?.createClient) {
        estado("No se cargó la biblioteca de Supabase.", true);
        return;
    }

    if (
        SUPABASE_URL.startsWith("PEGA_") ||
        SUPABASE_PUBLIC_KEY.startsWith("PEGA_")
    ) {
        estado(
            "Configura la URL y la clave pública de Supabase.",
            true
        );
        return;
    }

    $("actualizar").disabled = true;
    estado("Consultando servicios en Supabase...");

    try {

        const cliente = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLIC_KEY
        );

        const nuevos = [];
        let desde = 0;

        while (true) {

            const { data, error } = await cliente
                .from(TABLA)
                .select(CAMPOS)
                .order("OBJECTID", { ascending: true })
                .range(
                    desde,
                    desde + TAMANO_PAGINA - 1
                );

            if (error) throw error;

            nuevos.push(...(data || []));

            if (!data || data.length < TAMANO_PAGINA) {
                break;
            }

            desde += TAMANO_PAGINA;

            estado(
                `Consultando servicios... ${nuevos.length} registros`
            );
        }

        registros = nuevos;

        prepararFiltros();
        actualizarGraficas();

        estado(
            `${registros.length.toLocaleString("es-MX")} registros consultados correctamente.`
        );

    } catch (error) {

        console.error("Error de Supabase:", error);

        estado(
            "Error al consultar Supabase: " +
            error.message +
            ". Revisa URL, clave pública y permisos RLS.",
            true
        );

    } finally {
        $("actualizar").disabled = false;
    }
}

// EVENTOS
["anio", "estacion", "zona", "prioridad"].forEach(id => {
    $(id).addEventListener("change", actualizarGraficas);
});

$("actualizar").addEventListener("click", cargarDatos);

// INICIAR
cargarDatos();
