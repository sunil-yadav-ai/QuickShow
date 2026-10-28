
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log("Brevo SMTP connection successful");
        return true;
    } catch (error) {
        console.error("Brevo SMTP connection failed:", error.message);
        return false;
    }
};

const sendEmail = async ({ to, subject, body }) => {
    try {
        if (!process.env.SMTP_USER ||
            !process.env.SMTP_PASS ||
            !process.env.SENDER_EMAIL) {
            throw new Error(
                "Missing SMTP_USER, SMTP_PASS, or SENDER_EMAIL environment variable"
            );
        }

        const response = await transporter.sendMail({
            from: process.env.SENDER_EMAIL,
            to,
            subject,
            html: body,
        });

        console.log("Email accepted by SMTP server:", response.messageId);
        return response;
    } catch (error) {
        console.error("Email sending failed:", error.message);
        throw error;
    }
};

export default sendEmail;

