using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class TestEstresLaboral : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TestEstresLaboral",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    P1 = table.Column<int>(type: "integer", nullable: false),
                    P2 = table.Column<int>(type: "integer", nullable: false),
                    P3 = table.Column<int>(type: "integer", nullable: false),
                    P4 = table.Column<int>(type: "integer", nullable: false),
                    P5 = table.Column<int>(type: "integer", nullable: false),
                    P6 = table.Column<int>(type: "integer", nullable: false),
                    P7 = table.Column<int>(type: "integer", nullable: false),
                    P8 = table.Column<int>(type: "integer", nullable: false),
                    P9 = table.Column<int>(type: "integer", nullable: false),
                    P10 = table.Column<int>(type: "integer", nullable: false),
                    P11 = table.Column<int>(type: "integer", nullable: false),
                    P12 = table.Column<int>(type: "integer", nullable: false),
                    PuntajeTotal = table.Column<int>(type: "integer", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TestEstresLaboral", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TestEstresLaboral");
        }
    }
}
