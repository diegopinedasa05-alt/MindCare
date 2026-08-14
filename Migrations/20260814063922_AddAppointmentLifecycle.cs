using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CitaId",
                table: "NotasSeguimiento",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstadoActualizadoPorUsuarioId",
                table: "Citas",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaAtencionUtc",
                table: "Citas",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaEstadoUtc",
                table: "Citas",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CitaHistorialEstados",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CitaId = table.Column<int>(type: "integer", nullable: false),
                    EstadoAnterior = table.Column<string>(type: "text", nullable: false),
                    EstadoNuevo = table.Column<string>(type: "text", nullable: false),
                    CambiadoPorUsuarioId = table.Column<int>(type: "integer", nullable: false),
                    FechaUtc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Detalle = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CitaHistorialEstados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CitaHistorialEstados_Citas_CitaId",
                        column: x => x.CitaId,
                        principalTable: "Citas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CitaHistorialEstados_Usuarios_CambiadoPorUsuarioId",
                        column: x => x.CambiadoPorUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotasSeguimiento_CitaId",
                table: "NotasSeguimiento",
                column: "CitaId");

            migrationBuilder.CreateIndex(
                name: "IX_Citas_EstadoActualizadoPorUsuarioId",
                table: "Citas",
                column: "EstadoActualizadoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_CitaHistorialEstados_CambiadoPorUsuarioId",
                table: "CitaHistorialEstados",
                column: "CambiadoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_CitaHistorialEstados_CitaId_FechaUtc",
                table: "CitaHistorialEstados",
                columns: new[] { "CitaId", "FechaUtc" });

            migrationBuilder.AddForeignKey(
                name: "FK_Citas_Usuarios_EstadoActualizadoPorUsuarioId",
                table: "Citas",
                column: "EstadoActualizadoPorUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_NotasSeguimiento_Citas_CitaId",
                table: "NotasSeguimiento",
                column: "CitaId",
                principalTable: "Citas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Citas_Usuarios_EstadoActualizadoPorUsuarioId",
                table: "Citas");

            migrationBuilder.DropForeignKey(
                name: "FK_NotasSeguimiento_Citas_CitaId",
                table: "NotasSeguimiento");

            migrationBuilder.DropTable(
                name: "CitaHistorialEstados");

            migrationBuilder.DropIndex(
                name: "IX_NotasSeguimiento_CitaId",
                table: "NotasSeguimiento");

            migrationBuilder.DropIndex(
                name: "IX_Citas_EstadoActualizadoPorUsuarioId",
                table: "Citas");

            migrationBuilder.DropColumn(
                name: "CitaId",
                table: "NotasSeguimiento");

            migrationBuilder.DropColumn(
                name: "EstadoActualizadoPorUsuarioId",
                table: "Citas");

            migrationBuilder.DropColumn(
                name: "FechaAtencionUtc",
                table: "Citas");

            migrationBuilder.DropColumn(
                name: "FechaEstadoUtc",
                table: "Citas");
        }
    }
}
