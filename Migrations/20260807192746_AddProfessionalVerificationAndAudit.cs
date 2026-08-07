using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalVerificationAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditoriaEventos",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    Entidad = table.Column<string>(type: "text", nullable: false),
                    EntidadId = table.Column<string>(type: "text", nullable: false),
                    FechaUtc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Resultado = table.Column<string>(type: "text", nullable: false),
                    Ip = table.Column<string>(type: "text", nullable: false),
                    CorrelationId = table.Column<string>(type: "text", nullable: false),
                    Detalles = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditoriaEventos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditoriaEventos_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PerfilesPsicologo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    ApellidoPaterno = table.Column<string>(type: "text", nullable: false),
                    ApellidoMaterno = table.Column<string>(type: "text", nullable: false),
                    NumeroCedula = table.Column<string>(type: "text", nullable: false),
                    Institucion = table.Column<string>(type: "text", nullable: false),
                    Especialidad = table.Column<string>(type: "text", nullable: false),
                    AniosExperiencia = table.Column<int>(type: "integer", nullable: true),
                    FotoStorageKey = table.Column<string>(type: "text", nullable: false),
                    EstadoVerificacion = table.Column<string>(type: "text", nullable: false),
                    FechaRegistro = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    FechaVerificacion = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerfilesPsicologo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerfilesPsicologo_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DocumentosProfesionales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PerfilPsicologoId = table.Column<int>(type: "integer", nullable: false),
                    TipoDocumento = table.Column<string>(type: "text", nullable: false),
                    NumeroDocumento = table.Column<string>(type: "text", nullable: false),
                    StorageProvider = table.Column<string>(type: "text", nullable: false),
                    Bucket = table.Column<string>(type: "text", nullable: false),
                    StorageKey = table.Column<string>(type: "text", nullable: false),
                    NombreOriginal = table.Column<string>(type: "text", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    HashSha256 = table.Column<string>(type: "text", nullable: false),
                    FechaCarga = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    RevisadoPorUsuarioId = table.Column<int>(type: "integer", nullable: true),
                    FechaRevision = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Observaciones = table.Column<string>(type: "text", nullable: false),
                    MotivoRechazo = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentosProfesionales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentosProfesionales_PerfilesPsicologo_PerfilPsicologoId",
                        column: x => x.PerfilPsicologoId,
                        principalTable: "PerfilesPsicologo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentosProfesionales_Usuarios_RevisadoPorUsuarioId",
                        column: x => x.RevisadoPorUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VerificacionesProfesionales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PerfilPsicologoId = table.Column<int>(type: "integer", nullable: false),
                    DocumentoProfesionalId = table.Column<int>(type: "integer", nullable: true),
                    AdministradorId = table.Column<int>(type: "integer", nullable: false),
                    EstadoAnterior = table.Column<string>(type: "text", nullable: false),
                    EstadoNuevo = table.Column<string>(type: "text", nullable: false),
                    Observacion = table.Column<string>(type: "text", nullable: false),
                    FechaUtc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificacionesProfesionales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VerificacionesProfesionales_DocumentosProfesionales_Documen~",
                        column: x => x.DocumentoProfesionalId,
                        principalTable: "DocumentosProfesionales",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VerificacionesProfesionales_PerfilesPsicologo_PerfilPsicolo~",
                        column: x => x.PerfilPsicologoId,
                        principalTable: "PerfilesPsicologo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VerificacionesProfesionales_Usuarios_AdministradorId",
                        column: x => x.AdministradorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditoriaEventos_Entidad_EntidadId",
                table: "AuditoriaEventos",
                columns: new[] { "Entidad", "EntidadId" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditoriaEventos_FechaUtc_Accion",
                table: "AuditoriaEventos",
                columns: new[] { "FechaUtc", "Accion" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditoriaEventos_UsuarioId",
                table: "AuditoriaEventos",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosProfesionales_HashSha256",
                table: "DocumentosProfesionales",
                column: "HashSha256");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosProfesionales_PerfilPsicologoId",
                table: "DocumentosProfesionales",
                column: "PerfilPsicologoId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosProfesionales_PerfilPsicologoId_Estado",
                table: "DocumentosProfesionales",
                columns: new[] { "PerfilPsicologoId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentosProfesionales_RevisadoPorUsuarioId",
                table: "DocumentosProfesionales",
                column: "RevisadoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_PerfilesPsicologo_EstadoVerificacion",
                table: "PerfilesPsicologo",
                column: "EstadoVerificacion");

            migrationBuilder.CreateIndex(
                name: "IX_PerfilesPsicologo_NumeroCedula",
                table: "PerfilesPsicologo",
                column: "NumeroCedula",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PerfilesPsicologo_UsuarioId",
                table: "PerfilesPsicologo",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VerificacionesProfesionales_AdministradorId",
                table: "VerificacionesProfesionales",
                column: "AdministradorId");

            migrationBuilder.CreateIndex(
                name: "IX_VerificacionesProfesionales_DocumentoProfesionalId",
                table: "VerificacionesProfesionales",
                column: "DocumentoProfesionalId");

            migrationBuilder.CreateIndex(
                name: "IX_VerificacionesProfesionales_PerfilPsicologoId_FechaUtc",
                table: "VerificacionesProfesionales",
                columns: new[] { "PerfilPsicologoId", "FechaUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditoriaEventos");

            migrationBuilder.DropTable(
                name: "VerificacionesProfesionales");

            migrationBuilder.DropTable(
                name: "DocumentosProfesionales");

            migrationBuilder.DropTable(
                name: "PerfilesPsicologo");
        }
    }
}
