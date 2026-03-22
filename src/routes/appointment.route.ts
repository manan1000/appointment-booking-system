import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middlerware";
import { createAppointment } from "../controllers/appointment.controller";

const router = Router();

router.post("/", authMiddleware, createAppointment);
export default router;