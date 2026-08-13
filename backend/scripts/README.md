# Scripts

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![TiDB](https://img.shields.io/badge/TiDB-ED2761?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4%3D&logoColor=white)
![dotenv](https://img.shields.io/badge/dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=black)

Scripts de mantenimiento y datos de prueba para la base de datos.

## Por qué existen

Originalmente esta lógica vivía en 2 stored procedures de MySQL (`sp_generar_reporte_demo` y `sp_limpiar_tablas`). Al migrar la base de datos a **TiDB Serverless**, dejaron de funcionar: TiDB no soporta stored procedures, triggers ni funciones definidas por el usuario (es una limitación conocida de TiDB frente a MySQL estándar, no una configuración que se pueda activar).

Ambos SPs se reescribieron aquí como scripts de Node.js con la misma lógica exacta (loops, distribución de probabilidades, fechas), pero ejecutándose desde fuera de la base de datos en vez de adentro. `limpiar_usuarios.js` es un script nuevo, adicional a los 2 originales.

## Requisitos

- Node.js instalado (si corres el script directo, sin Docker)
- Un `backend/.env` configurado y apuntando a la base de datos correcta (local o TiDB — el script se conecta a la que sea que tenga configurada `src/database/db.js`)

## Scripts disponibles

### `generar_reporte_demo.js`
Genera usuarios, reservaciones, pagos y cuotas de prueba con distribución realista de estados (aceptada, pendiente, finalizada, cancelada, rechazada) y su historial de pagos correspondiente.

**Uso:**
```bash
node scripts/generar_reporte_demo.js <numero_de_reservaciones>
```

**Ejemplo** (genera 20 reservaciones de prueba, cada una con su usuario y sus pagos/cuotas):
```bash
node scripts/generar_reporte_demo.js 20
```

Si no se pasa número, genera 10 por default.

### `limpiar_tablas.js`
Trunca `tbd_pagos`, `tbd_reservaciones` y `tbd_cuotas`. **No borra `tbd_usuarios`.**

**Uso:**
```bash
node scripts/limpiar_tablas.js
```

> Si se agrega una tabla nueva relacionada a este flujo de datos demo, se puede sumar su nombre al arreglo `TABLAS` dentro del script para que también se limpie.

### `limpiar_usuarios.js`
Trunca `tbd_usuarios` **junto con** `tbd_pagos`, `tbd_cuotas` y `tbd_reservaciones` (en ese orden), para no dejar reservaciones/pagos huérfanos apuntando a usuarios que ya no existen. Reinicia el contador de `AUTO_INCREMENT`, así que el próximo usuario insertado vuelve a tener `id = 1`.

**Uso:**
```bash
node scripts/limpiar_usuarios.js
```

⚠️ Borra **todos** los usuarios sin excepción, incluidos el admin y el usuario regular que siembra `initUsers.js` al arrancar el backend. Como ese seed se vuelve a correr solo, con reiniciar el backend después de limpiar recuperas el acceso — pero cualquier cuenta creada manualmente después del seed se pierde para siempre.

## Cómo ejecutarlos

**Con Docker corriendo** (`docker compose up` desde la raíz del proyecto):
```bash
docker compose exec backend node scripts/generar_reporte_demo.js 20
docker compose exec backend node scripts/limpiar_tablas.js
docker compose exec backend node scripts/limpiar_usuarios.js
```

**Sin Docker, localmente:**
```bash
cd backend
node scripts/generar_reporte_demo.js 20
node scripts/limpiar_tablas.js
node scripts/limpiar_usuarios.js
```

**Contra producción (Render):** desde el dashboard del servicio `sicpes-backend` en Render, en el menú lateral hay una opción **"Shell"** que abre una terminal dentro del contenedor ya desplegado — ahí se pueden correr los mismos comandos directo contra la base de datos en producción.

⚠️ **Los 3 scripts se conectan a la base de datos que tenga configurada tu `.env` en ese momento** — no hay separación automática entre entorno local y producción. Antes de correr `limpiar_tablas.js` o `limpiar_usuarios.js`, confirma con un `type backend\.env` (Windows) o `cat backend/.env` (Mac/Linux) que estás apuntando a donde realmente quieres borrar datos.