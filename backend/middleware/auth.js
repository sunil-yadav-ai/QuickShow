import { clerkClient, getAuth } from "@clerk/express";

const getSafeTokenDiagnostics = (authorization, publishableKey) => {
    const [scheme, token] = authorization?.split(/\s+/, 2) ?? [];
    const parts = token?.split(".");
    let issuerHost = null;

    if (scheme?.toLowerCase() === "bearer" && parts?.length === 3) {
        try {
            const claims = JSON.parse(
                Buffer.from(parts[1], "base64url").toString("utf8"),
            );
            issuerHost = new URL(claims.iss).host;
        } catch {
            issuerHost = null;
        }
    }

    const encodedInstance = publishableKey?.replace(/^pk_(?:test|live)_/, "");
    let configuredInstanceHost = null;

    if (encodedInstance) {
        try {
            configuredInstanceHost = Buffer.from(
                encodedInstance,
                "base64url",
            )
                .toString("utf8")
                .replace(/\$$/, "");
        } catch {
            configuredInstanceHost = null;
        }
    }

    return {
        bearerScheme: scheme?.toLowerCase() === "bearer",
        jwtSegmentCount: parts?.length ?? 0,
        issuerHost,
        configuredInstanceHost,
        issuerMatchesConfiguredInstance:
            issuerHost !== null &&
            configuredInstanceHost !== null &&
            issuerHost === configuredInstanceHost,
    };
};

const redactDiagnosticMessage = (message) =>
    String(message ?? "")
        .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
        .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted JWT]");

export const diagnoseClerkRequests = (req, res, next) => {
    if (process.env.NODE_ENV === "production" || !req.path.startsWith("/api/")) {
        return next();
    }

    try {
        const auth = getAuth(req);
        const authorization = req.headers.authorization;

        if (auth.userId) {
            console.info("Clerk request authenticated", {
                path: req.originalUrl,
                authenticated: true,
                userId: auth.userId,
            });
            return next();
        }

        const tokenDiagnostics = getSafeTokenDiagnostics(
            authorization,
            process.env.CLERK_PUBLISHABLE_KEY,
        );

        const verificationReason = res.getHeader("x-clerk-auth-reason")?.toString() ?? null;
        const verificationMessage = redactDiagnosticMessage(
            res.getHeader("x-clerk-auth-message")?.toString(),
        );
        res.locals.clerkDiagnostics = {
            verificationReason,
            verificationMessage,
            ...tokenDiagnostics,
        };
        console.warn("Clerk request verification failed", {
            path: req.originalUrl,
            authorizationHeaderPresent: Boolean(authorization),
            ...res.locals.clerkDiagnostics,
        });

        return next();
    } catch (error) {
        console.error("Clerk request diagnostics failed", {
            path: req.originalUrl,
            errorName: error?.name,
            errorMessage: redactDiagnosticMessage(error?.message),
        });
        return next();
    }
};

const logUnauthenticatedRequest = (req, auth) => {
    console.warn("Clerk admin request authentication", {
        path: req.originalUrl,
        authorizationHeaderPresent: Boolean(req.headers.authorization),
        authorizationScheme: req.headers.authorization?.split(" ", 1)[0] ?? null,
        authenticated: auth.isAuthenticated,
        tokenType: auth.tokenType,
        userId: auth.userId ?? null,
    });
};

const getClerkAuth = (req) => {
    const auth = getAuth(req);

    if (process.env.NODE_ENV !== "production") {
        console.info("Clerk admin request auth result", {
            path: req.originalUrl,
            authorizationHeaderPresent: Boolean(req.headers.authorization),
            authorizationScheme: req.headers.authorization?.split(" ", 1)[0] ?? null,
            authenticated: auth.isAuthenticated,
            tokenType: auth.tokenType,
            userId: auth.userId ?? null,
        });
    }

    return auth;
};

export const requireAuthenticatedUser = (req, res, next) => {
    const auth = getClerkAuth(req);

    if (!auth.userId) {
        logUnauthenticatedRequest(req, auth);
        return res.status(401).json({
            success: false,
            message: "Authentication required.",
            ...(process.env.NODE_ENV !== "production" && res.locals.clerkDiagnostics
                ? { diagnostics: res.locals.clerkDiagnostics }
                : {}),
        });
    }

    res.locals.userId = auth.userId;
    return next();
};

const loadAdminStatus = async (userId) => {
    const user = await clerkClient.users.getUser(userId);
    const role = user.privateMetadata?.role;

    if (process.env.NODE_ENV !== "production") {
        console.info("Clerk admin role lookup", {
            userId,
            privateMetadataRole:
                typeof role === "string" ? role : role == null ? null : "[non-string]",
            isAdmin: role === "admin",
        });
    }

    return role === "admin";
};

export const checkAdminStatus = async (req, res, next) => {
    try {
        const auth = getClerkAuth(req);
        const { userId } = auth;

        if (!userId) {
            logUnauthenticatedRequest(req, auth);
            return res.status(401).json({
                success: false,
                message: "Authentication failed. Please sign in again.",
                ...(process.env.NODE_ENV !== "production" && res.locals.clerkDiagnostics
                    ? { diagnostics: res.locals.clerkDiagnostics }
                    : {}),
            });
        }

        res.locals.isAdmin = await loadAdminStatus(userId);
        return next();
    } catch (error) {
        console.error("Clerk admin role lookup failed:", {
            name: error?.name,
            status: error?.status ?? error?.statusCode,
            message: error?.message,
        });

        return res.status(500).json({
            success: false,
            message: "Unable to verify admin access.",
        });
    }
};

export const protectAdmin = async (req, res, next) => {
    try {
        const auth = getClerkAuth(req);
        const { userId } = auth;

        if (!userId) {
            logUnauthenticatedRequest(req, auth);
            return res.status(401).json({
                success: false,
                message: "Authentication failed. Please sign in again.",
            });
        }

        const isAdmin = await loadAdminStatus(userId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Admin access denied.",
            });
        }

        res.locals.userId = userId;
        res.locals.isAdmin = isAdmin;

        return next();
    } catch (error) {
        console.error("Admin authorization check failed:", {
            name: error?.name,
            status: error?.status ?? error?.statusCode,
            message: error?.message,
        });

        return res.status(500).json({
            success: false,
            message: "Unable to verify admin access.",
        });
    }
};