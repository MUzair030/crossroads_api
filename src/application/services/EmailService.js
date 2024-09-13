import nodemailer from 'nodemailer';
import config from '../../config/config.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });
  }

  async sendVerificationEmail(user, token) {
    this.transporter.verify(function (error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log('Server is ready to take our messages');
        }
      });

      
    const verificationUrl = `${config.baseUrl}/api/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: config.smtpUser,
      to: user.email,
      subject: 'Email Verification',
      text: `Please click the following link to verify your email: ${verificationUrl}`,
    };

    try {
        await this.transporter.sendMail(mailOptions);
        console.log('Verification email sent');
      } catch (error) {
        console.error('Error sending email:', error.message);
      }
  }
}

export default new EmailService();
