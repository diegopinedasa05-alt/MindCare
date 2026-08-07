# MindCare - ejecucion local y despliegue

Para el despliegue gratuito con Neon, Supabase, Render y Cloudflare Pages consulta
`../docs/despliegue/MANUAL_DESPLIEGUE_GRATUITO.md`.

## 1. Variables requeridas

MindCare no guarda credenciales reales en `appsettings.json`.
Configura estas variables antes de ejecutar o desplegar:

```powershell
$env:JWT_KEY="CAMBIA_ESTA_CLAVE_POR_UN_SECRETO_LARGO_DE_AL_MENOS_32_CARACTERES"
$env:MINDCARE_SETUP_KEY="CLAVE_TEMPORAL_SOLO_PARA_CREAR_ADMIN"
```

Para PostgreSQL puedes usar cualquiera de estas dos opciones.

Opcion A: cadena Npgsql clasica:

```powershell
$env:ConnectionStrings__DefaultConnection="Host=TU_HOST;Port=5432;Database=TU_DB;Username=TU_USUARIO;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
```

Opcion B: `DATABASE_URL`, comun en Railway, Render y Neon:

```powershell
$env:DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST:PUERTO/DB"
```

El backend convierte `DATABASE_URL` automaticamente a una cadena compatible
con Npgsql.

## 2. Configurar PostgreSQL con Neon

Si ya no tienes acceso a Railway, crea una base nueva en Neon y usa la cadena
`DATABASE_URL`.

En Neon:

1. Abre tu proyecto.
2. Ve a `Connection details`.
3. Selecciona `Connection string`.
4. Activa `Show password`.
5. Copia la cadena completa.
6. Debe terminar con `?sslmode=require`.

Ejemplo del formato esperado:

```text
postgresql://neondb_owner:TU_PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

En local:

```powershell
.\scripts\configure-local-env.ps1
```

El script te pedira la cadena de Neon sin mostrarla en pantalla, creara
`scripts\mindcare-env.local.ps1` y generara claves privadas para JWT y setup.

Si prefieres hacerlo manualmente, copia el ejemplo:

```powershell
Copy-Item .\scripts\mindcare-env.example.ps1 .\scripts\mindcare-env.local.ps1
notepad .\scripts\mindcare-env.local.ps1
```

Dentro de `mindcare-env.local.ps1`, reemplaza:

```powershell
$env:DATABASE_URL = "postgresql://neondb_owner:TU_PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

No pegues la cadena real en documentación, capturas públicas ni GitHub.

## 3. Si vienes de Railway

En Railway:

1. Abre tu proyecto.
2. Entra al servicio PostgreSQL.
3. Abre `Variables`.
4. Copia `DATABASE_URL`.
5. Pegala en `scripts/mindcare-env.local.ps1`.

Ejemplo local:

```powershell
$env:DATABASE_URL="postgresql://postgres:TU_PASSWORD@TU_HOST.railway.app:12345/railway"
```

Si tu prueba gratuita termino y la base ya no existe, crea una nueva en Neon
o Supabase y usa su `DATABASE_URL`.

## 4. Ejecutar localmente

Desde `C:\APP TESIS\AppTesisAPI`:

```powershell
Copy-Item .\scripts\mindcare-env.example.ps1 .\scripts\mindcare-env.local.ps1
notepad .\scripts\mindcare-env.local.ps1
    .\scripts\run-local.ps1
```

Abre:

```text
http://localhost:5088/login.html
http://localhost:5088/swagger
```

No abras la app con `file:///...`; debe correr desde `http://localhost:5088`.

El arranque local no aplica migraciones por defecto. Si existe una migracion
pendiente y ya cuentas con respaldo de Neon, ejecuta una unica vez:

```powershell
.\scripts\run-local.ps1 -ApplyMigrations
```

## 5. Error de cadena de conexion

Si ves:

```text
The ConnectionString property has not been initialized.
```

significa que no configuraste `ConnectionStrings__DefaultConnection` ni
`DATABASE_URL` en la terminal donde corre la API.

## 6. Base de datos PostgreSQL

Con la variable de conexion configurada:

```powershell
dotnet ef database update
```

Antes de aplicar migraciones en una base existente, verifica que no haya
correos duplicados en `Credenciales`, porque MindCare ahora crea un indice
unico para `Email`.

Las migraciones actuales agregan:

- Consentimientos informados por usuario.
- Asignacion formal paciente-psicologo.
- Notas de seguimiento del psicologo.
- Indices para consultas por usuario, psicologo y fecha.

## 7. Crear el primer administrador

Con la app corriendo:

```powershell
$body = @{
  setupKey = "CLAVE_TEMPORAL_SOLO_PARA_CREAR_ADMIN"
  nombre = "Administrador MindCare"
  email = "admin@mindcare.local"
  password = "AdminSeguro123"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:5088/api/Setup/admin" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Despues de crear el administrador, elimina o cambia `MINDCARE_SETUP_KEY`
en produccion.

## 8. Frontend

El frontend usa `wwwroot/js/config.js`.
Por defecto toma la API del mismo dominio:

```javascript
window.MINDCARE_API_BASE = `${window.location.origin}/api`;
```

Si publicas frontend y backend separados:

```javascript
window.MINDCARE_API_BASE = "https://TU-BACKEND.com/api";
```

## 9. Despliegue recomendado

Para tesis, lo mas simple es publicar backend y frontend juntos como una sola
app ASP.NET Core. El frontend esta en `wwwroot`, asi que se sirve por el mismo
backend.

Variables en el proveedor:

```text
DATABASE_URL
JWT_KEY
MINDCARE_SETUP_KEY
ASPNETCORE_ENVIRONMENT=Production
```

Con Docker, el puerto esperado por el contenedor es:

```text
8080
```

## 10. Recomendacion de proveedores

- Backend: Render Web Service con Docker, Azure App Service o Fly.io.
- PostgreSQL: Neon Free o Supabase Free.
- Frontend: incluido dentro del backend; si lo separas, Netlify o Vercel.

## 11. Seguridad antes de publicar

- Rota la contrasena anterior de Railway/PostgreSQL si estuvo expuesta.
- Usa una `JWT_KEY` larga y privada.
- Usa `MINDCARE_SETUP_KEY` solo para instalacion inicial.
- No subas cadenas de conexion reales al repositorio.
- Crea el primer administrador con `/api/Setup/admin`.
- Verifica que admin solo abra con rol `Admin`.
- Verifica que psicologo solo abra con rol `Psicologo`.
