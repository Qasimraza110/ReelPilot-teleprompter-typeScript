import { NextRequest, NextResponse } from "next/server";
import sendEmail from "@/utils/nodemailer";

export async function POST(request: NextRequest) {
  const { email, customerId } = await request.json();
  function generateStrongPassword(length = 16) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";
    let password = "";
    const charactersLength = characters.length;

    // Ensure at least one uppercase, one lowercase, one number, and one special character
    // Add at least one of each required character type to ensure complexity
    password += getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    password += getRandomChar("abcdefghijklmnopqrstuvwxyz");
    password += getRandomChar("0123456789");
    password += getRandomChar("!@#$%^&*()-_=+[]{}|;:,.<>?");

    // Fill the rest of the password length randomly
    for (let i = password.length; i < length; i++) {
      password += characters.charAt(
        Math.floor(Math.random() * charactersLength)
      );
    }

    // Shuffle the password to randomize character positions
    password = password
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    return password;
  }

  function getRandomChar(charSet: string): string {
    return charSet.charAt(Math.floor(Math.random() * charSet.length));
  }

  const generatedPassword = generateStrongPassword(12); // Generate a 12-character password

  // create a userame var with its value being the user's email's part before the @
  const username = email.split("@")[0];
  // fetch POST req to ${NEXT_PUBLIC_BACKEND_URL}/api/auth/signup with the body having the email and generated password
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: username,
        email,
        password: generatedPassword,
          customerId,
        plan: "pro"
      }),
    }
  );
  const data = await response.json();
  console.log(data);
  if (!response.ok) {
    throw new Error(data.message || "Failed to create user");
  } else if (response.ok) {
    await sendEmail({
      to: email,
      subject: "Your plan is ready!",
      html: `
          <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ReelPilot Pro!</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Email client reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; }
        
        /* Remove default styling */
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        
        /* Gmail specific */
        .gmail-fix { display: none; display: none !important; }
        
        /* Responsive */
        @media screen and (max-width: 600px) {
            .mobile-padding { padding: 20px !important; }
            .mobile-center { text-align: center !important; }
            .mobile-width { width: 100% !important; max-width: 100% !important; }
            .mobile-hide { display: none !important; }
            .mobile-stack { display: block !important; width: 100% !important; }
        }
        
        /* Outlook specific */
        <!--[if mso]>
        table { border-collapse: collapse; }
        <![endif]-->
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: Arial, sans-serif;">
    <!-- Outer wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Main container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; overflow: hidden;" class="mobile-width">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #581c87 0%, #be185d 100%); padding: 40px 30px; text-align: center;" class="mobile-padding">
                            
                            
                            <!-- Pro Badge -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display: inline-block;">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); border-radius: 50px; padding: 8px 16px;">
                                                    <span style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;">⭐ PRO MEMBER</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0 0 10px 0; font-family: Arial, sans-serif;">Welcome to Pro!</h1>
                            <p style="color: #d1d5db; font-size: 16px; margin: 0; font-family: Arial, sans-serif;">You're now part of our elite creator community</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; background-color: #1e293b;" class="mobile-padding">
                            
                            <p style="color: #ffffff; font-size: 18px; margin: 0 0 25px 0; font-family: Arial, sans-serif;">Congratulations! 🎉</p>
                            
                            <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 35px 0; font-family: Arial, sans-serif;">
                                You've successfully upgraded to <strong style="color: #ffffff;">ReelPilot Pro</strong>! You now have access to all premium features that will help you create viral content like never before.
                            </p>
                            
                            <!-- Account Details -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
    <tr>
        <td style="background-color: #581c87; background-color: rgba(88, 28, 135, 0.2); border: 1px solid #9333ea; border-radius: 12px; padding: 25px;">

            <p style="color: #c084fc; font-size: 18px; font-weight: bold; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                👤 Your Account Details
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #374151;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Email Address</td>
                                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">${email}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #374151;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Plan</td>
                                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">ReelPilot Pro</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #374151;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Monthly Price</td>
                                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">$9.99/month</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #374151;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Next Billing Date</td>
                                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">30 days from activation</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #374151;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Password</td>
                                <td align="right" style="color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">${generatedPassword}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                                <td style="color: #9ca3af; font-size: 14px; font-family: Arial, sans-serif;">Status</td>
                                <td align="right" style="color: #4ade80; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;" class="mobile-stack">Active</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>
                            
                            <!-- Pro Features -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td style="background-color: #22c55e; background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 12px; padding: 25px;">
                                        
                                        <p style="color: #4ade80; font-size: 18px; font-weight: bold; margin: 0 0 20px 0; font-family: Arial, sans-serif;">
                                            ⭐ Your Pro Features
                                        </p>
                                        
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                Unlimited script generation and recordings
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                AI-powered performance feedback and coaching
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                Trend-adaptive prompts for viral content
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                Advanced export tools and formats
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                Priority customer support
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr>
                                                            <td style="width: 20px; height: 20px; background-color: #22c55e; border-radius: 50%; text-align: center; vertical-align: middle;">
                                                                <span style="color: #ffffff; font-size: 12px; font-weight: bold;">✓</span>
                                                            </td>
                                                            <td style="padding-left: 12px; color: #d1d5db; font-size: 14px; font-family: Arial, sans-serif;">
                                                                Early access to new features
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); border-radius: 50px; padding: 16px 32px;">
                                                    <a href="#" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif; display: block;">Start Creating Now</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>        
          `,
    });
  }

  return new NextResponse("Email sent successfully", {
    status: 200,
  });
}
