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

            // Get current file name (e.g., "students.html")
            const currentPage =
                window.location.pathname.split("/").pop() || "index.html";

            // Highlight the matching link
            document.querySelectorAll(".nav-link").forEach((link) => {
                const href = link.getAttribute("href");

                // Get only the file name part of the href (handles "pages/students.html", "./students.html", etc.)
                const linkPage = href.split("/").pop();

                // Compare normalized names
                if (linkPage === currentPage) {
                    link.classList.add("active");
                } else {
                    link.classList.remove("active");
                }
            });
        })
        .catch((err) => {
            // Keep errors quiet but log for debugging
            console.error("Error loading header:", err);
        });
})();
