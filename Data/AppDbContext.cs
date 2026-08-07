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
        public DbSet<ConsentimientoUsuario> ConsentimientosUsuario { get; set; }
        public DbSet<PacientePsicologo> PacientePsicologos { get; set; }
        public DbSet<NotaSeguimiento> NotasSeguimiento { get; set; }
        public DbSet<SeguimientoUsuario> SeguimientosUsuario { get; set; }
        public DbSet<PerfilPsicologo> PerfilesPsicologo { get; set; }
        public DbSet<DocumentoProfesional> DocumentosProfesionales { get; set; }
        public DbSet<VerificacionProfesional> VerificacionesProfesionales { get; set; }
        public DbSet<AuditoriaEvento> AuditoriaEventos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Credenciales>()
                .HasIndex(x => x.Email)
                .IsUnique();

            modelBuilder.Entity<RegistrosEmocionales>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha });

            modelBuilder.Entity<TestPHQ9>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha });

            modelBuilder.Entity<TestEstresLaboral>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha });

            modelBuilder.Entity<HistorialPredictivo>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha });

            modelBuilder.Entity<Cita>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha });

            modelBuilder.Entity<Cita>()
                .HasIndex(x => new { x.PsicologoId, x.Fecha });

            modelBuilder.Entity<ConsentimientoUsuario>()
                .HasIndex(x => new { x.UsuarioId, x.FechaAceptacion });

            modelBuilder.Entity<PacientePsicologo>()
                .HasIndex(x => new { x.PacienteId, x.PsicologoId })
                .IsUnique();

            modelBuilder.Entity<NotaSeguimiento>()
                .HasIndex(x => new { x.PacienteId, x.PsicologoId, x.Fecha });

            modelBuilder.Entity<SeguimientoUsuario>()
                .HasIndex(x => new { x.UsuarioId, x.Fecha })
                .IsUnique();

            modelBuilder.Entity<PerfilPsicologo>()
                .HasIndex(x => x.UsuarioId)
                .IsUnique();

            modelBuilder.Entity<PerfilPsicologo>()
                .HasIndex(x => x.NumeroCedula)
                .IsUnique();

            modelBuilder.Entity<PerfilPsicologo>()
                .HasIndex(x => x.EstadoVerificacion);

            modelBuilder.Entity<PerfilPsicologo>()
                .HasOne<Usuario>()
                .WithOne()
                .HasForeignKey<PerfilPsicologo>(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<DocumentoProfesional>()
                .HasIndex(x => x.PerfilPsicologoId);

            modelBuilder.Entity<DocumentoProfesional>()
                .HasIndex(x => x.HashSha256);

            modelBuilder.Entity<DocumentoProfesional>()
                .HasIndex(x => new { x.PerfilPsicologoId, x.Estado });

            modelBuilder.Entity<DocumentoProfesional>()
                .HasOne<PerfilPsicologo>()
                .WithMany()
                .HasForeignKey(x => x.PerfilPsicologoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DocumentoProfesional>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.RevisadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<VerificacionProfesional>()
                .HasIndex(x => new { x.PerfilPsicologoId, x.FechaUtc });

            modelBuilder.Entity<VerificacionProfesional>()
                .HasOne<PerfilPsicologo>()
                .WithMany()
                .HasForeignKey(x => x.PerfilPsicologoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<VerificacionProfesional>()
                .HasOne<DocumentoProfesional>()
                .WithMany()
                .HasForeignKey(x => x.DocumentoProfesionalId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<VerificacionProfesional>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.AdministradorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AuditoriaEvento>()
                .HasIndex(x => new { x.FechaUtc, x.Accion });

            modelBuilder.Entity<AuditoriaEvento>()
                .HasIndex(x => new { x.Entidad, x.EntidadId });

            modelBuilder.Entity<AuditoriaEvento>()
                .HasOne<Usuario>()
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
