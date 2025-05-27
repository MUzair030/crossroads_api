// services/ticketService.js
import Event from '../../domain/models/Event.js';
import TicketPurchase from '../../domain/models/TicketPurchase.js';
import User from '../../domain/models/User.js';
import Ticket from '../../domain/models/Ticket.js';
import QRCode from 'qrcode'; // npm install qrcode


class TicketService{

async addTicket(eventId, userId, ticketData) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  if (!Array.isArray(event.tickets)) {
    event.tickets = [];
  }

  // Create and save ticket first
  const newTicket = new Ticket({ ...ticketData, eventId });
  await newTicket.save();

  // Push the ticket ObjectId to event.tickets array
  event.tickets.push(newTicket._id);
  await event.save();

  return event.tickets;
}

// --- Update Ticket ---
async  updateTicket(eventId, userId, ticketId, updatedData) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  const ticket = await Ticket.findOne({ _id: ticketId, eventId });
  if (!ticket) throw new Error("Ticket not found");

  const protectedFields = ['sold'];
  for (const key in updatedData) {
    if (!protectedFields.includes(key)) {
      ticket[key] = updatedData[key];
    }
  }

  await ticket.save();
  return ticket;
}

// --- Delete Ticket ---
async  deleteTicket(eventId, userId, ticketId) {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  const ticket = await Ticket.findOne({ _id: ticketId, eventId });
  if (!ticket) throw new Error("Ticket not found");

  if (ticket.sold > 0) {
    throw new Error("Cannot delete ticket with sales");
  }

  await Ticket.deleteOne({ _id: ticketId });

  // Remove ticket reference from event
  event.tickets = event.tickets.filter(id => id.toString() !== ticketId);
  await event.save();

  return { message: "Ticket deleted" };
}

// --- Purchase Ticket ---
async  purchaseTicket(eventId, ticketId, quantity, userId) {
  const ticket = await Ticket.findOne({ _id: ticketId, eventId });
  if (!ticket) throw new Error("Ticket not found");

  if (ticket.quantity - ticket.sold < quantity) {
    throw new Error("Not enough tickets available");
  }

  // Update sold count
  ticket.sold += quantity;
  await ticket.save();

  const purchase = new TicketPurchase({
    userId,
    eventId,
    ticketId,
    quantity,
  });
  await purchase.save();

  // Generate QR code payload for this purchase
  const qrPayload = JSON.stringify({
    purchaseId: purchase._id.toString(),
    eventId: eventId.toString(),
    ticketId: ticketId.toString(),
    quantity,
    issuedAt: purchase.purchaseDate.toISOString(),
    // optionally add other info like userId or a signature here
  });

  // Generate QR code data URI
  const qrCodeDataUri = await QRCode.toDataURL(qrPayload);

  // Optionally, save this QR data URI to purchase for quick access
  purchase.qrCode = qrCodeDataUri;
  await purchase.save();

  // Update user's passes
  await User.findByIdAndUpdate(userId, {
    $push: { myPasses: purchase._id }
  });

  return {
    message: "Purchase successful",
    ticketType: ticket.title,
    quantity,
    purchaseId: purchase._id,
    qrCode: qrCodeDataUri, // Send QR code back so frontend can show it immediately
  };
}

// --- Get User's Purchased Tickets ---
 async  getUserPasses(userId) {
  return await TicketPurchase.find({ userId })
    .populate('eventId','title dates locations organizerId organizerName description bannerImages')
    .populate('ticketId');
}

}
export default new TicketService();
