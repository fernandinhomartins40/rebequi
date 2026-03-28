import { Router } from 'express';
import { z } from 'zod';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { createManagedUserSchema, managedUserFiltersSchema, updateManagedUserSchema } from '@rebequi/shared/schemas';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware.js';

const router: Router = Router();
const userController = new UserController();
const accessRoles = getRolesForMerchantPermission('access:manage');
const idParamSchema = z.object({
  id: z.string().min(1),
});

router.get('/', authenticate, authorize(...accessRoles), validateQuery(managedUserFiltersSchema), userController.listManagedUsers);
router.post('/', authenticate, authorize(...accessRoles), validateBody(createManagedUserSchema), userController.createManagedUser);
router.patch(
  '/:id',
  authenticate,
  authorize(...accessRoles),
  validateParams(idParamSchema),
  validateBody(updateManagedUserSchema),
  userController.updateManagedUser,
);

export default router;
