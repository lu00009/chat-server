import nodemailer from 'nodemailer';
import { config } from '../../env';

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  host: config.MAIL_HOST || 'smtp.gmail.com',
  port: Number(config.MAIL_PORT) || 587,
  secure: config.MAIL_SECURE === 'true', 
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASSWORD,
  },
});

// Email verification function
export const sendVerificationEmail = async (
  to: string,
  token: string,
  username: string
): Promise<boolean> => {
  const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${token}`;

  try {
    const mailOptions = {
      from: `"GroupChat App" <${config.MAIL_FROM || config.MAIL_USER}>`,
      to,
      subject: 'Verify Your Email - ChitChat',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Verify Your Email Address</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering with GroupChat App! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not sign up for ChitChat, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} GroupChat App. All rights reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Function to test email connection
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email server connection successful');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};