using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppTesisAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddModelIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_TestPHQ9_UsuarioId_Fecha",
                table: "TestPHQ9",
                columns: new[] { "UsuarioId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_TestEstresLaboral_UsuarioId_Fecha",
                table: "TestEstresLaboral",
                columns: new[] { "UsuarioId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosEmocionales_UsuarioId_Fecha",
                table: "RegistrosEmocionales",
                columns: new[] { "UsuarioId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_HistorialPredictivo_UsuarioId_Fecha",
                table: "HistorialPredictivo",
                columns: new[] { "UsuarioId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_Credenciales_Email",
                table: "Credenciales",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConsentimientosUsuario_UsuarioId_FechaAceptacion",
                table: "ConsentimientosUsuario",
                columns: new[] { "UsuarioId", "FechaAceptacion" });

            migrationBuilder.CreateIndex(
                name: "IX_Citas_PsicologoId_Fecha",
                table: "Citas",
                columns: new[] { "PsicologoId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_Citas_UsuarioId_Fecha",
                table: "Citas",
                columns: new[] { "UsuarioId", "Fecha" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TestPHQ9_UsuarioId_Fecha",
                table: "TestPHQ9");

            migrationBuilder.DropIndex(
                name: "IX_TestEstresLaboral_UsuarioId_Fecha",
                table: "TestEstresLaboral");

            migrationBuilder.DropIndex(
                name: "IX_RegistrosEmocionales_UsuarioId_Fecha",
                table: "RegistrosEmocionales");

            migrationBuilder.DropIndex(
                name: "IX_HistorialPredictivo_UsuarioId_Fecha",
                table: "HistorialPredictivo");

            migrationBuilder.DropIndex(
                name: "IX_Credenciales_Email",
                table: "Credenciales");

            migrationBuilder.DropIndex(
                name: "IX_ConsentimientosUsuario_UsuarioId_FechaAceptacion",
                table: "ConsentimientosUsuario");

            migrationBuilder.DropIndex(
                name: "IX_Citas_PsicologoId_Fecha",
                table: "Citas");

            migrationBuilder.DropIndex(
                name: "IX_Citas_UsuarioId_Fecha",
                table: "Citas");
        }
    }
}
