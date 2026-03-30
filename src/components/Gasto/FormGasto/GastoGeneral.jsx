import { useCallback, useEffect, useState } from "react";
import { getDropdownOptionsPolitica } from "../../../services/politica";
import { getDropdownOptionsCategoria } from "../../../services/categoria";
import { getDropdownOptionsCentroCosto } from "../../../services/centrocosto";
import { getDropdownOptionsTipoGasto } from "../../../services/tipogasto";
import { saveRendicionGasto } from "../../../services/save/saveGasto";
import { saveDetalleGasto } from "../../../services/save_detalle/saveGastoDetalle";
import { getApiRuc } from "../../../services/ruc/api_ruc";

const getUserDni = (user) => {
    if (!user || typeof user !== "object") return "";

    const candidates = [
        user.dni,
        user.DNI,
        user.usedoc,
        user.nrodoc,
        user.numdoc,
        user.documento,
        user.docident,
        user.doc,
        user.usuario,
    ];

    const dni = candidates.find(
        (value) => value !== undefined && value !== null && String(value).trim() !== ""
    );

    return dni ? String(dni).trim() : "";
};

export default function GastoGeneral() {
    const [formData, setFormData] = useState({
        dni: "",
        politica: "",
        categoria: "",
        centroCosto: "",
        tipoGasto: "",
        rucEmisor: "",
        razonSocial: "",
        proveedor: "",
        tipoComprobante: "",
        serie: "",
        numeroSerie: "",
        numero: "",
        igv: "",
        fecha: "",
        total: "",
        moneda: "",
        rucCliente: "",
        gerencia: "",
        consumidor: "",
        placa: "",
        glosa: "",
        obs: "",
    });

    const [politicas, setPoliticas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [centrosCosto, setCentrosCosto] = useState([]);
    const [tiposGasto, setTiposGasto] = useState([]);

    const loadCentrosCosto = useCallback(async () => {
        const rawUser = localStorage.getItem("user");
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");

        if (!rawUser || !rawEmpresa) {
            throw new Error("No hay sesion completa para cargar centros de costo");
        }

        const user = JSON.parse(rawUser);
        const empresa = JSON.parse(rawEmpresa);

        const iduser = user?.usecod ?? user?.iduser ?? user?.id;
        const empresaNombre = empresa?.empresa ?? empresa?.nombre ?? empresa?.name;

        if (!iduser || !empresaNombre) {
            throw new Error("Faltan datos de usuario o empresa para centros de costo");
        }

        const centrosData = await getDropdownOptionsCentroCosto({
            iduser: String(iduser),
            empresa: String(empresaNombre),
        });
        setCentrosCosto(centrosData);
    }, []);

    const loadTiposGasto = async () => {
        const tiposData = await getDropdownOptionsTipoGasto();
        console.log("🔥 Tipos de gasto:", tiposData);
        setTiposGasto(tiposData);
    };
    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData({
            ...formData,
            [name]: files ? files[0] : value,
        });
    };

    const handleRucEmisorBlur = async () => {
        const ruc = String(formData.rucEmisor || "").trim();
        if (ruc.length < 8) return;

        try {
            const data = await getApiRuc({ ruc });
            const razonSocial =
                data?.razonSocial ||
                data?.nombre ||
                data?.nombreComercial ||
                data?.nombreComercialSunat ||
                "";

            if (razonSocial) {
                setFormData((prev) => ({
                    ...prev,
                    razonSocial,
                    proveedor: razonSocial,
                }));
            }
        } catch (error) {
            console.error("❌ Error validando RUC emisor:", error.message);
        }
    };

    const loadCategorias = async (politica = "todos") => {
        const categoriasData = await getDropdownOptionsCategoria({ politica });
        setCategorias(categoriasData);

        setFormData((prev) => {
            if (prev.categoria && categoriasData.some((c) => String(c.id) === String(prev.categoria))) {
                return prev;
            }
            return { ...prev, categoria: "" };
        });
    };

    const handlePoliticaChange = async (e) => {
        const politicaId = e.target.value;
        setFormData((prev) => ({
            ...prev,
            politica: politicaId,
        }));

        const politicaSeleccionada = politicas.find((p) => String(p.id) === String(politicaId));
        const politicaNombre = politicaSeleccionada?.name || "todos";

        try {
            await loadCategorias(politicaNombre);
        } catch (error) {
            console.error("Error cargando categorias por politica:", error);
            setCategorias([]);
        }
    };

    const handleCentroCostoChange = (e) => {
        const { value } = e.target;
        const centroSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(value));
        setFormData((prev) => ({
            ...prev,
            centroCosto: value,
            consumidor: centroSeleccionado?.consumidor || centroSeleccionado?.name || "",
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const rawUser = localStorage.getItem("user");
        if (!rawUser) {
            console.error("❌ No se ha encontrado el usuario en el localStorage.");
            alert("Error de autenticación. Por favor, inicie sesión de nuevo.");
            return;
        }
        const user = JSON.parse(rawUser);
        const userId = user?.id ?? user?.usecod ?? user?.iduser;
        const userDni = getUserDni(user);
        const dniToSend = String(formData.dni || userDni || "").trim();
        const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
        const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;


        if (!userId) {
            console.error("❌ No se ha encontrado el usuario en el localStorage o no tiene ID.");
            alert("Error de autenticación. Por favor, inicie sesión de nuevo.");
            return;
        }

        try {
            const politicaSeleccionada = politicas.find((p) => String(p.id) === String(formData.politica));
            const categoriaSeleccionada = categorias.find((c) => String(c.id) === String(formData.categoria));
            const centroCostoSeleccionado = centrosCosto.find((cc) => String(cc.id) === String(formData.centroCosto));
            const tipoGastoSeleccionado = tiposGasto.find((tg) => String(tg.id) === String(formData.tipoGasto));
            const resolvedIdCuenta = String(
                centroCostoSeleccionado?.id ||
                centroCostoSeleccionado?.raw?.idCuenta ||
                centroCostoSeleccionado?.raw?.idcuenta ||
                formData.centroCosto ||
                ""
            );
            const resolvedConsumidor = String(
                formData.consumidor ||
                centroCostoSeleccionado?.consumidor ||
                centroCostoSeleccionado?.raw?.consumidor ||
                centroCostoSeleccionado?.name ||
                ""
            );

            if (!resolvedIdCuenta) {
                alert("Selecciona un centro de costo antes de guardar");
                return;
            }

            const tipoComprobanteDescripcion =
                formData.tipoComprobante === "01"
                    ? "FACTURA ELECTRONICA"
                    : formData.tipoComprobante === "03"
                        ? "BOLETA"
                        : formData.tipoComprobante === "07"
                            ? "NOTA DE CRÉDITO"
                            : formData.tipoComprobante === "08"
                                ? "NOTA DE DÉBITO"
                                : String(formData.tipoComprobante || "");

            const monedaDescripcion =
                formData.moneda === "01"
                    ? "PEN"
                    : formData.moneda === "03"
                        ? "USD"
                        : String(formData.moneda || "");

            const igvNumber = Number(formData.igv);
            const totalNumber = Number(formData.total);
            const nowIso = new Date().toISOString();

            const payloadCabecera = {
                idUser: String(userId),
                dni: dniToSend,
                politica: String(politicaSeleccionada?.name ?? formData.politica),
                categoria: String(categoriaSeleccionada?.name ?? formData.categoria),
                tipogasto: String(tipoGastoSeleccionado?.name ?? formData.tipoGasto),
                idCuenta: resolvedIdCuenta,
                consumidor: resolvedConsumidor,
                ruc: String(formData.rucEmisor || ""),
                rucCliente: String(formData.rucCliente || ""),
                desEmp: String(empresa?.nombre || empresa?.empresa || ""),
                desSed: "",
                gerencia: String(empresa?.gerencia || ""),
                area: String(empresa?.area || ""),
                proveedor: String(formData.razonSocial || formData.proveedor || ""),
                tipoComprobante: tipoComprobanteDescripcion,
                tipocomprobante: tipoComprobanteDescripcion,
                tipoCombrobante: tipoComprobanteDescripcion,
                serie: String(formData.serie),
                numero: String(formData.numero),
                fecha: String(formData.fecha || ""),
                igv: Number.isFinite(igvNumber) ? igvNumber : 0,
                total: Number.isFinite(totalNumber) ? totalNumber : 0,
                moneda: monedaDescripcion,
                estadoActual: "BORRADOR",
                glosa: String(formData.glosa || "CREAR GASTO"),
                motivoViaje: "",
                lugarOrigen: "",
                lugarDestino: "",
                tipoMovilidad: "",
                obs: String(formData.obs || ""),
                estado: "S",
                fecCre: nowIso,
                useReg: String(userId),
                hostname: "WEB",
                FecEdit: nowIso,
                DecEdit: nowIso,
                UseEdit: 0,
                useElim: 0,
            };
            console.log("📡 Payload cabecera:", payloadCabecera);

            const responseCabecera = await saveRendicionGasto(payloadCabecera);

            const payloadDetalle = {
                // Reenviar campos clave para que el update no los pise en blanco
                politica: String(politicaSeleccionada?.name ?? formData.politica),
                categoria: String(categoriaSeleccionada?.name ?? formData.categoria),
                tipogasto: String(tipoGastoSeleccionado?.name ?? formData.tipoGasto),
                ruc: String(formData.rucEmisor || ""),
                proveedor: String(formData.razonSocial || formData.proveedor || ""),
                tipoComprobante: tipoComprobanteDescripcion,
                tipocomprobante: tipoComprobanteDescripcion,
                tipoCombrobante: tipoComprobanteDescripcion,
                serie: String(formData.serie || ""),
                numero: String(formData.numero || ""),
                igv: Number.isFinite(igvNumber) ? igvNumber : 0,
                fecha: String(formData.fecha || ""),
                total: Number.isFinite(totalNumber) ? totalNumber : 0,
                moneda: monedaDescripcion,
                idRend: String(responseCabecera),
                idrend: String(responseCabecera),
                FecEdit: nowIso,
                DecEdit: nowIso,
                useEdit: 0,
                UseEdit: 0,
                idcuenta: resolvedIdCuenta,
                consumidor: resolvedConsumidor,
                dni: dniToSend,
                gerencia: String(formData.gerencia || ""),
                placa: String(formData.placa || ""),
                obs: String(formData.obs || ""),
            };

            console.log("📡 Payload detalle:", JSON.stringify(payloadDetalle, null, 2));

            await saveDetalleGasto(payloadDetalle);

            console.log("✅ Guardado ID:", responseCabecera);

            alert("Guardado correctamente ✅");

        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error al guardar ❌");
        }
    };

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const rawUser = localStorage.getItem("user");
                const user = rawUser ? JSON.parse(rawUser) : null;
                const dniSesion = getUserDni(user);
                const rawEmpresa = localStorage.getItem("company") || localStorage.getItem("empresa");
                const empresa = rawEmpresa ? JSON.parse(rawEmpresa) : null;
                const rucClienteSesion = String(empresa?.ruc || "").trim();

                if (dniSesion || rucClienteSesion) {
                    setFormData((prev) => ({
                        ...prev,
                        dni: prev.dni || dniSesion,
                        rucCliente: prev.rucCliente || rucClienteSesion,
                    }));
                }

                const politicasData = await getDropdownOptionsPolitica();

                setPoliticas(politicasData);

                await loadCategorias("todos");
                await loadCentrosCosto();
                await loadTiposGasto();
            } catch (error) {
                console.error("Error cargando dropdowns:", error);
            }
        };

        cargarDatos();
    }, [loadCentrosCosto]);

    const fieldClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200";
    const labelClass = "text-sm font-semibold text-slate-700";

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-6xl space-y-2 rounded-3xl  from-slate-50 via-white to-cyan-50 p-4 shadow-lg sm:p-6 lg:p-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:p-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Formulario de Gasto General</h2>
                <p className="mt-1 text-sm text-slate-600">Completa los datos de rendición y guarda el comprobante.</p>
            </div>

            {/* Evidencia y QR */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <label className={labelClass}>Adjuntar evidencia</label>
                    <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4">
                        <input type="file" name="evidencia" onChange={handleChange} className="w-full text-sm text-slate-600" />
                    </div>

                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <label className={labelClass}>Lector de código QR</label>
                    <p className="mt-1 text-sm text-slate-500">Escanea para autocompletar datos del comprobante.</p>
                    <button
                        type="button"
                        className="mt-3 inline-flex items-center rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={() => alert("Abrir escáner QR")}
                    >
                        Escanear QR
                    </button>
                </div>
            </div>

            {/* Datos generales */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-3">
                <h3 className="mb-3 text-lg font-bold text-slate-800">Datos generales</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Política</label>
                        <select
                            name="politica"
                            className={fieldClass}
                            value={formData.politica}
                            onChange={handlePoliticaChange}
                        >
                            <option value="">Seleccionar política</option>
                            {politicas.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Categoría</label>
                        <select
                            name="categoria"
                            className={fieldClass}
                            value={formData.categoria}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar categoría</option>
                            {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Centro de costo</label>
                        <select
                            name="centroCosto"
                            className={fieldClass}
                            value={formData.centroCosto}
                            onChange={handleCentroCostoChange}
                        >
                            <option value="">Seleccionar centro de costo</option>
                            {centrosCosto.map((cc) => (
                                <option key={cc.id} value={cc.id}>
                                    {cc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Tipo de gasto</label>
                        <select
                            name="tipoGasto"
                            className={fieldClass}
                            value={formData.tipoGasto}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar tipo de gasto</option>
                            {tiposGasto.map((tg) => (
                                <option key={tg.id} value={tg.id}>
                                    {tg.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {/* Datos del comprobante */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-lg font-bold text-slate-800">Datos del comprobante</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>RUC EMISOR</label>
                        <input
                            type="number"
                            name="rucEmisor"
                            placeholder="Ej. 20123456789"
                            className={fieldClass}
                            onChange={handleChange}
                            onBlur={handleRucEmisorBlur}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Razón Social</label>
                        {/* // 🔥 OJO AQUÍ, SE AUTOCOMPLETA CON EL RUC */}
                        <input
                            type="text"
                            name="razonSocial"
                            placeholder="Ej. Empresa S.A."
                            className={fieldClass}
                            value={formData.razonSocial}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>RUC Cliente</label>
                        {/*   // RUC DE LA EMPRESA EN EL CUAL EL USUARIO ESTÁ LOGUEADO, SE AUTOCOMPLETA CON EL RUC DE LA EMPRESA LOGUEADA */}
                        <input
                            type="text"
                            name="rucCliente"
                            placeholder="Ej. 20123456789"
                            className={fieldClass}
                            value={formData.rucCliente}
                            readOnly
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Tipo de comprobante</label>
                        <select
                            name="tipoComprobante"
                            className={fieldClass}
                            value={formData.tipoComprobante}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar</option>
                            <option value="01">FACTURA ELECTRONICA</option>
                            <option value="03">BOLETA</option>
                            <option value="07">NOTA DE CRÉDITO</option>
                            <option value="08">NOTA DE DÉBITO</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Fecha</label>
                        <input
                            type="date"
                            name="fecha"
                            className={fieldClass}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>SERIE</label>
                        <input
                            type="text"
                            name="serie"
                            placeholder="F001"
                            className={fieldClass}
                            onChange={handleChange}
                        />
                    </div>



                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>NUMERO</label>
                        <input
                            type="number"
                            name="numero"
                            placeholder="0001"
                            className={fieldClass}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>IGV</label>
                        <input
                            type="number"
                            name="igv"
                            placeholder="00012345"
                            className={fieldClass}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>TOTAL</label>
                        <input
                            type="text"
                            name="total"
                            placeholder="000000.00"
                            className={fieldClass}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>MONEDA</label>
                        <select
                            name="moneda"
                            className={fieldClass}
                            value={formData.moneda}
                            onChange={handleChange}
                        >
                            <option value="">Seleccionar</option>
                            <option value="01">PEN</option>
                            <option value="03">USD</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Glosa */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <label className={`${labelClass} mb-1 block`}>Glosa o nota</label>
                <textarea
                    name="glosa"
                    type="text"
                    placeholder="Agrega una descripcion breve del gasto"
                    className={`${fieldClass} min-h-28 resize-y`}
                    onChange={handleChange}
                />
            </section>

            {/* Botones */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => console.log("Cancelar")}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                    Guardar
                </button>
            </div>
        </form>
    );
}