# Deployment en IIS con iisnode

## Requisitos
- **iisnode** instalado en el servidor IIS
- **Node.js** instalado en el servidor
- Permisos de administrador en IIS

## Instalación de iisnode

### En Windows Server:
1. Descargar iisnode desde: https://github.com/Azure/iisnode/releases
2. Instalar el ejecutable (.msi)
3. Abrir `IIS Manager` y verificar que aparezca en los módulos

## Pasos de Deployment

### 1. Preparar la aplicación

```bash
# En tu máquina local
npm run build  # Genera la carpeta dist/ con el frontend compilado
```

### 2. Crear carpeta en el servidor IIS

```
C:\inetpub\wwwroot\rinde-web
```

### 3. Subir archivos

Sube estos archivos/carpetas a `C:\inetpub\wwwroot\rinde-web`:
- ✅ `dist/` (frontend compilado)
- ✅ `node_modules/` (o instalarlos en el servidor: `npm install --production`)
- ✅ `server.js`
- ✅ `web.config`
- ✅ `.env` (con las variables de entorno)
- ✅ `package.json`

### 4. Configurar en IIS Manager

1. **Abrir IIS Manager**
2. **Crear nueva aplicación:**
   - Click derecho en "Default Web Site" → "Add Application"
   - Alias: `rinde-web`
   - Ruta física: `C:\inetpub\wwwroot\rinde-web`
   - Application Pool: Crear nuevo llamado `rinde-web-pool`

3. **Configurar Application Pool:**
   - Click en `rinde-web-pool`
   - "Advanced Settings..."
   - **.NET CLR version:** `No Managed Code`
   - **Identidad:** `ApplicationPoolIdentity` (o usuario específico si necesita permisos)
   - **Bitness:** `64-bit` (recomendado)

4. **Reiniciar Application Pool:**
   - Click derecho en `rinde-web-pool` → "Restart"

### 5. Instalar dependencias en el servidor (si no subiste node_modules)

```bash
cd C:\inetpub\wwwroot\rinde-web
npm install --production
```

### 6. Configurar .env en el servidor

En `C:\inetpub\wwwroot\rinde-web\.env`:
```
VITE_OPENAI_API_KEY=tu_api_key_aqui
NODE_ENV=production
PORT=3001
```

### 7. Permisos de carpeta

Dale permisos al usuario del Application Pool:
- Click derecho en carpeta `rinde-web` → Properties
- Security → Edit
- Agregar usuario: `IIS AppPool\rinde-web-pool`
- Permisos: Modify, Read, Write, Execute

### 8. Probar la aplicación

Abre en navegador:
```
http://localhost/rinde-web
```
o
```
http://tu-servidor-iis/rinde-web
```

## Troubleshooting

### Error 404 en rutas del SPA
**Solución:** El `web.config` debe tener la regla de rewrite para SPA. Verifica que esté presente.

### Error "Module not found: iisnode"
**Solución:** Reinstala iisnode desde: https://github.com/Azure/iisnode/releases

### Error "Cannot find module"
**Solución:** Instala las dependencias en el servidor:
```bash
npm install --production
```

### Logs
Los logs de iisnode están en: `C:\inetpub\wwwroot\rinde-web\iisnode\`

### Puerto 3001 ya en uso
Si otro proceso usa el puerto 3001, cambia en `.env`:
```
PORT=3002
```

## URL relativa en Producción

En `ocrExtraction.js`, el sistema detecta si estás en desarrollo o producción:
- **Desarrollo (npm run dev):** Usa `http://localhost:3001`
- **Producción (IIS):** Usa URL relativa (misma ruta `/api/ocr/extract`)

No hay nada que configurar, funciona automáticamente.

## Variables de Entorno

```bash
# .env en servidor
VITE_OPENAI_API_KEY=sk-... (tu clave OpenAI)
NODE_ENV=production
PORT=3001
```

## Reiniciar la aplicación

Si haces cambios:
```bash
# En IIS Manager
Click derecho en Application Pool → Recycle
```

O manualmente:
```bash
# En el servidor
cd C:\inetpub\wwwroot\rinde-web
# Edita algún archivo o corre
npm start
```
