using Microsoft.EntityFrameworkCore;
using AppTesisAPI.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using AppTesisAPI.Services;

AppContext.SetSwitch(
    "Npgsql.EnableLegacyTimestampBehavior",
    true);

var builder = WebApplication.CreateBuilder(args);

var hostPort = Environment.GetEnvironmentVariable("PORT");
if (int.TryParse(hostPort, out var port) && port is > 0 and <= 65535)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

/* DB */
var connectionString =
    ResolvePostgresConnectionString(
        builder.Configuration,
        builder.Environment);

builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null)));

/* JWT */
var key = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
{
    throw new InvalidOperationException(
        "Configura JWT_KEY con al menos 32 caracteres antes de iniciar MindCare.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MindCare.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "MindCare.Client";

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
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = false;

    options.TokenValidationParameters =
        new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(key))
        };
});

/* CORS */
builder.Services.AddCors(options =>
{
    options.AddPolicy("MindCareCors", p =>
    {
        p.AllowAnyHeader()
         .AllowAnyMethod();

        if (builder.Environment.IsDevelopment())
        {
            p.AllowAnyOrigin();
            return;
        }

        var allowedOrigins =
            (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (allowedOrigins.Length > 0)
            p.WithOrigins(allowedOrigins);
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth-login", limiter =>
    {
        limiter.PermitLimit = 5;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
    options.AddPolicy("auth-recovery", context =>
    {
        var remoteAddress =
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            remoteAddress,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
    options.AddFixedWindowLimiter("auth-register", limiter =>
    {
        limiter.PermitLimit = 5;
        limiter.Window = TimeSpan.FromMinutes(10);
        limiter.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("professional-upload", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(10);
        limiter.QueueLimit = 0;
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IAService>();
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection(EmailSettings.SectionName));
builder.Services.AddScoped<SmtpEmailSender>();
builder.Services.AddHttpClient<ResendEmailSender>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("MindCare/1.0");
});
builder.Services.AddScoped<IEmailSender>(serviceProvider =>
{
    var emailSettings = serviceProvider
        .GetRequiredService<Microsoft.Extensions.Options.IOptions<EmailSettings>>()
        .Value;

    return emailSettings.UsesResend
        ? serviceProvider.GetRequiredService<ResendEmailSender>()
        : serviceProvider.GetRequiredService<SmtpEmailSender>();
});
builder.Services.AddScoped<IPatientAccessService, PatientAccessService>();
builder.Services.AddScoped<
    IPsychologistVerificationService,
    PsychologistVerificationService>();
builder.Services.AddScoped<
    IProfessionalDocumentStorageService,
    ProfessionalDocumentStorageService>();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (string.Equals(
        Environment.GetEnvironmentVariable("MINDCARE_MIGRATE_ON_STARTUP"),
        "true",
        StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
}

/* PIPELINE */

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders =
            ForwardedHeaders.XForwardedFor |
            ForwardedHeaders.XForwardedProto,
        ForwardLimit = 1
    });

    app.UseHsts();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var logger = context.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("GlobalException");

        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        logger.LogError(
            exception,
            "Error no controlado durante {Method} {Path}. TraceId: {TraceId}",
            context.Request.Method,
            context.Request.Path,
            context.TraceIdentifier);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            title = "No se pudo completar la solicitud.",
            status = StatusCodes.Status500InternalServerError,
            traceId = context.TraceIdentifier
        });
    });
});

app.UseHttpsRedirection();

app.UseRouting();
app.UseCors("MindCareCors");
app.UseRateLimiter();

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd(
        "Referrer-Policy",
        "strict-origin-when-cross-origin");
    context.Response.Headers.TryAdd(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()");

    await next();
});

/* 👇 IMPORTANTE */
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Redirect("/login.html"));
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

static string ResolvePostgresConnectionString(
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    var direct =
        configuration.GetConnectionString("DefaultConnection");
    var databaseUrl =
        Environment.GetEnvironmentVariable("DATABASE_URL");

    if (string.IsNullOrWhiteSpace(databaseUrl) &&
        environment.IsDevelopment())
    {
        databaseUrl =
            ReadLocalPowerShellEnv(
                environment.ContentRootPath,
                "DATABASE_URL");
    }

    // En servicios administrados (Render/Neon), DATABASE_URL es la fuente
    // operativa de la base de datos. Evita conservar por error una cadena
    // directa antigua configurada en el entorno de despliegue.
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password =
            userInfo.Length > 1
                ? Uri.UnescapeDataString(userInfo[1])
                : "";

        var database =
            uri.AbsolutePath.TrimStart('/');

        var port =
            uri.Port > 0
                ? uri.Port
                : 5432;

        return
            $"Host={uri.Host};" +
            $"Port={port};" +
            $"Database={database};" +
            $"Username={username};" +
            $"Password={password};" +
            "SSL Mode=Require;" +
            "Pooling=true;" +
            "Maximum Pool Size=20;" +
            "Timeout=15;" +
            "Command Timeout=30";
    }

    if (!string.IsNullOrWhiteSpace(direct))
        return direct;

    if (environment.IsDevelopment())
    {
        var localDirect =
            ReadLocalPowerShellEnv(
                environment.ContentRootPath,
                "ConnectionStrings__DefaultConnection");

        if (!string.IsNullOrWhiteSpace(localDirect))
            return localDirect;
    }

    return "";
}

static string ReadLocalPowerShellEnv(
    string contentRootPath,
    string variableName)
{
    var path =
        Path.Combine(
            contentRootPath,
            "scripts",
            "mindcare-env.local.ps1");

    if (!File.Exists(path))
        return "";

    foreach (var rawLine in File.ReadLines(path))
    {
        var line = rawLine.Trim();

        if (line.StartsWith("#") ||
            !line.StartsWith($"$env:{variableName}"))
        {
            continue;
        }

        var separator = line.IndexOf('=');

        if (separator < 0)
            continue;

        var value =
            line[(separator + 1)..].Trim();

        if (value.Length >= 2 &&
            ((value.StartsWith("\"") && value.EndsWith("\"")) ||
             (value.StartsWith("'") && value.EndsWith("'"))))
        {
            value = value[1..^1];
        }

        return value.Trim();
    }

    return "";
}
