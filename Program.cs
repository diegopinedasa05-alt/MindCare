/* ============================================================
🔥 PACK FINAL MINDCARE
POSTGRESQL + RAILWAY + .NET + SIN ERRORES UTC
REEMPLAZA TODO TU PROGRAM.CS
============================================================ */

using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

/* =====================================
FIX GLOBAL POSTGRESQL FECHAS
===================================== */
AppContext.SetSwitch(
    "Npgsql.EnableLegacyTimestampBehavior",
    true);

/* =====================================
BUILDER
===================================== */
var builder =
    WebApplication.CreateBuilder(args);

/* =====================================
CONEXIÓN RAILWAY
===================================== */
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration
        .GetConnectionString(
            "DefaultConnection")));

/* =====================================
JWT
===================================== */
var key =
    "CLAVE_SUPER_SECRETA_APP_TESIS_2026";

builder.Services
.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultChallengeScheme =
        JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    options.TokenValidationParameters =
        new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(key))
        };
});

/* =====================================
CORS
===================================== */
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

/* =====================================
SERVICIOS
===================================== */
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();

/* =====================================
APP
===================================== */
var app = builder.Build();

/* =====================================
MIDDLEWARE
===================================== */
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();