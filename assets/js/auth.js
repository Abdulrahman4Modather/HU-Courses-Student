// Shared auth and enrollment helper
(function () {
    const enrollmentPath = "/assets/data/enrollment.json";

    function getCurrentUserId() {
        let current = null;
        const stored = localStorage.getItem("currentUser");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed) {
                    current =
                        parsed.id ||
                        parsed.nationalId ||
                        parsed.student_id ||
                        parsed.email ||
                        null;
                }
            } catch (e) {
                // plain string
                current = stored;
            }
        }
        // fallback to 'student' object
        if (!current) {
            const st = localStorage.getItem("student");
            if (st) {
                try {
                    const parsed = JSON.parse(st);
                    if (parsed)
                        current =
                            parsed.id ||
                            parsed.nationalId ||
                            parsed.student_id ||
                            null;
                } catch (e) {}
            }
        }
        return current ? String(current) : null;
    }

    async function loadEnrollmentsMerged() {
        // load server enrollments
        let server = [];
        try {
            const res = await fetch(enrollmentPath);
            if (res && res.ok) server = await res.json();
        } catch (e) {
            console.error("Failed to load server enrollments", e);
        }

        // load local overrides
        let local = [];
        try {
            // support two possible localStorage keys: 'enrollments' (preferred) and legacy 'enrollment'
            const raw1 = localStorage.getItem("enrollments");
            const raw2 = localStorage.getItem("enrollment");
            const parsed1 = raw1 ? JSON.parse(raw1) : null;
            const parsed2 = raw2 ? JSON.parse(raw2) : null;
            if (Array.isArray(parsed1)) local = local.concat(parsed1);
            if (Array.isArray(parsed2)) local = local.concat(parsed2);
        } catch (e) {
            // ignore parse errors
        }

        // merge by id if present, otherwise append; prefer local entries when ids conflict
        const map = new Map();
        (server || []).forEach((e) => map.set(String(e.id), e));
        (local || []).forEach((e) => {
            if (e && e.id != null) map.set(String(e.id), e);
            else {
                // generate a unique key for entries without id
                map.set("__local_" + Math.random().toString(36).slice(2), e);
            }
        });
        return Array.from(map.values());
    }

    async function getEnrolledSetForCurrentUser() {
        const curr = getCurrentUserId();
        if (!curr) return new Set();

        const merged = await loadEnrollmentsMerged();
        const set = new Set();
        (merged || []).forEach((en) => {
            if (!en) return;
            const sid = en.student_id != null ? String(en.student_id) : null;
            const cid = en.course_id != null ? String(en.course_id) : null;
            if (sid && cid && String(sid) === String(curr)) set.add(cid);
        });
        return set;
    }

    async function persistEnrollment(studentId, courseId) {
        if (!studentId || !courseId) return null;

        // 1. Load merged enrollments to check for duplicates and find the correct Max ID
        //    This prevents ID collisions between static JSON IDs (e.g. 1..6) and new local IDs.
        const all = await loadEnrollmentsMerged();

        // Check duplicate
        const exists = all.find(
            (e) =>
                String(e.student_id) === String(studentId) &&
                String(e.course_id) === String(courseId),
        );
        if (exists) return exists;

        // Calculate next ID based on BOTH server and local data
        const maxId = all.reduce(
            (max, it) => Math.max(max, Number(it.id || 0)),
            0,
        );
        const nextId = maxId + 1;

        const newEnroll = {
            id: nextId,
            student_id: isFinite(Number(studentId))
                ? Number(studentId)
                : studentId,
            course_id: isFinite(Number(courseId)) ? Number(courseId) : courseId,
            enrollment_date: new Date().toISOString().slice(0, 10),
        };

        // 2. Save only to local storage "enrollments" array
        //    We append the new valid entry to whatever is currently in localStorage.
        let localArr = [];
        try {
            const raw = localStorage.getItem("enrollments");
            if (raw) localArr = JSON.parse(raw);
            if (!Array.isArray(localArr)) localArr = [];
        } catch (e) {
            localArr = [];
        }

        localArr.push(newEnroll);
        localStorage.setItem("enrollments", JSON.stringify(localArr));

        // Notify other scripts
        try {
            window.dispatchEvent(new Event("enrollmentsUpdated"));
        } catch (e) {
            /* ignore */
        }

        return newEnroll;
    }

    // expose
    window.auth = {
        getCurrentUserId,
        loadEnrollmentsMerged,
        getEnrolledSetForCurrentUser,
        persistEnrollment,
    };
})();
