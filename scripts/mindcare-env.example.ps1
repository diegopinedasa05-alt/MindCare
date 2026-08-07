# Copia este archivo como mindcare-env.local.ps1 y reemplaza los valores.
# No subas mindcare-env.local.ps1 a Git si contiene credenciales reales.

# OPCION RECOMENDADA PARA NEON:
# Copia la cadena desde Neon > Connection details > Connection string.
# Debe verse parecido a:
# postgresql://neondb_owner:TU_PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
# Descomenta esta linea y reemplaza el valor completo:
# $env:DATABASE_URL = "postgresql://neondb_owner:TU_PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# OPCION ALTERNATIVA: cadena Npgsql clasica.
# Usala solo si prefieres separar host, usuario, base y password.
# $env:ConnectionStrings__DefaultConnection = "Host=TU_HOST;Port=5432;Database=TU_DB;Username=TU_USUARIO;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"

$env:JWT_KEY = "CAMBIA_ESTA_CLAVE_PRIVADA_DE_MINIMO_32_CARACTERES"
$env:MINDCARE_SETUP_KEY = "CLAVE_TEMPORAL_SOLO_PARA_CREAR_ADMIN"
$env:ASPNETCORE_ENVIRONMENT = "Development"
