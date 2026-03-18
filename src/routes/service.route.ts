import { Router } from "express";
import { createAvailability, createService } from "../controllers/service.controller";
import { authMiddleware } from "../middlewares/auth.middlerware";

const router = Router();

router.post("/", authMiddleware, createService);
router.post("/:serviceId/availability", authMiddleware, createAvailability);

export default router;