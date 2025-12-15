// Handle student sign up: validate form and add new student to storage/students.json
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const nationalId = document.getElementById("nationalId").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document
        .getElementById("confirmPassword")
        .value.trim();
    const errorMsg = document.getElementById("errorMsg");
    const successMsg = document.getElementById("successMsg");

    errorMsg.textContent = "";
    successMsg.textContent = "";

    // Validate
    if (!name || !nationalId || !email || !password) {
        errorMsg.textContent = "Please fill in all required fields.";
        return;
    }

    if (password !== confirmPassword) {
        errorMsg.textContent = "Passwords do not match.";
        return;
    }

    if (password.length < 6) {
        errorMsg.textContent = "Password must be at least 6 characters.";
        return;
    }

    try {
        // Load any locally-saved students first (signup fallback)
        let allStudents = [];
        try {
            const localStored = localStorage.getItem("students") || "[]";
            const parsedLocal = JSON.parse(localStored);
            if (Array.isArray(parsedLocal))
                allStudents = allStudents.concat(parsedLocal);
        } catch (err) {
            console.warn("Could not parse local students", err);
        }

        // Also try to include the packaged students.json so we generate a non-conflicting ID
        try {
            const resp = await fetch("/assets/data/students.json");
            if (resp && resp.ok) {
                const remote = await resp.json();
                if (Array.isArray(remote))
                    allStudents = allStudents.concat(remote);
            }
        } catch (err) {
            // ignore - we'll rely on local students if remote not available
            console.warn("Could not load data/students.json", err);
        }

        const newStudent = {
            nationalId: nationalId,
            name: name,
            email: email,
            pass: password,
        };

        // Persist to localStorage (single source of truth for now)
        try {
            const stored = localStorage.getItem("students") || "[]";
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                parsed.push(newStudent);
                localStorage.setItem("students", JSON.stringify(parsed));
            } else {
                localStorage.setItem("students", JSON.stringify([newStudent]));
            }
            successMsg.textContent =
                "Account created locally. Redirecting to login...";
            successMsg.style.display = "block";
        } catch (err) {
            console.error("Failed to save locally", err);
            errorMsg.textContent = "Could not save account locally.";
            return;
        }

        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = "/login.html";
        }, 2000);
    } catch (err) {
        console.error(err);
        errorMsg.textContent = "Error creating account: " + err.message;
    }
});
