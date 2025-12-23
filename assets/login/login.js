// Student-only login script.
// Accepts student ID or email, supports localStorage password override, and loads related data into localStorage.

document
    .getElementById("loginForm")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const identifier = (
            document.getElementById("emailInput").value || ""
        ).trim();
        const password = (
            document.getElementById("passwordInput").value || ""
        ).trim();
        const errorMsg = document.getElementById("errorMsg");
        errorMsg.textContent = "";

        if (!identifier) {
            errorMsg.textContent = "الرجاء إدخال البريد الإلكتروني أو الهوية.";
            return;
        }

        if (!password) {
            errorMsg.textContent = "الرجاء إدخال كلمة المرور.";
            return;
        }

        const dataFile = "assets/data/students.json"; // relative path (avoid leading slash to work under subpaths)
        const redirectUrl = "index.html";
        const passField = "pass";

        let users = [];
        try {
            const resp = await fetch(dataFile);
            if (resp && resp.ok) {
                users = await resp.json();
            }
        } catch (err) {
            console.warn("Could not fetch students file:", dataFile, err);
        }

        // Merge any locally-saved students (from signup UI)
        try {
            const stored = localStorage.getItem("students");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) users = users.concat(parsed);
            }
        } catch (err) {
            console.warn("Failed to parse local students", err);
        }

        // normalize identifier for comparison
        const idLower = identifier.toLowerCase();

        // accept either id or email match
        const user = users.find((u) => {
            if (!u) return false;
            const uId = (u.id || "").toString().toLowerCase();
            const uEmail = (u.email || "").toLowerCase();
            return uId === idLower || uEmail === idLower;
        });

        if (!user) {
            errorMsg.textContent =
                "البريد الإلكتروني/الهوية أو كلمة المرور غير صحيحة.";
            return;
        }

        // Check for local password override (support key patterns used elsewhere)
        const role = "student";
        const storageKeyById = `${role}-${user.id}-password`;
        const storageKeyByEmail = `${role}-${user.email}-password`;
        const storedPassword =
            localStorage.getItem(storageKeyById) ??
            localStorage.getItem(storageKeyByEmail);
        const correctPassword = storedPassword ?? user[passField];

        if (!correctPassword) {
            errorMsg.textContent = "الحساب ليس لديه كلمة مرور محددة.";
            return;
        }

        if (password !== correctPassword) {
            errorMsg.textContent =
                "البريد الإلكتروني/الهوية أو كلمة المرور غير صحيحة.";
            return;
        }

        // Save user info to localStorage
        const userToStore = {
            id: user.id || user.email,
            name: user.name || user.email,
        };
        localStorage.setItem("currentUser", JSON.stringify(userToStore));
        localStorage.setItem("student", JSON.stringify(user));

        // Load courses and enrollment from the data folder (use relative paths)
        try {
            const resp = await fetch("assets/data/courses.json");
            if (resp && resp.ok) {
                const courses = await resp.json();
                localStorage.setItem("courses", JSON.stringify(courses));
            }
        } catch (err) {
            console.warn("Could not fetch courses.json", err);
        }

        try {
            const resp = await fetch("assets/data/enrollment.json");
            if (resp && resp.ok) {
                const enrollment = await resp.json();
                localStorage.setItem("enrollment", JSON.stringify(enrollment));
            }
        } catch (err) {
            console.warn("Could not fetch enrollment.json", err);
        }

        // successful login: redirect
        window.location.href = redirectUrl;
    });
