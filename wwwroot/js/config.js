window.MINDCARE_API_BASE =
    window.MINDCARE_API_BASE ||
    `${window.location.origin}/api`;

(function () {

    const originalFetch =
        window.fetch.bind(window);

    window.fetch = function (input, init = {}) {

        const url =
            typeof input === "string"
                ? input
                : input?.url || "";

        const shouldAttachToken =
            url.startsWith(window.MINDCARE_API_BASE) ||
            url.startsWith("/api");

        const token =
            localStorage.getItem("token");

        if (shouldAttachToken && token) {

            const headers =
                new Headers(init.headers || {});

            if (!headers.has("Authorization")) {
                headers.set(
                    "Authorization",
                    "Bearer " + token
                );
            }

            init.headers = headers;
        }

        return originalFetch(input, init)
            .then(response => {

                if (
                    shouldAttachToken &&
                    response.status === 401 &&
                    !location.pathname.endsWith("/login.html")
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuarioId");
                    sessionStorage.setItem(
                        "mindcareSessionMessage",
                        "Tu sesión expiró. Inicia sesión nuevamente."
                    );
                    location.href = "/login.html";
                }

                return response;
            });
    };

})();
