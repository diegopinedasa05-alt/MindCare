using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace AppTesisAPI.Services;

public sealed class ResendEmailSender : IEmailSender
{
    private readonly EmailSettings _settings;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        IOptions<EmailSettings> settings,
        HttpClient httpClient,
        ILogger<ResendEmailSender> logger)
    {
        _settings = settings.Value;
        _httpClient = httpClient;
        _logger = logger;
    }

    public bool IsConfigured =>
        _settings.UsesResend && _settings.IsResendConfigured;

    public async Task<EmailSendResult> SendPasswordRecoveryCodeAsync(
        string recipient,
        string code,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return new EmailSendResult(false);

        try
        {
            var expiration = expiresAtUtc
                .ToLocalTime()
                .ToString("HH:mm 'h'", System.Globalization.CultureInfo.GetCultureInfo("es-MX"));

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "emails");
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                _settings.ApiKey);
            request.Content = JsonContent.Create(new
            {
                from = $"{_settings.FromName} <{_settings.FromEmail}>",
                to = new[] { recipient },
                subject = "MindCare | Código de recuperación",
                text = $"""
                    MindCare

                    Tu código de recuperación es: {code}

                    El código vence a las {expiration}. Si no solicitaste este cambio, ignora este correo.
                    MindCare no solicita tu contraseña por correo.
                    """,
                html = $"""
                    <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#17283d">
                      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #dbe5f0;border-radius:16px;overflow:hidden">
                        <div style="background:#17283d;padding:26px 32px;color:#ffffff">
                          <div style="font-size:25px;font-weight:700">MindCare</div>
                          <div style="margin-top:6px;color:#cbd5e1">Recuperación segura de acceso</div>
                        </div>
                        <div style="padding:30px 32px">
                          <p style="margin:0 0 18px">Usa el siguiente código para restablecer tu contraseña:</p>
                          <div style="letter-spacing:8px;font-size:30px;font-weight:700;color:#0f766e;background:#ecfdf5;border:1px solid #99f6e4;border-radius:12px;padding:18px;text-align:center">{code}</div>
                          <p style="margin:22px 0 0;color:#475569">El código vence a las {expiration}. Si no solicitaste este cambio, puedes ignorar este correo.</p>
                          <p style="margin:14px 0 0;color:#64748b;font-size:13px">MindCare nunca solicita tu contraseña por correo.</p>
                        </div>
                      </div>
                    </div>
                    """
            });

            using var response = await _httpClient.SendAsync(
                request,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Resend rechazo el correo de recuperacion. Estado: {StatusCode}; dominio destino: {Domain}",
                    (int)response.StatusCode,
                    GetDomain(recipient));
                return new EmailSendResult(false);
            }

            _logger.LogInformation(
                "Correo de recuperacion enviado mediante Resend. Dominio destino: {Domain}",
                GetDomain(recipient));
            return new EmailSendResult(true);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Fallo el envio de Resend. Dominio destino: {Domain}",
                GetDomain(recipient));
            return new EmailSendResult(false);
        }
    }

    private static string GetDomain(string email)
    {
        var separator = email.LastIndexOf('@');
        return separator >= 0 && separator < email.Length - 1
            ? email[(separator + 1)..]
            : "unknown";
    }
}
