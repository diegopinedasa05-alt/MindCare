using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPsicologoSeguimiento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotasSeguimiento",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PacienteId = table.Column<int>(type: "integer", nullable: false),
                    PsicologoId = table.Column<int>(type: "integer", nullable: false),
                    Nota = table.Column<string>(type: "text", nullable: false),
                    PlanAccion = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotasSeguimiento", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PacientePsicologos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PacienteId = table.Column<int>(type: "integer", nullable: false),
                    PsicologoId = table.Column<int>(type: "integer", nullable: false),
                    FechaAsignacion = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PacientePsicologos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotasSeguimiento_PacienteId_PsicologoId_Fecha",
                table: "NotasSeguimiento",
                columns: new[] { "PacienteId", "PsicologoId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_PacientePsicologos_PacienteId_PsicologoId",
                table: "PacientePsicologos",
                columns: new[] { "PacienteId", "PsicologoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotasSeguimiento");

            migrationBuilder.DropTable(
                name: "PacientePsicologos");
        }
    }
}
