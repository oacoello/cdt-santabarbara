# Instalador desktop CDT

CDT se empaqueta con Electron ejecutando un servidor Next local dentro de la app.

## Comandos

- Windows: `npm run dist:win`
- Linux: `npm run dist:linux`
- Ambos targets desde el sistema compatible: `npm run dist`

## Binarios HP71

El instalador espera estos binarios:

- Windows: `HP71/dist/win/hp71_emulator.exe`
- Linux: `HP71/dist/linux/hp71_emulator`

El preparador copia automáticamente el `.exe` actual desde `HP71/build/hp71_server/Debug` si existe. El binario Linux debe compilarse en Linux. No alcanza con reutilizar el `.exe`.

## Nota importante

La app usa NextAuth, Prisma y API routes, por eso no puede empaquetarse como export estático simple. Electron arranca `server.js` desde `.next/standalone` y abre una ventana contra `http://127.0.0.1:3210`.

Hoy Prisma está configurado contra PostgreSQL vía `DATABASE_URL`. Eso significa que el instalador desktop necesita una base PostgreSQL accesible, o hay que hacer una decisión de producto: migrar desktop a SQLite/local-first o instalar/administrar PostgreSQL junto con la app. Sin resolver eso, el instalador abre la app pero no es 100% independiente.
