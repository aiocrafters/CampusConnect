
'use server';
/**
 * @fileOverview A flow for sending emails.
 *
 * This file defines a Genkit flow for sending a welcome email to new teachers,
 * including their login credentials.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WelcomeEmailInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient.'),
  name: z.string().describe('The name of the recipient.'),
  password: z.string().describe('The password for the new account.'),
});

export type WelcomeEmailInput = z.infer<typeof WelcomeEmailInputSchema>;

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  await sendWelcomeEmailFlow(input);
}

const sendWelcomeEmailFlow = ai.defineFlow(
  {
    name: 'sendWelcomeEmailFlow',
    inputSchema: WelcomeEmailInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    // In a real-world scenario, you would integrate with an email sending service
    // like SendGrid, Mailgun, or AWS SES here.
    // For this example, we will just log the action to the console.
    console.log(`
      ================================================
      DUMMY EMAIL SENDER
      ================================================
      TO: ${input.to}
      SUBJECT: Welcome to CampusConnect!

      Hello ${input.name},

      Welcome to CampusConnect! An account has been created for you.
      You can now log in to the teacher portal using the following credentials:

      Email: ${input.to}
      Password: ${input.password}

      Please change your password after your first login.

      Best regards,
      The CampusConnect Team
      ================================================
    `);
  }
);

    