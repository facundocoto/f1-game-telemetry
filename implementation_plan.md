# F1 Telemetry Dashboard Implementation Plan

Este documento detalla el plan para construir una aplicación local en Node.js y React que capture y muestre la telemetría del juego F1 (funciona para F1 23, F1 24 y el futuro F1 25, ya que Codemasters mantiene el mismo protocolo UDP o provee compatibilidad hacia atrás) transmitida desde una consola Xbox.

## Arquitectura del Proyecto

El sistema funcionará con una arquitectura Cliente-Servidor local de transmisión en tiempo real:
1. **Xbox (Juego F1)**: Emite paquetes de telemetría a través de UDP hacia la IP local de tu computadora.
2. **Backend (Node.js)**: Escucha el puerto UDP, decodifica los paquetes de F1 y los retransmite al frontend usando WebSockets (`socket.io`).
3. **Frontend (React)**: Se conecta al backend por WebSockets, recibe la telemetría en tiempo real y actualiza un dashboard visual interactivo.

## User Review Required

> [!IMPORTANT]
> **Configuración en Xbox**: Para que esto funcione, deberás configurar el juego F1 en tu Xbox:
> 1. Ir a **Settings > Telemetry Settings**
> 2. Poner **UDP Telemetry** en **On**
> 3. En **UDP IP Address**, poner la IP local de tu PC (ej. `192.168.1.X`).
> 4. En **UDP Port**, usar el puerto por defecto (normalmente `20777`).
> 5. En **UDP Send Rate**, poner `20Hz` o `30Hz` para empezar (tasas más altas pueden saturar la red local).

## Open Questions

> [!WARNING]
> - ¿Prefieres usar **Vite** o **Next.js** para el Frontend en React? (Recomiendo Vite para una app local rápida estilo SPA).
> - ¿Qué librerías de diseño prefieres? (ej. TailwindCSS, Material-UI, o CSS Vanilla como establecen mis directrices de diseño web).
> - ¿Qué datos específicos quieres priorizar en pantalla? (Ej: RPM, Marcha, Velocidad, Temperatura de Neumáticos, Tiempos de Vuelta).

## Proposed Changes

La estructura del repositorio será un monorepo simple (o dos carpetas dentro del repositorio base).

### Backend (Node.js)
El servidor encargado de recibir UDP y emitir WebSockets.

#### [NEW] `server/package.json`
- Dependencias: `express`, `socket.io`, `f1-telemetry-client` (una librería de la comunidad que parsea los buffers UDP de F1 a JSON).

#### [NEW] `server/index.js`
- Inicialización del servidor Express y Socket.io.
- Configuración del cliente `F1TelemetryClient` para escuchar el puerto `20777`.
- Lógica de emisión (`io.emit('telemetry', data)`) cada vez que se recibe un paquete del juego.

### Frontend (React)
Aplicación web responsiva y visualmente atractiva para el Dashboard.

#### [NEW] `client/package.json`
- Inicializado con Vite (`npm create vite@latest client -- --template react-ts` o JS).
- Dependencias: `socket.io-client`, librerías de componentes/gráficos (ej. `recharts` si quieres gráficos de historial de telemetría).

#### [NEW] `client/src/App.jsx`
- Conexión inicial de `socket.io-client` a `http://localhost:3000`.
- Manejo del estado (`useState`, `useEffect`) para almacenar los últimos datos recibidos.

#### [NEW] `client/src/components/Dashboard.jsx`
- Layout principal.
- **Speedometer / RPM**: Componente visual para las revoluciones y la marcha actual.
- **Tyres**: Componente para la temperatura y desgaste de neumáticos.
- **Timing**: Tiempos de vuelta actual, última vuelta, deltas.

## Verification Plan

### Local Mock Verification (No Xbox needed)
1. **Paso 1**: Levantar el backend (`npm start` en la carpeta `server`).
2. **Paso 2**: Levantar el simulador de datos (`npm run mock` en la carpeta `server`). Esto enviará datos falsos de velocidad y RPM.
3. **Paso 3**: Levantar el frontend (`npm run dev` en la carpeta `client`).
4. **Paso 4**: Abrir el navegador en `http://localhost:5173` y verificar que el Dashboard muestra la velocidad y RPM cambiando.

### Manual Verification (With Xbox)
1. **Paso 1**: Levantar el backend en Node (`node server/index.js`). Verificar que dice "Listening on port 20777".
2. **Paso 2**: Levantar el frontend en React (`npm run dev` en client). Verificar que la UI carga y se conecta al socket.
3. **Paso 3**: Encender el juego F1 en Xbox, salir a pista en modo contrarreloj (Time Trial).
4. **Paso 4**: Observar el dashboard de React en la PC y validar que los datos cambian en tiempo real al acelerar, frenar y cambiar marchas.
