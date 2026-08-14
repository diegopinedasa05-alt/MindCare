using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace AppTesisAPI.Services;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(
        IOptions<EmailSettings> settings,
        ILogger<SmtpEmailSender> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public bool IsConfigured => _settings.IsValid;

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
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(
                _settings.FromName,
                _settings.FromEmail));
            message.To.Add(MailboxAddress.Parse(recipient));
            message.Subject = "MindCare | Codigo de recuperacion";

            var expiration = expiresAtUtc
                .ToLocalTime()
                .ToString("HH:mm 'h'", System.Globalization.CultureInfo.GetCultureInfo("es-MX"));

            var plainText = $"""
                MindCare

                Tu codigo de recuperacion es: {code}

                El codigo vence a las {expiration}. Si no solicitaste este cambio, ignora este correo.
                MindCare no solicita tu contrasena por correo.
                """;

            var html = $"""
                <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#17283d">
                  <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #dbe5f0;border-radius:16px;overflow:hidden">
                    <div style="background:#17283d;padding:26px 32px;color:#ffffff">
                      <div style="font-size:25px;font-weight:700">MindCare</div>
                      <div style="margin-top:6px;color:#cbd5e1">Recuperacion segura de acceso</div>
                    </div>
                    <div style="padding:30px 32px">
                      <p style="margin:0 0 18px">Usa el siguiente codigo para restablecer tu contrasena:</p>
                      <div style="letter-spacing:8px;font-size:30px;font-weight:700;color:#0f766e;background:#ecfdf5;border:1px solid #99f6e4;border-radius:12px;padding:18px;text-align:center">{code}</div>
                      <p style="margin:22px 0 0;color:#475569">El codigo vence a las {expiration}. Si no solicitaste este cambio, puedes ignorar este correo.</p>
                      <p style="margin:14px 0 0;color:#64748b;font-size:13px">MindCare nunca solicita tu contrasena por correo.</p>
                    </div>
                  </div>
                </div>
                """;

            message.Body = new Multipart("alternative")
            {
                new TextPart("plain") { Text = plainText },
                new TextPart("html") { Text = html }
            };

            using var client = new SmtpClient();
            var socketOptions = _settings.UseStartTls
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.SslOnConnect;

            await client.ConnectAsync(
                _settings.Host,
                _settings.Port,
                socketOptions,
                cancellationToken);
            await client.AuthenticateAsync(
                _settings.UserName,
                _settings.Password,
                cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            _logger.LogInformation(
                "Correo de recuperacion enviado. Dominio destino: {Domain}",
                GetDomain(recipient));
            return new EmailSendResult(true);
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Fallo el envio del correo de recuperacion. Dominio destino: {Domain}",
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
