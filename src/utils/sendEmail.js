const { BrevoClient } = require('@getbrevo/brevo');
const logger = require('./logger');

const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY,
    timeoutInSeconds: 10
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        await brevo.transactionalEmails.sendTransacEmail({
            subject,
            htmlContent: html,
            sender: { name: 'Bazaar', email: process.env.EMAIL_USER },
            to: [{ email: to }]
        });
        logger.info(`Email sent successfully to ${to}`);
    } 
    catch(error) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;