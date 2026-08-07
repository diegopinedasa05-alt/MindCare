using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSeguimientoUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeguimientosUsuario",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    TareasCompletadas = table.Column<int>(type: "integer", nullable: false),
                    TotalTareas = table.Column<int>(type: "integer", nullable: false),
                    Respuesta1 = table.Column<string>(type: "text", nullable: false),
                    Respuesta2 = table.Column<string>(type: "text", nullable: false),
                    Respuesta3 = table.Column<string>(type: "text", nullable: false),
                    AccionPrincipal = table.Column<string>(type: "text", nullable: false),
                    NivelRiesgo = table.Column<string>(type: "text", nullable: false),
                    FechaActualizacion = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeguimientosUsuario", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeguimientosUsuario_UsuarioId_Fecha",
                table: "SeguimientosUsuario",
                columns: new[] { "UsuarioId", "Fecha" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeguimientosUsuario");
        }
    }
}
