import express from 'express';
import passport from '../../application/services/GoogleAuthService.js';
import CommonResponse from '../../application/common/CommonResponse.js';
import TicketService from '../../application/services/TicketService.js';

const router = express.Router();

// 1. Add Ticket to Event
router.post(
  '/:id/ticket',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await TicketService.addTicket(req.params.id, req.body, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 2. Update Ticket
router.put(
  '/:id/ticket/:tid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await Ticket.updateTicket(req.params.id, req.params.tid, req.body, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 3. Delete Ticket
router.delete(
  '/:id/ticket/:tid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await Ticket.deleteTicket(req.params.id, req.params.tid, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 4. Purchase Ticket
router.post(
  '/:id/purchase',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await TicketService.purchaseTicket(req.params.id, req.body.ticketId, req.user.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

// 5. Get User Passes
router.get(
  '/user/:id/passes',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const result = await TicketService.getUserPasses(req.params.id);
      CommonResponse.success(res, result);
    } catch (err) {
      CommonResponse.error(res, err.message, 400);
    }
  }
);

export default router;
