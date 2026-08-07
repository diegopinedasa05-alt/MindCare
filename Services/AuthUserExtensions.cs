using System.Security.Claims;

namespace AppTesisAPI.Services
{
    public static class AuthUserExtensions
    {
        public static int? GetUserId(this ClaimsPrincipal user)
        {
            var value =
                user.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(value, out var id)
                ? id
                : null;
        }

        public static bool IsAdmin(this ClaimsPrincipal user)
        {
            return user.IsInRole("Admin");
        }

        public static bool IsPsicologo(this ClaimsPrincipal user)
        {
            return user.IsInRole("Psicologo") ||
                user.IsInRole("Psicólogo");
        }

    }
}
