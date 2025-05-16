import Service from '../../domain/models/Service.js';

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
  async searchServices(query, page = 1, limit = 10) {
    const regex = new RegExp(query, 'i');
    const services = await Service.find({
      isPublished: true,
      $or: [
        { title: regex },
        { description: regex },
        { customTags: regex }
      ]
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return services;
  },

  // 7. Get Services by Vendor (no .lean())
async getVendorServices(vendorId) {
  return await Service.find({ vendorId });
}

};

export default ServiceService;
