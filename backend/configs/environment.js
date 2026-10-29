const requiredEnvironmentVariables = [
    "SMTP_USER",
    "SMTP_PASS",
    "SENDER_EMAIL",
    "FRONTEND_URL",
];

export const getRequiredEnvironmentStatus = () =>
    Object.fromEntries(
        requiredEnvironmentVariables.map((name) => {
            const value = process.env[name];

            return [
                name,
                {
                    exists: value !== undefined,
                    empty: typeof value !== "string" || value.trim() === "",
                },
            ];
        })
    );

export const logRequiredEnvironmentStatus = (context) => {
    console.info(`[ENV CHECK] ${context}`, getRequiredEnvironmentStatus());
};
