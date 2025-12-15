// Minimal header loader
// Responsibility: check auth state and inject the appropriate header include
// into the #headerContainer. No mobile/offcanvas logic and no extra wiring.

(function () {
    const isLoggedIn = !!localStorage.getItem("currentUser");
    const headerPath = isLoggedIn
        ? "/includes/header-in.html"
        : "/includes/header-out.html";

    fetch(headerPath)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load header");
            return res.text();
        })
        .then((html) => {
            const container = document.getElementById("headerContainer");
            if (container) container.innerHTML = html;
        })
        .catch((err) => {
            // Keep errors quiet but log for debugging
            console.error("Error loading header:", err);
        });
})();
