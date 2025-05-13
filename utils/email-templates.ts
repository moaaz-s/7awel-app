/**
 * Email template utility functions
 * Provides standardized email templates for various app communications
 */

/**
 * Generates an email verification template with both one-click link and fallback code
 * 
 * @param verificationUrl The URL with token for one-click verification
 * @param code The 6-digit fallback verification code
 * @returns Email template with subject and HTML content
 */
export function emailVerificationTemplate({ verificationUrl, code }: {
  verificationUrl: string;
  code: string;
}) {
  // Format the code with a space in the middle for better readability
  const formattedCode = `${code.substring(0, 3)} ${code.substring(3)}`;
  
  return {
    subject: "Verify your email - 7awwl",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
        <style>
          body {
            font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #131d27;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
          }
          .header {
            margin-bottom: 30px;
            text-align: center;
          }
          .header h1 {
            color: #5e3aff;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #5e3aff, #73bbff);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
            margin: 20px 0;
          }
          .code-container {
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 6px;
            text-align: center;
          }
          .code {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #5e3aff;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            font-size: 13px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <!-- Logo image would go here -->
            <svg width="120" height="40" viewBox="0 0 120 40">
              <rect width="120" height="40" fill="none"/>
              <text x="10" y="25" font-family="Arial" font-size="20" font-weight="bold" fill="#5e3aff">7awwl</text>
            </svg>
          </div>
          
          <div class="header">
            <h1>Verify your email</h1>
            <p>Thanks for signing up! Please verify your email to continue.</p>
          </div>
          
          <div class="content">
            <p>Please click the button below to verify your email address. This link will expire in 10 minutes.</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </div>
            
            <p>If the button doesn't work, you can also enter this verification code in the app:</p>
            
            <div class="code-container">
              <div class="code">${formattedCode}</div>
            </div>
            
            <p><strong>Note:</strong> This link and code are valid for 10 minutes and can only be used once.</p>
          </div>
          
          <div class="footer">
            <p>If you didn't request this email, please ignore it or contact support if you have concerns.</p>
            <p>&copy; 2025 7awwl. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
