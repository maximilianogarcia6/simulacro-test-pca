function unauthorized() {
    return new Response("Authentication required", {
        status: 401,
        headers: {
            "WWW-Authenticate": 'Basic realm="Protected Quiz", charset="UTF-8"',
            "Cache-Control": "no-store"
        }
    });
}

function decodeBasicToken(token) {
    try {
        if (typeof atob === "function") return atob(token);
    } catch (e) {
        // noop
    }

    // Fallback for runtimes that expose Buffer.
    try {
        return Buffer.from(token, "base64").toString("utf-8");
    } catch (e) {
        return "";
    }
}

export async function onRequest(context) {
    const { request, env, next } = context;

    // If credentials are not configured, keep site open.
    const expectedUser = env.BASIC_AUTH_USER;
    const expectedPass = env.BASIC_AUTH_PASS;
    if (!expectedUser || !expectedPass) return next();

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Basic ")) return unauthorized();

    const token = authHeader.slice(6).trim();
    const decoded = decodeBasicToken(token);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) return unauthorized();

    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user !== expectedUser || pass !== expectedPass) return unauthorized();

    return next();
}
