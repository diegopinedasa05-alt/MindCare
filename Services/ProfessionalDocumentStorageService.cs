using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace AppTesisAPI.Services;

public sealed record StoredProfessionalDocument(
    string Bucket,
    string StorageKey,
    string MimeType,
    string HashSha256,
    long SizeBytes,
    string OriginalFileName);

public interface IProfessionalDocumentStorageService
{
    Task<StoredProfessionalDocument> UploadAsync(
        IFormFile file,
        int profileId,
        CancellationToken cancellationToken);

    Task<string> CreateSignedReadUrlAsync(
        string bucket,
        string storageKey,
        CancellationToken cancellationToken);
}

public sealed class ProfessionalDocumentStorageService
    : IProfessionalDocumentStorageService
{
    private const long MaxFileSizeBytes = 3L * 1024 * 1024;

    private static readonly HttpClient Client = new();

    private readonly IConfiguration _configuration;

    public ProfessionalDocumentStorageService(
        IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<StoredProfessionalDocument> UploadAsync(
        IFormFile file,
        int profileId,
        CancellationToken cancellationToken)
    {
        if (profileId <= 0)
        {
            throw new InvalidOperationException(
                "El perfil del psicólogo no es válido.");
        }

        if (file is null ||
            file.Length <= 0 ||
            file.Length > MaxFileSizeBytes)
        {
            throw new InvalidOperationException(
                "El documento debe pesar entre 1 byte y 3 MB.");
        }

        await using var input = file.OpenReadStream();

        using var content = new MemoryStream();

        await input.CopyToAsync(
            content,
            cancellationToken);

        var bytes = content.ToArray();

        // Segunda validación para no depender únicamente
        // del tamaño informado por IFormFile.
        if (bytes.LongLength <= 0 ||
            bytes.LongLength > MaxFileSizeBytes)
        {
            throw new InvalidOperationException(
                "El documento debe pesar entre 1 byte y 3 MB.");
        }

        var detected = DetectDocument(bytes);

        if (detected is null)
        {
            throw new InvalidOperationException(
                "Solo se permiten archivos PDF, JPG, JPEG o PNG válidos.");
        }

        var (mimeType, extension) = detected.Value;

        var settings = GetSettings();

        var key =
            $"psicologos/{profileId}/{Guid.NewGuid():N}.{extension}";

        var endpoint =
            $"{settings.Url}/storage/v1/object/" +
            $"{settings.Bucket}/{key}";

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                endpoint)
            {
                Content = new ByteArrayContent(bytes)
            };

        request.Content.Headers.ContentType =
            new MediaTypeHeaderValue(mimeType);

        AddSupabaseAuthentication(
            request,
            settings.ApiKey);

        request.Headers.Add(
            "x-upsert",
            "false");

        using var response =
            await Client.SendAsync(
                request,
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"No se pudo guardar el documento profesional " +
                $"de forma segura. Storage respondió " +
                $"{(int)response.StatusCode}.");
        }

        return new StoredProfessionalDocument(
            settings.Bucket,
            key,
            mimeType,
            Convert.ToHexString(
                SHA256.HashData(bytes)),
            bytes.LongLength,
            Path.GetFileName(file.FileName));
    }

    public async Task<string> CreateSignedReadUrlAsync(
        string bucket,
        string storageKey,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
        {
            throw new InvalidOperationException(
                "El documento profesional no tiene una ruta válida.");
        }

        var settings = GetSettings();

        // La API únicamente debe generar enlaces
        // del bucket profesional configurado.
        if (!string.Equals(
                bucket,
                settings.Bucket,
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "El bucket solicitado no está autorizado.");
        }

        var endpoint =
            $"{settings.Url}/storage/v1/object/sign/" +
            $"{settings.Bucket}/{storageKey}";

        using var request =
            new HttpRequestMessage(
                HttpMethod.Post,
                endpoint)
            {
                Content = JsonContent.Create(
                    new
                    {
                        expiresIn = 300
                    })
            };

        AddSupabaseAuthentication(
            request,
            settings.ApiKey);

        using var response =
            await Client.SendAsync(
                request,
                cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"No se pudo generar acceso temporal al documento. " +
                $"Storage respondió {(int)response.StatusCode}.");
        }

        using var json =
            JsonDocument.Parse(
                await response.Content.ReadAsStreamAsync(
                    cancellationToken));

        if (!json.RootElement.TryGetProperty(
                "signedURL",
                out var signedUrlElement))
        {
            throw new InvalidOperationException(
                "El proveedor no devolvió un enlace temporal.");
        }

        var relativeUrl =
            signedUrlElement.GetString();

        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            throw new InvalidOperationException(
                "El proveedor no devolvió un enlace temporal.");
        }

        if (relativeUrl.StartsWith(
                "http",
                StringComparison.OrdinalIgnoreCase))
        {
            return relativeUrl;
        }

        // Algunas respuestas de Storage ya incluyen /storage/v1.
        if (relativeUrl.StartsWith(
                "/storage/v1/",
                StringComparison.OrdinalIgnoreCase))
        {
            return $"{settings.Url}{relativeUrl}";
        }

        // Storage normalmente puede devolver algo como:
        // /object/sign/bucket/archivo?token=...
        return relativeUrl.StartsWith("/")
            ? $"{settings.Url}/storage/v1{relativeUrl}"
            : $"{settings.Url}/storage/v1/{relativeUrl}";
    }

    private SupabaseStorageSettings GetSettings()
    {
        var url =
            Environment.GetEnvironmentVariable(
                "SUPABASE_URL")
            ?? _configuration["Supabase:Url"];

        var apiKey =
            Environment.GetEnvironmentVariable(
                "SUPABASE_SECRET_KEY")
            ?? Environment.GetEnvironmentVariable(
                "SUPABASE_SERVICE_ROLE_KEY")
            ?? _configuration[
                "Supabase:SecretKey"]
            ?? _configuration[
                "Supabase:ServiceRoleKey"];

        var bucket =
            Environment.GetEnvironmentVariable(
                "SUPABASE_STORAGE_BUCKET")
            ?? _configuration[
                "Supabase:StorageBucket"]
            ?? "documentos-profesionales";

        if (string.IsNullOrWhiteSpace(url))
        {
            throw new InvalidOperationException(
                "SUPABASE_URL no está configurada.");
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                "La clave privada de Supabase no está configurada.");
        }

        if (string.IsNullOrWhiteSpace(bucket))
        {
            throw new InvalidOperationException(
                "El bucket profesional no está configurado.");
        }

        return new SupabaseStorageSettings(
            url.TrimEnd('/'),
            apiKey,
            bucket);
    }

    private static void AddSupabaseAuthentication(
        HttpRequestMessage request,
        string apiKey)
    {
        /*
         * Claves modernas:
         *
         * sb_secret_...
         *     -> apikey únicamente.
         *
         * Claves legacy service_role:
         *
         * JWT eyJ...
         *     -> apikey
         *     -> Authorization: Bearer
         */

        request.Headers.Add(
            "apikey",
            apiKey);

        if (!apiKey.StartsWith(
                "sb_secret_",
                StringComparison.Ordinal))
        {
            request.Headers.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    apiKey);
        }
    }

    private static (
        string MimeType,
        string Extension)?
        DetectDocument(byte[] bytes)
    {
        // PDF:
        // 25 50 44 46 2D
        // %PDF-
        if (bytes.Length >= 5 &&
            bytes[..5].SequenceEqual(
                "%PDF-"u8.ToArray()))
        {
            return (
                "application/pdf",
                "pdf");
        }

        // JPEG:
        // FF D8 FF
        if (bytes.Length >= 3 &&
            bytes[0] == 0xFF &&
            bytes[1] == 0xD8 &&
            bytes[2] == 0xFF)
        {
            return (
                "image/jpeg",
                "jpg");
        }

        // PNG:
        // 89 50 4E 47 0D 0A 1A 0A
        if (bytes.Length >= 8 &&
            bytes[..8].SequenceEqual(
                new byte[]
                {
                    0x89,
                    0x50,
                    0x4E,
                    0x47,
                    0x0D,
                    0x0A,
                    0x1A,
                    0x0A
                }))
        {
            return (
                "image/png",
                "png");
        }

        return null;
    }

    private sealed record SupabaseStorageSettings(
        string Url,
        string ApiKey,
        string Bucket);
}