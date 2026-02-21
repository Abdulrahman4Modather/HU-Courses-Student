// Minimal header loader
// Responsibility: check auth state and inject the appropriate header include
// into the #headerContainer. No mobile/offcanvas logic and no extra wiring.

(function () {
    const isLoggedIn = !!localStorage.getItem("currentUser");
    const headerPath = isLoggedIn
        ? "/includes/header-in.html"
        : "/includes/header-out.html";
    const footerPath = "/includes/footer.html";

    fetch(headerPath)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load header");
            return res.text();
        })
        .then((html) => {
            const headerContainer = document.getElementById("headerContainer");
            if (headerContainer) headerContainer.innerHTML = html;

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

            // Wire sign out button to clear auth and redirect.
            // The header include may render an <a> or <button> with id="signOutBtn".
            const signOutBtn = document.getElementById("signOutBtn");
            if (signOutBtn) {
                signOutBtn.addEventListener("click", function (e) {
                    // If it's an anchor, prevent default navigation so we can clear storage first.
                    if (e && typeof e.preventDefault === "function")
                        e.preventDefault();

                    try {
                        localStorage.removeItem("currentUser");
                        localStorage.removeItem("student");
                    } catch (err) {
                        // ignore
                    }

                    // Redirect to the login page
                    window.location.href = "/index.html";
                });
            }
        })
        .catch((err) => {
            // Keep errors quiet but log for debugging
            console.error("Error loading header:", err);
        });

    fetch(footerPath)
        .then((res) => {
            if (!res.ok) throw new Error("Failed to load footer");
            return res.text();
        })
        .then((html) => {
            const footerContainer = document.getElementById("footerContainer");
            if (footerContainer) footerContainer.innerHTML = html;
        })
        .catch((err) => {
            console.error("Error loading footer:", err);
        });
})();
