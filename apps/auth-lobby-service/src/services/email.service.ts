import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { authLobbyEnv } from '../config/env';

class EmailService {
  private client: SESClient;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async sendWelcomeEmail(toEmail: string, username: string) {
    const params = {
      Source: process.env.AWS_SES_FROM_EMAIL || 'noreply@gitgud.example.com',
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: 'Welcome to GitGud!',
        },
        Body: {
          Text: {
            Data: `Hello ${username},\n\nWelcome to GitGud! We are excited to have you on board.`,
          },
        },
      },
    };

    try {
      const command = new SendEmailCommand(params);
      await this.client.send(command);
      console.log(`Welcome email sent to ${toEmail}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }
}

export const emailService = new EmailService();
