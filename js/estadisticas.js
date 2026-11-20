
'use strict';

// ======================================================
// CMMR - ESTADÍSTICAS DE SERVICIOS POR TS
// Reporte mensual: columnas por día
// Acumulado anual: columnas por mes
// ======================================================

// 1. CONEXIÓN SUPABASE

const SUPABASE_URL =
    'https://quqpxsxwieqievqkccpn.supabase.co';

const SUPABASE_PUBLIC_KEY =
    'sb_publishable_ClvmTbRa6ursKGP0tnYgpw_9V9fe-nB';

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY
);

// 2. CONFIGURACIÓN

const $ = id => document.getElementById(id);

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const HOY = new Date();

function normalizar(valor) {
    return String(valor ?? '')
        .trim()
        .toUpperCase()
        .replace(/[\s_-]+/g, '');
}

function escapar(valor) {
    return String(valor ?? '').replace(
        /[&<>"']/g,
        c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c])
    );
}

function mostrarEstado(mensaje, tipo = 'secondary') {
    const elemento = $('estado');

    elemento.className = 'alert alert-' + tipo;
    elemento.textContent = mensaje;
}

function numeroTS(ts) {
    return Number(
        String(ts ?? '').match(/\d+/)?.[0] ?? 99999
    );
}

// 3. CLASIFICACIÓN POR PRIORIDAD

function obtenerGrupo(tipo) {
    const zona = normalizar(tipo.zona);
    const prioridad = Number(tipo.prioridad);

    if (zona === 'RURAL') return 4;

    if ([1, 2, 3].includes(prioridad)) {
        return prioridad;
    }

    return 0;
}

function nombreGrupo(grupo) {
    if (grupo === 4) return 'PRIORIDAD 1 RURAL';

    return 'PRIORIDAD ' + grupo;
}

// 4. CARGAR AÑOS Y MESES

function inicializarFiltros() {
    const selectorAnio = $('anio');
    const selectorMes = $('mes');

    selectorAnio.innerHTML = '';
    selectorMes.innerHTML = '';

    for (
        let anio = HOY.getFullYear();
        anio >= 2026;
        anio--
    ) {
        selectorAnio.add(new Option(anio, anio));
    }

    // Acumulado anual
    selectorMes.add(
        new Option('Acumulado anual', 'acumulado')
    );

    // Meses individuales
    MESES.forEach((nombre, indice) => {
        selectorMes.add(
            new Option(nombre, String(indice + 1))
        );
    });

    selectorAnio.value = String(HOY.getFullYear());

    // Mostrar inicialmente el mes actual
    selectorMes.value = String(HOY.getMonth() + 1);
}

// 5. CONSULTAR SUPABASE CON PAGINACIÓN

async function consultarTodo(
    tabla,
    columnas,
    configurarConsulta
) {
    const registros = [];

    for (let desde = 0; ; desde += 1000) {
        let consulta = db
            .from(tabla)
            .select(columnas)
            .range(desde, desde + 999);

        if (configurarConsulta) {
            consulta = configurarConsulta(consulta);
        }

        const { data, error } = await consulta;

        if (error) {
            throw error;
        }

        registros.push(...(data || []));

        if (!data || data.length < 1000) {
            break;
        }
    }

    return registros;
}

// 6. CALCULAR PERIODO

function obtenerPeriodo() {
    const anio = Number($('anio').value);
    const valorMes = $('mes').value;

    const acumulado = valorMes === 'acumulado';

    if (acumulado) {
        return {
            anio,
            acumulado: true,
            mes: null,
            inicio: `${anio}-01-01`,
            fin: `${anio + 1}-01-01`,
            columnas: 12,
            titulo: `Acumulado anual ${anio}`
        };
    }

    const mes = Number(valorMes);

    const dias = new Date(anio, mes, 0).getDate();

    const inicio =
        `${anio}-${String(mes).padStart(2, '0')}-01`;

    const fin = mes === 12
        ? `${anio + 1}-01-01`
        : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

    return {
        anio,
        acumulado: false,
        mes,
        inicio,
        fin,
        columnas: dias,
        titulo: `${MESES[mes - 1]} ${anio}`
    };
}

// 7. CREAR ENCABEZADO

function crearEncabezado(periodo) {
    const encabezados = [];

    if (periodo.acumulado) {
        for (let i = 0; i < 12; i++) {
            encabezados.push(
                `<th>${MESES[i].slice(0, 3)}</th>`
            );
        }
    } else {
        for (let dia = 1; dia <= 31; dia++) {
            encabezados.push(`<th>${dia}</th>`);
        }
    }

    $('cabeceraTS').innerHTML = `
        <tr>
            <th class="codigo">TS</th>
            <th class="descripcion">TIPO DE SERVICIO</th>
            ${encabezados.join('')}
            <th>TOTAL</th>
        </tr>
    `;
}

// 8. CREAR CELDAS DE CONTEO

function crearCeldas(valores, periodo) {
    const cantidad = periodo.acumulado ? 12 : 31;

    let html = '';

    for (let i = 0; i < cantidad; i++) {
        if (
            !periodo.acumulado &&
            i >= periodo.columnas
        ) {
            html += '<td class="fuera-mes">—</td>';
        } else {
            html += `
                <td class="numero">
                    ${valores[i] || ''}
                </td>
            `;
        }
    }

    return html;
}

// 9. ACTUALIZAR ESTADÍSTICAS

let consultaEnCurso = false;

async function actualizarEstadisticas() {
    if (consultaEnCurso) return;

    consultaEnCurso = true;
    $('actualizar').disabled = true;

    try {
        const periodo = obtenerPeriodo();

        mostrarEstado(
            'Consultando servicios de emergencia...'
        );

        // Consultar catálogo TS y vista pública
        const [catalogo, registros] = await Promise.all([

            consultarTodo(
                'tipos_servicio',
                'ts,servicios,prioridad,zona',
                q => q.order('ts')
            ),

            consultarTodo(
                'servicios_mapa_publico',
                'OBJECTID,FECHA,TS,NO_ESTACION',
                q => q
                    .gte('FECHA', periodo.inicio)
                    .lt('FECHA', periodo.fin)
                    .order('OBJECTID')
            )

        ]);

        if (catalogo.length === 0) {
            throw new Error(
                'No se encontraron tipos de servicio.'
            );
        }

        // Filtros
        const estacion = normalizar(
            $('estacion').value
        );

        const zona = normalizar(
            $('zona').value
        );

        // Catálogo por código TS
        const catalogoPorTS = new Map();

        catalogo.forEach(tipo => {
            catalogoPorTS.set(
                normalizar(tipo.ts),
                tipo
            );
        });

        // Contadores
        const longitud = periodo.acumulado ? 12 : 31;

        const conteos = new Map();
        const subtotales = new Map();

        const totalesColumnas =
            Array(longitud).fill(0);

        let total = 0;
        let sinClasificar = 0;
        let registrosFiltrados = 0;

        // 10. PROCESAR REGISTROS

        for (const registro of registros) {

            // Filtrar estación
            if (
                estacion &&
                normalizar(registro.NO_ESTACION) !== estacion
            ) {
                continue;
            }

            registrosFiltrados++;

            // Identificar tipo de servicio
            const tipo = catalogoPorTS.get(
                normalizar(registro.TS)
            );

            if (!tipo || !obtenerGrupo(tipo)) {
                sinClasificar++;
                continue;
            }

            // Filtrar zona
            if (
                zona &&
                normalizar(tipo.zona) !== zona
            ) {
                continue;
            }

            const fecha = String(
                registro.FECHA ?? ''
            );

            const mesRegistro = Number(
                fecha.slice(5, 7)
            );

            const diaRegistro = Number(
                fecha.slice(8, 10)
            );

            // Acumulado: índice del mes
            // Mensual: índice del día
            const indice = periodo.acumulado
                ? mesRegistro - 1
                : diaRegistro - 1;

            if (
                !Number.isInteger(indice) ||
                indice < 0 ||
                indice >= longitud
            ) {
                continue;
            }

            const codigo = normalizar(tipo.ts);
            const grupo = obtenerGrupo(tipo);

            if (!conteos.has(codigo)) {
                conteos.set(
                    codigo,
                    Array(longitud).fill(0)
                );
            }

            if (!subtotales.has(grupo)) {
                subtotales.set(
                    grupo,
                    Array(longitud).fill(0)
                );
            }

            conteos.get(codigo)[indice]++;

            subtotales.get(grupo)[indice]++;

            totalesColumnas[indice]++;

            total++;
        }

        // 11. RESUMEN GENERAL

        $('periodo').textContent = periodo.titulo;

        $('total').textContent =
            total.toLocaleString('es-MX');

        $('sinClasificar').textContent =
            sinClasificar > 0
                ? `· ${sinClasificar} registros sin TS reconocido`
                : '';

        // 12. ENCABEZADO DE TABLA

        crearEncabezado(periodo);

        // 13. GENERAR FILAS POR PRIORIDAD

        let html = '';

        for (let grupo = 1; grupo <= 4; grupo++) {

            const tipos = catalogo
                .filter(tipo => {
                    return (
                        obtenerGrupo(tipo) === grupo &&
                        (
                            !zona ||
                            normalizar(tipo.zona) === zona
                        )
                    );
                })
                .sort(
                    (a, b) =>
                        numeroTS(a.ts) - numeroTS(b.ts)
                );

            if (tipos.length === 0) continue;

            // Cada tipo de servicio
            for (const tipo of tipos) {

                const codigo = normalizar(tipo.ts);

                const valores =
                    conteos.get(codigo) ||
                    Array(longitud).fill(0);

                const suma = valores.reduce(
                    (a, b) => a + b,
                    0
                );

                html += `
                    <tr class="grupo-${grupo}">

                        <td class="codigo">
                            ${escapar(tipo.ts)}
                        </td>

                        <td class="descripcion">
                            ${escapar(tipo.servicios)}
                        </td>

                        ${crearCeldas(valores, periodo)}

                        <td>
                            <strong>${suma}</strong>
                        </td>

                    </tr>
                `;
            }

            // Subtotal por prioridad
            const valoresGrupo =
                subtotales.get(grupo) ||
                Array(longitud).fill(0);

            const sumaGrupo = valoresGrupo.reduce(
                (a, b) => a + b,
                0
            );

            html += `
                <tr class="subtotal">

                    <td colspan="2" class="descripcion">
                        TOTAL ${nombreGrupo(grupo)}
                    </td>

                    ${crearCeldas(valoresGrupo, periodo)}

                    <td>${sumaGrupo}</td>

                </tr>
            `;
        }

        // 14. TOTAL GENERAL

        html += `
            <tr class="gran-total">

                <td colspan="2" class="descripcion">
                    TOTAL GENERAL
                </td>

                ${crearCeldas(
                    totalesColumnas,
                    periodo
                )}

                <td>${total}</td>

            </tr>
        `;

        $('cuerpoTS').innerHTML = html;

        // 15. ESTADO FINAL

        mostrarEstado(
            `Consulta completa: ${catalogo.length} tipos TS; ` +
            `${registros.length} registros consultados; ` +
            `${total} servicios contabilizados.`,
            'success'
        );

    } catch (error) {

        console.error(
            'Error en estadísticas CMMR:',
            error
        );

        mostrarEstado(
            'Error al consultar Supabase: ' +
            error.message,
            'danger'
        );

    } finally {

        $('actualizar').disabled = false;
        consultaEnCurso = false;

    }
}

// 16. EVENTOS

document.addEventListener('DOMContentLoaded', () => {

    inicializarFiltros();

    $('actualizar').addEventListener(
        'click',
        actualizarEstadisticas
    );

    ['anio', 'mes', 'estacion', 'zona'].forEach(id => {

        $(id).addEventListener(
            'change',
            actualizarEstadisticas
        );

    });

    actualizarEstadisticas();

});
