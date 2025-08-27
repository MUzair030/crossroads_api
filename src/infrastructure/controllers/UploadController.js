import multer from 'multer';
import express from 'express';
import CommonResponse from '../../application/common/CommonResponse.js';
import ServiceService from '../../application/services/ServiceService.js';
import UserManagementService from '../../application/services/UserManagementService.js';
import GroupService from '../../application/services/GroupService.js';
import EventService from '../../application/services/EventService.js';

const router = express.Router();
const upload = multer(); // in-memory storage for S3
router.post('/:type/:id/media', upload.array('files'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return CommonResponse.error(res, 'No files uploaded', 400);
    }

    let result = [];

    for (const file of files) {
      switch (type) {
        case 'user':
          result.push(await UserManagementService.updateProfilePicture(id, file));
          break;
        case 'group':
          result.push(await GroupService.addBannerImage(id, file));
          break;
        case 'event':
          result.push(await EventService.addEventMedia(id, file));
          break;
        case 'service':
          result.push(await ServiceService.addServiceMedia(id, file));
          break;
        default:
          return CommonResponse.error(res, 'Invalid type', 400);
      }
    }

    CommonResponse.success(res, result);
  } catch (error) {
    CommonResponse.error(res, error.message, 500);
  }
});



export default router;
