namespace AppTesisAPI.Services;

public interface IEmailSender
{
    bool IsConfigured { get; }

    Task<EmailSendResult> SendPasswordRecoveryCodeAsync(
        string recipient,
        string code,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default);
}

public sealed record EmailSendResult(bool Sent);
