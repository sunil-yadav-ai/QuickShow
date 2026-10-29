export const getFrontendOrigin = () => {
    const frontendUrl = process.env.FRONTEND_URL?.trim();

    if (!frontendUrl) {
        throw new Error("FRONTEND_URL is not configured or is empty.");
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(frontendUrl);
    } catch {
        throw new Error("FRONTEND_URL must be an absolute HTTP or HTTPS URL.");
    }

    if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname ||
        parsedUrl.username ||
        parsedUrl.password
    ) {
        throw new Error("FRONTEND_URL must be an absolute HTTP or HTTPS URL.");
    }

    return parsedUrl.origin;
};
