# Configuracion de recuperacion por correo

MindCare envia codigos temporales de recuperacion. Las claves de correo nunca deben guardarse en `appsettings.json`, Git ni capturas de pantalla.

## Desarrollo local

En `Development`, si no existe una configuracion de correo, `POST /api/Auth/enviar-codigo` permite probar el flujo local. El codigo de demostracion no se expone en produccion.

## Produccion: Resend por HTTPS

La opcion recomendada para Render es Resend mediante HTTPS. Evita depender de los puertos SMTP salientes y usa la API `https://api.resend.com`.

En Render > Environment agrega o actualiza:

| Variable | Valor |
| --- | --- |
| `Email__Provider` | `Resend` |
| `Email__Enabled` | `true` |
| `Email__ApiKey` | Clave de Resend con prefijo `re_` |
| `Email__FromEmail` | Remitente de un dominio verificado en Resend |
| `Email__FromName` | `MindCare` |

El plan gratuito de Resend permite 100 correos transaccionales por dia y 3,000 por mes. Para enviar a usuarios externos debe verificarse un dominio propio y utilizar una direccion de ese dominio como remitente. Sin dominio verificado, la configuracion solo debe usarse para pruebas permitidas por el proveedor.

Despues de guardar, selecciona **Save, rebuild, and deploy**. No es necesario eliminar las variables SMTP; quedan como respaldo si se cambia `Email__Provider` a `Smtp`.

Documentacion oficial:

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/knowledge-base/how-do-I-create-an-email-address-or-sender-in-resend
- https://resend.com/docs/knowledge-base/account-quotas-and-limits

## Produccion: SMTP como respaldo

Para un proveedor SMTP configura:

| Variable | Valor esperado |
| --- | --- |
| `Email__Provider` | `Smtp` o vacio |
| `Email__Enabled` | `true` |
| `Email__Host` | Host SMTP del proveedor |
| `Email__Port` | Puerto SMTP seguro |
| `Email__UseStartTls` | `true` para STARTTLS; `false` para SSL directo |
| `Email__UserName` | Usuario SMTP |
| `Email__Password` | Contrasena SMTP o clave de aplicacion |
| `Email__FromEmail` | Direccion remitente valida |
| `Email__FromName` | `MindCare` |

## Controles implementados

- Codigo aleatorio de seis digitos con vigencia de 15 minutos.
- Persistencia exclusiva del hash SHA-256 del codigo.
- El nuevo codigo solo sustituye al anterior despues de enviarse correctamente.
- Limite de tres solicitudes por direccion IP cada cinco minutos.
- Mensajes que no confirman la existencia de una cuenta.
- Auditoria del envio exitoso o fallido.
- Tiempo maximo para operaciones SMTP y HTTPS, evitando pantallas bloqueadas.
