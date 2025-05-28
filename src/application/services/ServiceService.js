import Service from '../../domain/models/Service.js';
import Booking from '../../domain/models/Booking.js';
import User from '../../domain/models/User.js';

const ServiceService = {
  // 1. Create Service
  async createService(data) {
    const service = new Service(data);
    return await service.save();
  },

  // 2. Get Service by ID
  async getServiceById(serviceId) {
    return await Service.findById(serviceId).lean();
  },

  // 3. Get All Published Services with optional filters
  async getAllPublishedServices(filters = {}) {
    const query = { isPublished: true };

    if (filters.category) query.category = filters.category;
    if (filters.city) query['locationAvailable.cities'] = filters.city;
    if (filters.vendorId) query.vendorId = filters.vendorId;

    return await Service.find(query).lean();
  },

  // 4. Edit Service
  async editService(serviceId, updates, vendorId) {
    const service = await Service.findOneAndUpdate(
      { _id: serviceId, vendorId },
      { $set: updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!service) throw new Error('Service not found or not authorized.');
    return service;
  },

  // 5. Soft Delete (Unpublish) Service
  async unpublishService(serviceId, vendorId) {
    const result = await Service.findOneAndUpdate(
      { _id: serviceId, vendorId },
      { $set: { isPublished: false, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!result) throw new Error('Service not found or not authorized.');
    return { message: 'Service unpublished successfully.' };
  },

  // 6. Search Services
  async searchServices({ query = '', page = 1, limit = 10 }) {
  const searchConditions = { isPublished: true };

  if (query) {
    const regex = new RegExp('^' + query, 'i'); // starts with query, case-insensitive
    searchConditions.$or = [
      { title: regex },
      { category: regex },
      { 'locationAvailable.cities': query }  // exact match in cities array
    ];
  }

  const services = await Service.find(searchConditions)
    .skip((page - 1) * limit)
    .limit(limit);

  return services;
}
,


  // 7. Get Services by Vendor (no .lean())
async getVendorServices(vendorId) {
  return await Service.find({ vendorId });
},



async  bookService(req, res) {
  const { serviceId, selectedDates, addons, inquiryMessage } = req.body;
  const userId = req.user.id;

  try {
    const service = await Service.findById(serviceId);
    if (!service) return {message:'Service not found' };

    const booking = await Booking.create({
      serviceId,
      userId,
      selectedDates,
      addons,
      inquiryMessage,
      isNegotiable: service.pricingMode === 'negotiable'
    });

    // Add to user's own bookings
    await User.findByIdAndUpdate(userId, {
      $push: { myBookings: booking._id }
    });

    // Add to vendor's received bookings
    await User.findByIdAndUpdate(service.vendorId, {
      $push: { receivedBookings: booking._id }
    });

    return  { bookingId: booking._id };
  } catch (err) {
    return  { error: err.message };
  }
},
async acceptBooking(req, res) {
  const { bookingId, finalPrice, adminMessage } = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'accepted',
        finalPrice,
        adminMessage
      },
      { new: true }
    );

    if (!booking) return CommonResponse.error(res, 'Booking not found', 404);

    // Notify user (email, notification)
    return CommonResponse.success(res, { message: 'Booking accepted', booking });
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async  rejectBooking(req, res) {
  const { bookingId, adminMessage } = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'rejected',
        adminMessage
      },
      { new: true }
    );

    if (!booking) return CommonResponse.error(res, 'Booking not found', 404);

    // Notify user
    return CommonResponse.success(res, { message: 'Booking rejected', booking });
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},
async  counterOfferBooking(req, res) {
  const { bookingId, counterOffer, message } = req.body;
  const userId = req.user.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return CommonResponse.error(res, 'Booking not found', 404);
    if (booking.userId.toString() !== userId) {
      return CommonResponse.error(res, 'Unauthorized', 403);
    }

    booking.status = 'countered';
    booking.userResponse = {
      accepted: false,
      counterOffer,
      message
    };
    await booking.save();

    // Notify admin
    return CommonResponse.success(res, { message: 'Counter offer sent', booking });
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async confirmBooking(req, res) {
  const { bookingId } = req.body;
  const userId = req.user.id;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return CommonResponse.error(res, 'Booking not found', 404);
    if (booking.userId.toString() !== userId) {
      return CommonResponse.error(res, 'Unauthorized', 403);
    }

    booking.status = 'confirmed';
    booking.userResponse = { accepted: true };
    await booking.save();

    // Redirect to payment flow (or mark as paid if prepaid)
    return CommonResponse.success(res, { message: 'Booking confirmed', booking });
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async  markBookingAsPaid(bookingId) {
  await Booking.findByIdAndUpdate(bookingId, {
    paymentDone: true
  });
},


async  getBookingsByServiceId(req, res) {
  const { serviceId } = req.params;

  try {
    const bookings = await Booking.find({ serviceId }).populate('userId', 'name email');
    return CommonResponse.success(res, bookings);
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async  getMyBookingsAsClient(req, res) {
  const userId = req.user.id;

  try {
    const bookings = await Booking.find({ userId })
      .populate('serviceId', 'title vendorId')
      .populate({
        path: 'serviceId',
        populate: { path: 'vendorId', select: 'name email' },
      });

    return CommonResponse.success(res, bookings);
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
},

async  getMyBookingsAsVendor(req, res) {
  const vendorId = req.user.id;

  try {
    const myServices = await Service.find({ vendorId }, '_id');
    const myServiceIds = myServices.map(service => service._id);

    const bookings = await Booking.find({ serviceId: { $in: myServiceIds } })
      .populate('userId', 'name email')
      .populate('serviceId', 'title');

    return CommonResponse.success(res, bookings);
  } catch (err) {
    return CommonResponse.error(res, err.message, 500);
  }
}











};

export default ServiceService;
