# Ciclo de vida de citas y cierre de atencion

## Objetivo

Este modulo permite que el psicologo documente el resultado real de una cita,
registre el seguimiento clinico y programe la continuidad de la atencion sin
perder la trazabilidad de los cambios.

## Estados implementados

| Estado | Significado | Estado final |
| --- | --- | --- |
| Pendiente | La cita fue programada y espera confirmacion. | No |
| Confirmada | El profesional confirmo que la cita continua programada. | No |
| Atendida | La atencion concluyo con nota y plan de accion. | Si |
| No asistio | El paciente no se presento en el horario programado. | Si |
| Cancelada | La cita fue cancelada antes de su cierre clinico. | Si |

`Atendida` solo puede obtenerse mediante **Finalizar atencion**. Este cierre
exige una nota de atencion y un plan de accion. Los estados finales no pueden
volver a un estado operativo.

## Flujo del psicologo

1. Abrir **Pacientes y agenda** en el panel del psicologo.
2. Localizar la cita en **Agenda operativa**.
3. Confirmar la cita o registrar cancelacion/no asistencia, segun corresponda.
4. Al concluir la sesion, seleccionar **Finalizar atencion**.
5. Capturar obligatoriamente la nota de atencion y el plan de accion.
6. De forma opcional, activar **Programar siguiente cita** y elegir fecha,
   hora y observacion.
7. Guardar. MindCare registra la fecha real de atencion, vincula la nota con la
   cita, cambia el estado a `Atendida` y crea la siguiente cita en estado
   `Pendiente` dentro de la misma transaccion.
8. Consultar **Historial** para conocer quien realizo cada cambio y cuando.

## Reglas de negocio

- Solo el psicologo asignado y verificado puede finalizar la atencion.
- Un administrador puede confirmar, cancelar o registrar inasistencia, pero no
  elaborar el cierre clinico del psicologo.
- La nota de atencion y el plan de accion son obligatorios al finalizar.
- Una cita no puede finalizarse con mas de 30 minutos de anticipacion.
- La inasistencia se registra al llegar el horario de la cita, con tolerancia de
  15 minutos para diferencias de reloj.
- La siguiente cita debe tener fecha futura y no puede duplicar otro horario
  activo del mismo psicologo.
- Cada cambio crea un registro en `CitaHistorialEstados` y un evento general en
  `AuditoriaEventos`.
- La cancelacion anterior `PUT /api/Citas/cancelar/{id}` se conserva para no
  romper compatibilidad con los clientes existentes.

## Endpoints

| Metodo | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/Citas` | Programar una cita. |
| GET | `/api/Citas/usuario/{id}` | Consultar citas del paciente. |
| GET | `/api/Citas/psicologo/{id}` | Consultar agenda profesional. |
| PUT | `/api/Citas/{id}/estado` | Confirmar, cancelar o registrar inasistencia. |
| POST | `/api/Citas/{id}/finalizar` | Finalizar atencion y, opcionalmente, programar la siguiente cita. |
| GET | `/api/Citas/{id}/historial` | Consultar la trazabilidad de estados. |
| PUT | `/api/Citas/cancelar/{id}` | Cancelacion compatible con clientes anteriores. |

## Persistencia

- `Citas.FechaAtencionUtc`: momento real del cierre de atencion.
- `Citas.FechaEstadoUtc`: momento del ultimo cambio de estado.
- `Citas.EstadoActualizadoPorUsuarioId`: usuario responsable del ultimo cambio.
- `NotasSeguimiento.CitaId`: relacion entre la nota clinica y la cita atendida.
- `CitaHistorialEstados`: secuencia completa de estados, responsable, fecha y
  detalle.
- `AuditoriaEventos`: evidencia transversal de la operacion.

La migracion `20260814063922_AddAppointmentLifecycle` es aditiva y no elimina
datos existentes.

## Evidencia y pruebas

- Compilacion ASP.NET Core: sin errores ni advertencias.
- Reglas del flujo: 9 validaciones automatizadas superadas.
- Analisis Flutter: sin incidencias.
- Prueba Flutter: interfaz de inicio de sesion aprobada.
- Migracion aplicada en PostgreSQL Neon.

## Ubicacion recomendada en la tesis

Incluir este flujo en el Capitulo IV, dentro de la implementacion del modulo de
citas y seguimiento psicologico. La tabla de estados puede utilizarse como
regla de negocio y el historial como evidencia de trazabilidad y auditoria.
