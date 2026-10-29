
import nodemailer from "nodemailer";
import { logRequiredEnvironmentStatus } from "./environment.js";

let transporter;
let configuredUser;
let configuredPass;

const getSmtpCredentials = () => {
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const missing = [];

    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASS");

    if (missing.length > 0) {
        throw new Error(`Missing or empty environment variable(s): ${missing.join(", ")}`);
    }

    return { user, pass };
};

const getTransporter = () => {
    const { user, pass } = getSmtpCredentials();

    if (!transporter || configuredUser !== user || configuredPass !== pass) {
        transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            connectionTimeout: 30_000,
            greetingTimeout: 30_000,
            socketTimeout: 120_000,
            auth: { user, pass },
        });
        configuredUser = user;
        configuredPass = pass;
    }

    return transporter;
};

export const verifyEmailConnection = async () => {
    try {
        await getTransporter().verify();
        console.log("Brevo SMTP connection successful");
        return true;
    } catch (error) {
        console.error("Brevo SMTP connection failed:", {
            name: error?.name,
            code: error?.code,
            command: error?.command,
        });
        return false;
    }
};

const sendEmail = async ({ to, subject, body }) => {
    try {
        logRequiredEnvironmentStatus("Email delivery configuration");

        const senderEmail = process.env.SENDER_EMAIL?.trim();

        if (!senderEmail) {
            throw new Error("Missing or empty environment variable: SENDER_EMAIL");
        }

        const response = await getTransporter().sendMail({
            from: senderEmail,
            to,
            subject,
            html: body,
        });

        console.log("Email accepted by SMTP server:", response.messageId);
        return response;
    } catch (error) {
        console.error("Email sending failed:", {
            name: error?.name,
            code: error?.code,
            command: error?.command,
        });
        throw error;
    }
};

export default sendEmail;
