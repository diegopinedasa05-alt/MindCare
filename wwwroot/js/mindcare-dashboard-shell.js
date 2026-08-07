(() => {
    const storageKey =
        `mindcare-dashboard-view:${location.pathname}`;

    function setDashboardView(view) {
        const targetView =
            view || document.body.dataset.dashboardView || "resumen";

        document.body.dataset.dashboardView =
            targetView;

        document
            .querySelectorAll("[data-dashboard-view-button]")
            .forEach(button => {
                const isActive =
                    button.dataset.dashboardViewButton === targetView;

                button.classList.toggle("active", isActive);
                button.setAttribute("aria-selected", String(isActive));
            });

        document
            .querySelectorAll("[data-view-panel]")
            .forEach(panel => {
                const isActive =
                    panel.dataset.viewPanel === targetView;

                panel.toggleAttribute("aria-current", isActive);
            });

        try {
            localStorage.setItem(storageKey, targetView);
        } catch {
            /* Local storage is optional for this UI enhancement. */
        }

        window.setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
        }, 80);
    }

    function initDashboardShell() {
        const buttons =
            document.querySelectorAll("[data-dashboard-view-button]");

        if (!buttons.length)
            return;

        let savedView = "";

        try {
            savedView = localStorage.getItem(storageKey) || "";
        } catch {
            savedView = "";
        }

        buttons.forEach(button => {
            button.addEventListener("click", () => {
                setDashboardView(button.dataset.dashboardViewButton);
            });
        });

        setDashboardView(savedView || document.body.dataset.dashboardView || "resumen");
    }

    window.setDashboardView =
        setDashboardView;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDashboardShell);
    } else {
        initDashboardShell();
    }
})();
