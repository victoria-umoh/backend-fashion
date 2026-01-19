import express from 'express';
import { registerUser as register, authUser as login } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;