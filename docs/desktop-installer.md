# Instalador desktop CDT

CDT se empaqueta con Electron ejecutando un servidor Next local dentro de la app.

## Comandos

- Windows: `npm run dist:win`
- Linux: `npm run build:hp71:linux && npm run dist:linux`
- Ambos targets desde el sistema compatible: `npm run dist`

El instalador Windows queda en:

- `release/CDT Santa Barbara-0.1.0-Windows-x64.exe`

Los instaladores Linux quedan en:

- `release/CDT Santa Barbara-0.1.0-Linux-x64.AppImage`
- `release/CDT Santa Barbara-0.1.0-Linux-amd64.deb`

## Binarios HP71

El instalador espera estos binarios:

- Windows: `HP71/dist/win/hp71_emulator.exe`
- Linux: `HP71/dist/linux/hp71_emulator`

El preparador copia automáticamente:

- Windows: `HP71/build/hp71_server/Debug/hp71_emulator.exe` → `HP71/dist/win/hp71_emulator.exe`
- Linux: `HP71/build/hp71_server/hp71_emulator` → `HP71/dist/linux/hp71_emulator`

El binario Linux debe compilarse en Linux. No alcanza con reutilizar el `.exe`.

## Nota importante

La app usa NextAuth, Prisma y API routes, por eso no puede empaquetarse como export estático simple. Electron arranca `server.js` desde `.next/standalone` y abre una ventana contra `http://127.0.0.1:3210`.

Prisma está configurado para SQLite local. En producción Electron define `DATABASE_URL` apuntando a `cdt.db` dentro del directorio de datos del usuario de la app. Si la base está vacía, la app crea las tablas mínimas y un usuario administrador inicial.

Credenciales iniciales por defecto:

- Usuario: `admin`
- Contraseña: `TuPasswordSeguro123`

Para cambiar esas credenciales en empaquetado/despliegue, usar:

- `CDT_ADMIN_USERNAME`
- `CDT_ADMIN_PASSWORD`
- `CDT_ADMIN_EMAIL`
