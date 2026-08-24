import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

if (config.email.mode === 'smtp' && config.email.smtpUser) {
  transporter = nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: config.email.smtpPort === 465,
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPass,
    },
  });
}

export interface BookingEmailPayload {
  toEmail: string;
  userName: string;
  bookingRef: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  seats: string[];
  totalPrice: number;
  qrCodeDataUrl: string;
}

export interface WaitlistOfferEmailPayload {
  toEmail: string;
  userName: string;
  eventTitle: string;
  category: string;
  offerToken: string;
  expiresAt: string;
}

export const sendBookingConfirmationEmail = async (payload: BookingEmailPayload) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Ref: ${payload.bookingRef}</p>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #1e293b;">
        <p>Hi <strong>${payload.userName}</strong>,</p>
        <p>Your booking for <strong>${payload.eventTitle}</strong> is successfully confirmed!</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b;">Event:</td><td style="font-weight: bold;">${payload.eventTitle}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Date & Time:</td><td style="font-weight: bold;">${payload.eventDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Venue:</td><td style="font-weight: bold;">${payload.venueName}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Seats:</td><td style="font-weight: bold;">${payload.seats.join(', ')}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Total Paid:</td><td style="font-weight: bold; color: #16a34a;">₹${payload.totalPrice.toFixed(2)}</td></tr>
        </table>

        <div style="text-align: center; margin: 30px 0;">
          <p style="margin-bottom: 10px; font-weight: bold; color: #475569;">Scan QR Code at Venue Entry</p>
          <img src="${payload.qrCodeDataUrl}" alt="QR Ticket" style="width: 200px; height: 200px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px;" />
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        Thank you for using TicketBooking Platform. Enjoy your show!
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.email.from,
        to: payload.toEmail,
        subject: `Booking Confirmed: ${payload.eventTitle} (${payload.bookingRef})`,
        html: htmlContent,
      });
      console.log(`[Email Service] Sent confirmation email to ${payload.toEmail}`);
    } catch (err) {
      console.error('[Email Service Error]', err);
    }
  } else {
    console.log(`\n=================== [MOCK EMAIL SENT] ===================`);
    console.log(`To: ${payload.toEmail}`);
    console.log(`Subject: Booking Confirmed: ${payload.eventTitle} (${payload.bookingRef})`);
    console.log(`Ref: ${payload.bookingRef} | Seats: ${payload.seats.join(', ')} | Total: ₹${payload.totalPrice}`);
    console.log(`=========================================================\n`);
  }
};

export const sendWaitlistOfferEmail = async (payload: WaitlistOfferEmailPayload) => {
  const offerUrl = `${config.frontendUrl}/waitlist/offer?token=${payload.offerToken}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #d97706; padding: 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Seat Available from Waitlist!</h1>
      </div>
      <div style="padding: 24px;">
        <p>Hi <strong>${payload.userName}</strong>,</p>
        <p>Great news! A <strong>${payload.category}</strong> seat has opened up for <strong>${payload.eventTitle}</strong>.</p>
        <p>You have been offered this seat. You must complete your booking before <strong>${payload.expiresAt}</strong>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${offerUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Claim Your Seat Now</a>
        </div>
        
        <p style="font-size: 12px; color: #64748b;">If you do not accept this offer before it expires, the seat will automatically be offered to the next person on the waitlist.</p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.email.from,
        to: payload.toEmail,
        subject: `Waitlist Seat Available: ${payload.eventTitle}`,
        html: htmlContent,
      });
      console.log(`[Email Service] Sent waitlist offer email to ${payload.toEmail}`);
    } catch (err) {
      console.error('[Email Service Error]', err);
    }
  } else {
    console.log(`\n=================== [MOCK WAITLIST OFFER EMAIL] ===================`);
    console.log(`To: ${payload.toEmail}`);
    console.log(`Subject: Waitlist Seat Available: ${payload.eventTitle}`);
    console.log(`Claim Link: ${offerUrl}`);
    console.log(`Expires: ${payload.expiresAt}`);
    console.log(`===================================================================\n`);
  }
};
