package com.talksy.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Talksy - Your Verification Code");

            String htmlContent = buildOtpEmailHtml(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            System.out.println("✅ OTP email sent successfully to: " + toEmail);
        } catch (MessagingException e) {
            System.err.println("❌ Failed to send OTP email to: " + toEmail);
            e.printStackTrace();
            throw new RuntimeException("Failed to send OTP email", e);
        }
    }

    public void sendPasswordResetEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Talksy - Reset Your Password");

            String htmlContent = buildOtpEmailHtml(otp);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            System.out.println("✅ Password reset email sent successfully to: " + toEmail);
        } catch (MessagingException e) {
            System.err.println("❌ Failed to send password reset email to: " + toEmail);
            e.printStackTrace();
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    private String buildOtpEmailHtml(String otp) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 50px auto;
                            background-color: #ffffff;
                            border-radius: 10px;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 40px 30px;
                            text-align: center;
                        }
                        .otp-box {
                            background-color: #f8f9fa;
                            border: 2px dashed #667eea;
                            border-radius: 8px;
                            padding: 20px;
                            margin: 30px 0;
                        }
                        .otp-code {
                            font-size: 36px;
                            font-weight: bold;
                            color: #667eea;
                            letter-spacing: 8px;
                            margin: 10px 0;
                        }
                        .footer {
                            background-color: #f8f9fa;
                            padding: 20px;
                            text-align: center;
                            color: #6c757d;
                            font-size: 14px;
                        }
                        .warning {
                            color: #dc3545;
                            font-size: 14px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Talksy Verification</h1>
                        </div>
                        <div class="content">
                            <h2>Welcome to Talksy!</h2>
                            <p>Thank you for signing up. Please use the verification code below to complete your registration:</p>

                            <div class="otp-box">
                                <p style="margin: 0; color: #6c757d; font-size: 14px;">Your Verification Code</p>
                                <div class="otp-code">"""
                + otp + """
                                        </div>
                                        <p style="margin: 0; color: #6c757d; font-size: 12px;">Valid for 10 minutes</p>
                                    </div>

                                    <p>Enter this code in the verification page to activate your account.</p>

                                    <p class="warning">
                                        ⚠️ If you didn't request this code, please ignore this email.
                                    </p>
                                </div>
                                <div class="footer">
                                    <p>© 2025 Talksy. All rights reserved.</p>
                                    <p>This is an automated email. Please do not reply.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """;
    }
}
