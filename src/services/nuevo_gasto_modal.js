/**
 * Nuevo Gasto Modal - JavaScript Version
 * Replicación del archivo Dart para Angular/React Web
 * Maneja formularios de gastos con validaciones y APIs
 */

import API from './api';
import { getDropdownOptionsCategoria } from './categoria';
import { getDropdownOptionsTipoGasto } from './tipogasto';
import { getDropdownOptionsCentroCosto } from './centrocosto';
import { getDropdownOptionsTipoMovilidad } from './tipo_movilidad';
import { getApiRuc } from './ruc/api_ruc';
import { saveRendicionGasto } from './save/saveGasto';
import { saveDetalleGasto } from './save_detalle/saveGastoDetalle';
import { saveEvidenciaGasto } from './evidencia';

class NuevoGastoModal {
    constructor(options = {}) {
        // Configuración
        this.config = {
            apiBaseUrl:
                options.apiBaseUrl ||
                import.meta.env.VITE_QA_BASE_URL ||
                '/api',
            draftExpirationMinutes: 30,
            ...options
        };

        // Variables de estado
        this.state = {
            politicaSeleccionada: null,
            categorias: [],
            tiposGasto: [],
            centrosCosto: [],
            tiposMovilidad: [],

            selectedCategoria: null,
            selectedTipoGasto: null,
            selectedCentroCosto: null,
            selectedTipoMovilidad: null,
            selectedComprobante: null,
            selectedMoneda: 'PEN',
            selectedFile: null,
            selectedFileType: null,
            selectedFileName: null,

            isLoading: false,
            isLoadingCategorias: false,
            isLoadingTiposGasto: false,
            isLoadingCentrosCosto: false,
            isLoadingTipoMovilidad: false,
            isLoadingApiRuc: false,
            isFormValid: false,
            isScanning: false,
            hasScannedData: false,

            apiRucData: null,
            error: null,
            errorApiRuc: null
        };

        // Controllers (TextEditingControllers equivalentes)
        this.controllers = {
            politica: '',
            categoria: '',
            tipoGasto: '',
            centroCosto: '',
            rucProveedor: '',
            razonSocial: '',
            rucCliente: '',
            tipoComprobante: 'FACTURA ELECTRONICA',
            fecha: '',
            serieFactura: '',
            numeroFactura: '',
            igv: '',
            total: '',
            moneda: 'PEN',
            origen: '',
            destino: '',
            motivoViaje: '',
            movilidad: 'TAXI',
            placa: '',
            nota: ''
        };

        // Opciones de dropdown
        this.tipocomprobante = [
            'FACTURA ELECTRONICA',
            'BOLETA DE VENTA',
            'NOTA DE CREDITO',
            'NOTA DE DEBITO',
            'RECIBO POR HONORARIOS',
            'OTROS'
        ];

        this.monedas = ['PEN', 'USD', 'EUR'];

        // Inicialización
        this.initializeEventListeners();
    }

    /**
     * Inicializar listeners de eventos
     */
    initializeEventListeners() {
        // Listeners para validación en tiempo real
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-controller]')) {
                this.controllers[e.target.dataset.controller] = e.target.value;
                this.validateForm();
            }
        });

        // Listeners para cambios en inputs
        document.addEventListener('input', (e) => {
            if (e.target.matches('[data-controller]')) {
                this.controllers[e.target.dataset.controller] = e.target.value;
            }
        });
    }

    /**
     * Inicializar el modal
     */
    async initialize() {
        try {
            await Promise.all([
                this.loadCategorias(),
                this.loadTiposGasto(),
                this.loadTipoMovilidad(),
                this.loadCentrosCosto()
            ]);

            this.loadDraft();
            return this;
        } catch (error) {
            console.error('Error inicializando modal:', error);
            throw error;
        }
    }

    /**
     * Cargar categorías desde la API
     */
    async loadCategorias() {
        try {
            this.setState({ isLoadingCategorias: true, error: null });
            const politica = this.controllers.politica || 'todos';
            const response = await getDropdownOptionsCategoria({ politica });
            const categorias = response.map((item) => ({
                id: item.id,
                value: item.name,
                label: item.name,
                raw: item
            }));

            this.setState({ categorias, isLoadingCategorias: false });
        } catch (error) {
            this.setState({
                error: error.message,
                isLoadingCategorias: false
            });
        }
    }

    /**
     * Cargar tipos de gasto desde la API
     */
    async loadTiposGasto() {
        try {
            this.setState({ isLoadingTiposGasto: true, error: null });
            const response = await getDropdownOptionsTipoGasto();
            const tiposGasto = response.map((item) => ({
                id: item.id,
                value: item.name,
                label: item.name,
                raw: item
            }));
            const defaultTipoGasto = tiposGasto.find(
                (t) => t.value.toUpperCase() === this.getDefaultTipoGasto().toUpperCase()
            ) || tiposGasto[0];

            this.setState({
                tiposGasto,
                selectedTipoGasto: defaultTipoGasto,
                isLoadingTiposGasto: false
            });

            this.controllers.tipoGasto = defaultTipoGasto?.value || '';
        } catch (error) {
            this.setState({
                error: error.message,
                isLoadingTiposGasto: false
            });
        }
    }

    /**
     * Cargar tipos de movilidad desde la API
     */
    async loadTipoMovilidad() {
        try {
            this.setState({ isLoadingTipoMovilidad: true, error: null });
            const response = await getDropdownOptionsTipoMovilidad();
            const tiposMovilidad = response.map((item) => ({
                id: item.id,
                value: item.name,
                label: item.name,
                raw: item
            }));
            const defaultTipoMovilidad = tiposMovilidad.find(
                (t) => t.value.toUpperCase() === 'TAXI'
            ) || tiposMovilidad[0];

            this.setState({
                tiposMovilidad,
                selectedTipoMovilidad: defaultTipoMovilidad,
                isLoadingTipoMovilidad: false
            });

            this.controllers.movilidad = defaultTipoMovilidad?.value || 'TAXI';
        } catch (error) {
            this.setState({
                error: error.message,
                isLoadingTipoMovilidad: false
            });
        }
    }

    /**
     * Cargar centros de costo desde la API
     */
    async loadCentrosCosto() {
        try {
            this.setState({ isLoadingCentrosCosto: true, error: null });
            const userCode = this.getCurrentUserCode();
            const companyName = this.getCurrentUserCompany();

            const response = await getDropdownOptionsCentroCosto({
                iduser: userCode,
                empresa: companyName
            });

            const centrosCosto = response.map((item) => ({
                id: item.id,
                value: item.name,
                label: item.name,
                consumidor: item.consumidor,
                raw: item.raw || item
            }));

            if (centrosCosto.length > 0 && !this.state.selectedCentroCosto) {
                this.selectCentroCosto(centrosCosto[0]);
            }

            this.setState({
                centrosCosto,
                isLoadingCentrosCosto: false
            });
        } catch (error) {
            this.setState({
                error: error.message,
                isLoadingCentrosCosto: false
            });
        }
    }

    /**
     * Seleccionar un centro de costo y cargar datos asociados
     */
    selectCentroCosto(centroCosto) {
        this.state.selectedCentroCosto = centroCosto;
        this.controllers.centroCosto = centroCosto.value;

        // Cargar tipo de gasto y placa desde metadata
        if (centroCosto.metadata) {
            const tipoGasto = centroCosto.metadata.tipogasto || centroCosto.metadata.tipoGasto;
            if (tipoGasto) {
                const encontrado = this.state.tiposGasto.find(
                    t => t.value.toUpperCase() === tipoGasto.toUpperCase()
                );
                if (encontrado) {
                    this.state.selectedTipoGasto = encontrado;
                    this.controllers.tipoGasto = encontrado.value;
                }
            }

            const placa = centroCosto.metadata.placa;
            if (placa) {
                this.controllers.placa = placa;
            }
        }

        this.notifyChange();
    }

    /**
     * Cargar información del RUC desde API SUNAT
     */
    async loadApiRuc(ruc) {
        if (!ruc) return;

        try {
            this.setState({ isLoadingApiRuc: true, errorApiRuc: null });
            const apiRucData = await getApiRuc({ ruc });

            this.setState({
                apiRucData,
                isLoadingApiRuc: false
            });

            this.controllers.razonSocial =
                apiRucData?.razonSocial ||
                apiRucData?.nombre ||
                apiRucData?.nombreComercial ||
                apiRucData?.nombreComercialSunat ||
                'S/N';
            this.notifyChange();
        } catch (error) {
            this.setState({
                errorApiRuc: error.message,
                isLoadingApiRuc: false
            });
        }
    }

    /**
     * Validar formulario
     */
    validateForm() {
        const isValid =
            this.controllers.tipoComprobante.trim() !== '' &&
            this.controllers.fecha.trim() !== '' &&
            this.controllers.total.trim() !== '' &&
            this.controllers.categoria.trim() !== '' &&
            this.controllers.tipoGasto.trim() !== '' &&
            this.controllers.centroCosto.trim() !== '' &&
            this.controllers.origen.trim() !== '' &&
            this.controllers.destino.trim() !== '' &&
            this.controllers.motivoViaje.trim() !== '';

        if (this.state.isFormValid !== isValid) {
            this.setState({ isFormValid: isValid });
        }

        return isValid;
    }

    /**
     * Verificar si el RUC es válido
     */
    isRucValid() {
        const rucClienteEscaneado = this.controllers.rucCliente.trim();
        const rucEmpresaSeleccionada = this.getCompanyRuc();

        if (!rucEmpresaSeleccionada) {
            return false;
        }

        if (!rucClienteEscaneado) {
            return true;
        }

        return rucClienteEscaneado === rucEmpresaSeleccionada;
    }

    /**
     * Obtener mensaje de estado del RUC
     */
    getRucStatusMessage() {
        const rucClienteEscaneado = this.controllers.rucCliente.trim();
        const rucEmpresaSeleccionada = this.getCompanyRuc();
        const empresaSeleccionada = this.getCurrentUserCompany();

        if (!rucClienteEscaneado) {
            return `❌ RUC cliente no coincide con ${empresaSeleccionada}`;
        }

        if (!rucEmpresaSeleccionada) {
            return '⚠️ No hay empresa seleccionada';
        }

        if (rucClienteEscaneado === rucEmpresaSeleccionada) {
            return `✅ RUC cliente coincide con ${empresaSeleccionada}`;
        } else {
            return `❌ RUC cliente no coincide con ${empresaSeleccionada}`;
        }
    }

    /**
     * Seleccionar archivo (imagen o PDF)
     */
    async pickFile(fileType = 'image') {
        try {
            const input = document.createElement('input');

            switch (fileType) {
                case 'image':
                    input.type = 'file';
                    input.accept = 'image/*';
                    break;
                case 'pdf':
                    input.type = 'file';
                    input.accept = '.pdf';
                    break;
                default:
                    input.type = 'file';
            }

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.state.selectedFile = file;
                    this.state.selectedFileType = fileType;
                    this.state.selectedFileName = file.name;
                    this.notifyChange();
                }
            };

            input.click();
        } catch (error) {
            console.error('Error seleccionando archivo:', error);
            this.showNotification('Error al seleccionar archivo', 'error');
        }
    }

    /**
     * Comprimir imagen
     */
    async compressImage(file) {
        // Usar una librería como compressorjs si está disponible
        return file;
    }

    /**
     * Convertir imagen a PDF
     */
    async convertImageToPdf(imageFile) {
        // Implementar con jsPDF si es necesario
        return imageFile;
    }

    /**
     * Seleccionar fecha
     */
    selectDate() {
        const input = document.createElement('input');
        input.type = 'date';
        input.max = new Date().toISOString().split('T')[0];

        input.onchange = (e) => {
            this.controllers.fecha = e.target.value;
            this.notifyChange();
        };

        input.click();
    }

    /**
     * Validar y guardar gasto
     */
    async guardarValidar() {
        // Validar nota
        if (this.controllers.nota.trim() === '') {
            this.showAlert('FALTA COMPLETAR NOTA O GLOSA');
            return;
        }

        // Validar categoría
        if (this.controllers.categoria.trim() === '') {
            this.showAlert('SELECCIONA CATEGORIA');
            return;
        }

        // Validaciones específicas por categoría
        if (this.controllers.categoria === 'PLANILLA DE MOVILIDAD') {
            if (!this.validateMovilidad()) return;
        } else if (this.controllers.categoria === 'VIAJES CON COMPROBANTE') {
            if (!this.validateTravelWithProof()) return;
        } else {
            if (!this.validateOtherExpenses()) return;
        }

        // Si todas las validaciones pasaron, guardar
        await this.guardarGasto();
    }

    /**
     * Validar campos de movilidad
     */
    validateMovilidad() {
        if (this.controllers.total.trim() === '') {
            this.showAlert('INGRESE MONTO');
            return false;
        }
        if (this.controllers.centroCosto.trim() === '') {
            this.showAlert('SELECCIONA CENTRO DE COSTO');
            return false;
        }
        if (this.controllers.origen.trim() === '') {
            this.showAlert('FALTA ORIGEN');
            return false;
        }
        if (this.controllers.destino.trim() === '') {
            this.showAlert('FALTA DESTINO');
            return false;
        }
        if (this.controllers.motivoViaje.trim() === '') {
            this.showAlert('FALTA MOTIVO');
            return false;
        }
        return true;
    }

    /**
     * Validar campos para viajes con comprobante
     */
    validateTravelWithProof() {
        if (this.controllers.razonSocial.trim() === '') {
            this.showAlert('FALTA RAZÓN SOCIAL');
            return false;
        }
        if (this.getCompanyRuc() !== this.controllers.rucCliente) {
            this.showAlert('Ruc del cliente no coincide con ruc en el comprobante');
            return false;
        }
        if (this.controllers.total.trim() === '') {
            this.showAlert('INGRESE MONTO');
            return false;
        }
        if (this.controllers.centroCosto.trim() === '') {
            this.showAlert('SELECCIONA CENTRO DE COSTO');
            return false;
        }
        if (!this.state.selectedFile) {
            this.showAlert('ADJUNTE EVIDENCIA 📷');
            return false;
        }
        if (this.controllers.origen.trim() === '') {
            this.showAlert('FALTA ORIGEN');
            return false;
        }
        if (this.controllers.destino.trim() === '') {
            this.showAlert('FALTA DESTINO');
            return false;
        }
        if (this.controllers.motivoViaje.trim() === '') {
            this.showAlert('FALTA MOTIVO');
            return false;
        }
        return true;
    }

    /**
     * Validar campos para otros gastos
     */
    validateOtherExpenses() {
        if (this.controllers.razonSocial.trim() === '') {
            this.showAlert('FALTA RAZÓN SOCIAL');
            return false;
        }
        if (!this.state.selectedFile) {
            this.showAlert('ADJUNTE EVIDENCIA 📷');
            return false;
        }
        if (this.getCompanyRuc() !== this.controllers.rucCliente) {
            this.showAlert('Ruc del cliente no coincide con ruc del comprobante');
            return false;
        }
        if (this.controllers.total.trim() === '') {
            this.showAlert('INGRESE MONTO');
            return false;
        }
        if (this.controllers.centroCosto.trim() === '') {
            this.showAlert('SELECCIONA CENTRO DE COSTO');
            return false;
        }
        return true;
    }

    /**
     * Guardar gasto en la API
     */
    async guardarGasto() {
        try {
            this.setState({ isLoading: true });
            this.showLoadingDialog('Guardando gasto...');

            // Asegurar que el centro de costo tenga un valor
            if (this.controllers.centroCosto.trim() === '' && this.state.centrosCosto.length > 0) {
                this.selectCentroCosto(this.state.centrosCosto[0]);
            }

            // Asegurar tipo de comprobante
            if (this.controllers.tipoComprobante.trim() === '') {
                this.controllers.tipoComprobante = 'FACTURA ELECTRONICA';
            }

            const userId = this.getCurrentUserCode();
            const userDni = this.getCurrentUserDni();
            const company = this.getCurrentCompany();
            const nowIso = new Date().toISOString();
            const fechaIso = this.controllers.fecha
                ? new Date(`${this.controllers.fecha}T00:00:00`).toISOString()
                : '';
            const truncate = (value, max = 80) => {
                const text = String(value || '');
                return text.length > max ? text.slice(0, max) : text;
            };

            const politicaText = truncate(this.controllers.politica);
            const categoriaText = truncate(this.controllers.categoria || 'GENERAL');
            const tipoGastoText = truncate(this.controllers.tipoGasto || 'GASTO GENERAL');
            const rucText = this.controllers.rucProveedor
                ? truncate(this.controllers.rucProveedor)
                : '';
            const consumidorText = truncate(
                this.controllers.centroCosto || 'SIN CENTRO DE COSTO'
            );

            const gastoData = {
                idUser: Number(userId),
                dni: String(userDni || ''),
                politica: politicaText,
                categoria: categoriaText,
                tipoGasto: tipoGastoText,
                ruc: rucText,
                proveedor: String(this.controllers.razonSocial || ''),
                tipoCombrobante: String(this.controllers.tipoComprobante || ''),
                serie: String(this.controllers.serieFactura || ''),
                numero: String(this.controllers.numeroFactura || ''),
                igv: Number.parseFloat(this.controllers.igv) || 0,
                fecha: fechaIso,
                total: Number.parseFloat(this.controllers.total) || 0,
                moneda: String(this.controllers.moneda || ''),
                rucCliente: String(company?.ruc || ''),
                desEmp: String(company?.empresa || company?.nombre || ''),
                desSed: '',
                gerencia: String(company?.gerencia || ''),
                area: String(company?.area || ''),
                idCuenta: '',
                consumidor: consumidorText,
                placa: String(this.controllers.placa || ''),
                estadoActual: 'BORRADOR',
                glosa: String(this.controllers.Glosa || ''),
                motivoViaje: String(this.controllers.motivoViaje || ''),
                lugarOrigen: String(this.controllers.origen || ''),
                lugarDestino: String(this.controllers.destino || ''),
                tipoMovilidad: String(this.controllers.movilidad || ''),
                obs: String(this.controllers.nota || ''),
                estado: 'S',
                fecCre: nowIso,
                useReg: Number(userId),
                hostname: 'WEB',
                fecEdit: nowIso,
                useEdit: 0,
                useElim: 0
            };

            const idRend = await saveRendicionGasto(gastoData);

            const payloadDetalle = {
                idRend: String(idRend),
                idrend: String(idRend),
                idCuenta: String(this.state.selectedCentroCosto?.id || ''),
                consumidor: consumidorText,
                dni: String(userDni || ''),
                gerencia: String(company?.gerencia || ''),
                placa: String(this.controllers.placa || ''),
                obs: String(this.controllers.nota || '')
            };

            await saveDetalleGasto(payloadDetalle);

            if (this.state.selectedFile) {
                await this.saveEvidencia(idRend, this.state.selectedFile, gastoData);
            }

            if (!idRend) {
/*                 console.warn('No se obtuvo el ID del rendimiento guardado');
 */            }

            this.closeLoadingDialog();
            this.showNotification('Factura guardada exitosamente', 'success');

            // Limpiar borrador
            await this.clearDraft();

            // Notificar al callback si existe
            if (this.onSave) {
                this.onSave(gastoData);
            }

            // Cerrar modal
            this.close();

            return idRend;
        } catch (error) {
            this.closeLoadingDialog();
            const serverMessage = this.extractServerMessage(error);
            this.showServerAlert(serverMessage);
            this.setState({ isLoading: false });
        }
    }

    /**
     * Extraer mensaje del servidor de un error
     */
    extractServerMessage(error) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.message) {
            return error.message;
        }
        return 'Error desconocido';
    }

    /**
     * Verificar si la factura está duplicada
     */
    isFacturaDuplicada(message) {
        return message.toLowerCase().includes('duplicada') ||
            message.toLowerCase().includes('ya existe') ||
            message.toLowerCase().includes('ya ha sido registrada');
    }

    /**
     * Verificar si el monto está duplicado/excedido
     */
    isFacturaDuplicadaMonto(message) {
        return message.toLowerCase().includes('monto') ||
            message.toLowerCase().includes('limite') ||
            message.toLowerCase().includes('superaste');
    }

    /**
     * Mostrar alerta del servidor
     */
    showServerAlert(message) {
        if (this.isFacturaDuplicada(message)) {
            this.showAlert({
                title: 'FACTURA YA EXISTE',
                message: 'Esta factura ya ha sido registrada anteriormente en el sistema',
                type: 'error'
            });
        } else if (this.isFacturaDuplicadaMonto(message)) {
            this.showAlert({
                title: 'MONTO MOVILIDAD',
                message: 'SE REGISTRO CORRECTAMENTE, PERO SUPERASTE EL LIMITE DE 44 SOLES AL DIA',
                type: 'warning'
            });
        } else {
            this.showAlert({
                title: 'ERROR',
                message,
                type: 'error'
            });
        }
    }

    /**
     * Guardar borrador en localStorage
     */
    async saveDraft() {
        try {
            const draft = {
                timestamp: Date.now(),
                ...this.controllers
            };

            localStorage.setItem('gasto_draft', JSON.stringify(draft));
        } catch (error) {
            console.error('Error guardando borrador:', error);
        }
    }

    /**
     * Cargar borrador desde localStorage
     */
    async loadDraft() {
        try {
            const draftData = localStorage.getItem('gasto_draft');

            if (!draftData) return;

            const draft = JSON.parse(draftData);
            const now = Date.now();
            const savedTime = draft.timestamp;
            const diff = (now - savedTime) / (1000 * 60); // Diferencia en minutos

            // Si el borrador expiró (> 30 minutos), limpiar y notificar
            if (diff > this.config.draftExpirationMinutes) {
                await this.clearDraft();
                this.showNotification(
                    '⏰ El borrador expiró (más de 30 minutos). Por favor, vuelva a llenar el formulario.',
                    'warning'
                );
                return;
            }

            // Cargar datos del borrador
            Object.keys(draft).forEach((key) => {
                if (key !== 'timestamp' && Object.prototype.hasOwnProperty.call(this.controllers, key)) {
                    this.controllers[key] = draft[key];
                }
            });

            this.notifyChange();
            this.showNotification('📝 Datos recuperados del borrador', 'info');
        } catch (error) {
            console.error('Error cargando borrador:', error);
        }
    }

    /**
     * Limpiar borrador
     */
    async clearDraft() {
        try {
            localStorage.removeItem('gasto_draft');
        } catch (error) {
            console.error('Error limpiando borrador:', error);
        }
    }

    /**
     * Mostrar alerta
     */
    showAlert(config) {
        const message = typeof config === 'string' ? config : config.message;
        const title = typeof config === 'string' ? 'ADVERTENCIA' : config.title;
        const type = typeof config === 'string' ? 'warning' : config.type;

        // Implementar según el framework (Angular, React, etc)
        const alertElement = this.createAlertElement(title, message, type);
        document.body.appendChild(alertElement);

        setTimeout(() => alertElement.remove(), 3000);
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
/*         console.log(`[${type.toUpperCase()}]`, message);
 */
        // Implementar según el framework
        const notification = this.createNotificationElement(message, type);
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 3000);
    }

    /**
     * Mostrar diálogo de carga
     */
    showLoadingDialog(message = 'Cargando...') {
        const dialog = document.createElement('div');
        dialog.id = 'loading-dialog';
        dialog.className = 'loading-dialog';
        dialog.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
        document.body.appendChild(dialog);
    }

    /**
     * Cerrar diálogo de carga
     */
    closeLoadingDialog() {
        const dialog = document.getElementById('loading-dialog');
        if (dialog) {
            dialog.remove();
        }
    }

    /**
     * Crear elemento de alerta
     */
    createAlertElement(title, message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
      <div class="alert-header">
        <strong>${title}</strong>
        <button class="alert-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="alert-body">${message}</div>
    `;
        return alert;
    }

    /**
     * Crear elemento de notificación
     */
    createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        return notification;
    }

    /**
     * Cambiar estado
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifyChange();
    }

    /**
     * Notificar cambios (para actualizar UI)
     */
    notifyChange() {
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('gastoModalChange', {
            detail: { state: this.state, controllers: this.controllers }
        }));
    }

    /**
     * Helpers
     */

    getCurrentUserCode() {
        const user = this.getCurrentUser();
        return String(user?.usecod ?? user?.iduser ?? user?.id ?? '');
    }

    getCurrentUserDni() {
        const user = this.getCurrentUser();
        const candidates = [
            user?.usedoc,
            user?.dni,
            user?.DNI,
            user?.nrodoc,
            user?.numdoc,
            user?.documento,
            user?.docident,
            user?.doc
        ];
        const value = candidates.find(
            (item) => item !== undefined && item !== null && String(item).trim() !== ''
        );
        return value ? String(value).trim() : '';
    }

    getCurrentUser() {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    getCurrentCompany() {
        try {
            const raw = localStorage.getItem('company') || localStorage.getItem('empresa');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    getCurrentUserCompany() {
        const company = this.getCurrentCompany();
        return String(company?.empresa ?? company?.nombre ?? company?.name ?? '');
    }

    getCompanyRuc() {
        const company = this.getCurrentCompany();
        return String(company?.ruc || '');
    }

    getDefaultTipoGasto() {
        return (
            localStorage.getItem('defaultTipoGasto') ||
            sessionStorage.getItem('defaultTipoGasto') ||
            'TAXI'
        );
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async saveEvidencia(idRend, file, gastoData = {}) {
        return saveEvidenciaGasto({ idRend, file, gastoData });
    }

    /**
     * Cerrar modal
     */
    close() {
        this.saveDraft();
        if (this.onCancel) {
            this.onCancel();
        }
    }
}

// Exportar para uso en módulos
export default NuevoGastoModal;
