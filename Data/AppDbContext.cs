using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Models;

namespace AppTesisAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(
            DbContextOptions<AppDbContext> options
        ) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Credenciales> Credenciales { get; set; }
        public DbSet<Cita> Citas { get; set; }
        public DbSet<Psicologo> Psicologos { get; set; }
        public DbSet<RegistrosEmocionales> RegistrosEmocionales { get; set; }
        public DbSet<TestPHQ9> TestPHQ9 { get; set; }
        public DbSet<HistorialPredictivo> HistorialPredictivo { get; set; }
        public DbSet<RecuperacionPassword> RecuperacionPasswords { get; set; }
        public DbSet<AuditoriaAcceso> AuditoriaAccesos { get; set; }
        public DbSet<TestEstresLaboral> TestEstresLaboral { get; set; }
    }
}