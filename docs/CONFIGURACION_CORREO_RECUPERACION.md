# Configuración de recuperación por correo

MindCare envía códigos temporales de recuperación mediante SMTP. Las claves no deben guardarse en `appsettings.json`, Git ni capturas de pantalla.

## Desarrollo local

En `Development`, si no existe una configuración SMTP, `POST /api/Auth/enviar-codigo` permite probar el flujo de forma local. El código solo debe utilizarse durante pruebas y no se presenta en la interfaz de producción.

## Producción en Render

En el servicio de Render, agrega estas variables de entorno:

| Variable | Valor esperado |
| --- | --- |
| `Email__Enabled` | `true` |
| `Email__Host` | Host SMTP del proveedor |
| `Email__Port` | Puerto SMTP seguro, por ejemplo `587` |
| `Email__UseStartTls` | `true` para STARTTLS en el puerto 587 |
| `Email__UserName` | Usuario SMTP del proveedor |
| `Email__Password` | Contraseña SMTP o clave API del proveedor |
| `Email__FromEmail` | Dirección remitente verificada |
| `Email__FromName` | `MindCare` |

Después de guardar, usa **Manual Deploy > Deploy latest commit** y prueba el flujo con una cuenta real. El servicio debe responder un mensaje genérico para no revelar si un correo está registrado.

## Configuración sugerida con Resend

Para una demostración académica, Resend ofrece correo transaccional gratuito. En su documentación SMTP oficial indica el host `smtp.resend.com`, el usuario `resend` y una API key como contraseña. Para STARTTLS configura:

| Variable | Valor con Resend |
| --- | --- |
| `Email__Enabled` | `true` |
| `Email__Host` | `smtp.resend.com` |
| `Email__Port` | `587` |
| `Email__UseStartTls` | `true` |
| `Email__UserName` | `resend` |
| `Email__Password` | API key de Resend, con prefijo `re_` |
| `Email__FromEmail` | Remitente o dominio verificado en Resend |
| `Email__FromName` | `MindCare` |

El plan gratuito informado por Resend está limitado a 100 correos transaccionales por día y 3,000 por mes. Debe verificarse el remitente o dominio antes de enviar a usuarios externos. Consulta la documentación oficial vigente del proveedor antes de cargar la configuración, ya que sus límites y requisitos pueden cambiar.

## Controles implementados

- Código aleatorio de seis dígitos con vigencia de 15 minutos.
- Persistencia solo del hash SHA-256 del código.
- Invalidación de códigos previos y de códigos usados.
- Límite de tres solicitudes por dirección IP cada cinco minutos.
- Mensajes que no confirman la existencia de una cuenta.
- Auditoría del envío exitoso o fallido cuando corresponde.
- Eliminación del código pendiente si el proveedor SMTP no logra enviarlo.
