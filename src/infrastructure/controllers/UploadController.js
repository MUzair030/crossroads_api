import multer from 'multer';
import express from 'express';
import CommonResponse from '../../application/common/CommonResponse.js';
import UploadService from '../application/services/UploadService.js';

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
          result.push(await userService.updateProfilePicture(id, file));
          break;
        case 'group':
          result.push(await groupService.addBannerImage(id, file));
          break;
        case 'event':
          result.push(await eventService.addEventMedia(id, file));
          break;
        case 'service':
          result.push(await serviceService.addServiceMedia(id, file));
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
