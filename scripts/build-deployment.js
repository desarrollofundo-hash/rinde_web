#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const deploymentDir = path.join(projectRoot, 'deployment-package');

console.log('🚀 Iniciando empaquetamiento para IIS...\n');

// 1. Limpiar directorio anterior
console.log('📋 Limpiando directorio anterior...');
if (fs.existsSync(deploymentDir)) {
  fs.rmSync(deploymentDir, { recursive: true, force: true });
}
fs.mkdirSync(deploymentDir, { recursive: true });

// 2. Compilar frontend
console.log('🔨 Compilando frontend...');
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Error compilando frontend');
  process.exit(1);
}

// 3. Copiar archivos necesarios
console.log('\n📁 Copiando archivos...');

const filesToCopy = [
  { src: 'dist', dest: 'dist' },
  { src: 'server.js', dest: 'server.js' },
  { src: 'web.config', dest: 'web.config' },
  { src: 'package.json', dest: 'package.json' },
  { src: 'package-lock.json', dest: 'package-lock.json' },
  { src: '.env', dest: '.env', optional: true },
];

filesToCopy.forEach(({ src, dest, optional }) => {
  const srcPath = path.join(projectRoot, src);
  const destPath = path.join(deploymentDir, dest);

  if (!fs.existsSync(srcPath)) {
    if (optional) {
      console.log(`  ⚠️  ${src} no encontrado (opcional, saltando)`);
      return;
    }
    console.error(`  ❌ ${src} no encontrado`);
    process.exit(1);
  }

  if (fs.statSync(srcPath).isDirectory()) {
    copyDir(srcPath, destPath);
    console.log(`  ✅ ${src}/ copiado`);
  } else {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✅ ${src} copiado`);
  }
});

// 4. Crear archivo .env de ejemplo si no existe
const envPath = path.join(deploymentDir, '.env');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(
    envPath,
    `# Variables de entorno para producción IIS
VITE_OPENAI_API_KEY=tu_api_key_aqui
NODE_ENV=production
PORT=3001
`,
    'utf-8'
  );
  console.log('  ✅ .env (plantilla) creado');
}

// 5. Crear archivo README de instrucciones
const readmePath = path.join(deploymentDir, 'DEPLOY_INSTRUCTIONS.txt');
fs.writeFileSync(
  readmePath,
  `INSTRUCCIONES DE DEPLOYMENT A IIS CON IISNODE
================================================

PASOS:

1. PREPARACIÓN EN EL SERVIDOR:
   - Instalar iisnode: https://github.com/Azure/iisnode/releases
   - Crear carpeta: C:\\inetpub\\wwwroot\\rinde-web

2. SUBIR ESTA CARPETA:
   - Copiar TODO el contenido de esta carpeta a C:\\inetpub\\wwwroot\\rinde-web
   - Especialmente:
     * dist/ (frontend)
     * server.js (backend)
     * web.config (configuración IIS)
     * .env (variables)
     * package.json y package-lock.json

3. EN EL SERVIDOR (CMD como administrador):
   cd C:\\inetpub\\wwwroot\\rinde-web
   npm install --production

4. EN IIS MANAGER:
   - Crear nueva aplicación
   - Alias: rinde-web
   - Ruta física: C:\\inetpub\\wwwroot\\rinde-web
   - Crear nuevo Application Pool (sin managed code)
   - Reiniciar el Application Pool

5. CONFIGURAR .env:
   - Editar: C:\\inetpub\\wwwroot\\rinde-web\\.env
   - Cambiar: VITE_OPENAI_API_KEY=tu_clave_real_aqui

6. PERMISOS:
   - Click derecho en carpeta rinde-web
   - Security → Edit
   - Agregar: IIS AppPool\\rinde-web-pool
   - Permisos: Modify, Read, Write, Execute

7. PRUEBA:
   - Abrir navegador: http://tu-servidor/rinde-web

NOTA: Para instalar node_modules en el servidor necesitas:
- Node.js instalado en el servidor
- O usar: npm ci --production (si usaste npm ci localmente)

¿PROBLEMA? Ver: DEPLOYMENT_IIS.md en la carpeta del proyecto
`,
  'utf-8'
);
console.log('  ✅ DEPLOY_INSTRUCTIONS.txt creado');

// 6. Crear archivo de checklist
const checklistPath = path.join(deploymentDir, 'CHECKLIST.txt');
fs.writeFileSync(
  checklistPath,
  `CHECKLIST ANTES DE DEPLOYMENT
===============================

ARCHIVOS EN ESTA CARPETA:
☐ dist/ (verificar que tenga archivos, no esté vacío)
☐ server.js (backend Express)
☐ web.config (configuración IIS)
☐ package.json y package-lock.json
☐ .env (IMPORTANTE: verificar que tenga tu OPENAI_API_KEY)
☐ node_modules/ (opcional, se puede instalar en servidor)

EN EL SERVIDOR:
☐ iisnode instalado (https://github.com/Azure/iisnode)
☐ Node.js instalado en el servidor
☐ Carpeta creada: C:\\inetpub\\wwwroot\\rinde-web

ANTES DE SUBIR:
☐ Verificar que .env tenga la VITE_OPENAI_API_KEY correcta
☐ Verificar que dist/ no esté vacío (debe tener index.html)
☐ Verificar que web.config esté presente

DESPUÉS DE SUBIR:
☐ npm install --production (en servidor)
☐ Crear Application Pool en IIS Manager
☐ Configurar permisos de carpeta
☐ Reiniciar Application Pool
☐ Abrir en navegador y probar

TODO LISTO? ✅ Felicidades, ya está deployado!
`,
  'utf-8'
);
console.log('  ✅ CHECKLIST.txt creado');

// 7. Resumen
console.log('\n✅ ¡Empaquetamiento completado!\n');
console.log(`📦 Carpeta de deployment: ${deploymentDir}\n`);
console.log('📋 Contenido:');
console.log('   ✅ dist/ (frontend compilado)');
console.log('   ✅ server.js (backend)');
console.log('   ✅ web.config (IIS)');
console.log('   ✅ package.json + package-lock.json');
console.log('   ✅ .env (plantilla - EDITAR CON TU API KEY)');
console.log('   ✅ DEPLOY_INSTRUCTIONS.txt (instrucciones)');
console.log('   ✅ CHECKLIST.txt (verificación)\n');

console.log('📝 PRÓXIMOS PASOS:');
console.log('   1. Copiar TODO el contenido de la carpeta deployment-package a IIS');
console.log('   2. En el servidor: npm install --production');
console.log('   3. Editar .env y agregar tu OPENAI_API_KEY');
console.log('   4. En IIS Manager: crear la aplicación');
console.log('   5. Reiniciar el Application Pool\n');

// Función auxiliar para copiar directorios
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}
