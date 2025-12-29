import { Router } from 'express';
import * as controller from './workflow.controller.js';

const router = Router();

router.get('/stats/schemas', controller.getSchemaStats);
router.get('/stats/tables/:schema', controller.getTableStats);
router.get('/stats/live', controller.getLiveStats);

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
