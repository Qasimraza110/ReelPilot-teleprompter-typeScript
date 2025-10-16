import nodemailer from "nodemailer"

const sendEmail = async (options) => {
  // 1. Create a transporter object using your email service's SMTP settings
  // Example for Gmail (less secure for production, consider dedicated services like SendGrid, Mailgun, AWS SES)
  // For production, always use an App Password if using Gmail, or a robust email service.
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail", // e.g., 'gmail', 'SendGrid', 'Mailgun'
    auth: {
      user: process.env.EMAIL_USERNAME, // Your email address
      pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
    },
    // Optional: For some services or self-signed certs, you might need:
    // tls: {
    //   rejectUnauthorized: false
    // }
  });

  // 2. Define email options
  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address (e.g., "ReelPilot Support <support@reelpilot.com>")
    to: options.to,
    subject: options.subject,
    html: options.html || options.text, // Prefer HTML, fallback to text if HTML not provided
  };

  // 3. Send the email
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error(`Error sending email to ${options.to}:`, error);
    throw new Error("Email could not be sent."); // Re-throw to be caught by the route
  }
};

export default sendEmail
