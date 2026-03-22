import { Router } from "express";
import { createAvailability, createService, getService, getSlotsByDate } from "../controllers/service.controller";
import { authMiddleware } from "../middlewares/auth.middlerware";

const router = Router();

router.post("/", authMiddleware, createService);
router.get("/", getService);
router.post("/:serviceId/availability", authMiddleware, createAvailability);
router.get("/:serviceId/slots", authMiddleware, getSlotsByDate);

export default router;