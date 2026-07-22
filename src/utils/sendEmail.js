const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({to, subject, html}) => {
    try {
        await transporter.sendMail({
            from: `"Bearer" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        logger.info(`Email sent successfully to ${to}`);
    }
    catch(error) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;