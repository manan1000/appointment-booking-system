import type { Request, Response } from "express";

import { errorResponse, successResponse } from "../lib/response";
import { prisma } from "../lib/prisma";
import { createAppointmentSchema } from "../schemas/appointment.schema";
import { normalizeDate } from "../lib/normalizeDate";
import { timeToMinutes } from "../lib/timeToMinutes";
import { minutesToTime } from "../lib/minutesToTime";

export const createAppointment = async (req: Request, res: Response) => {
    try {

        if (req.role !== "USER") {
            return errorResponse(res, 403, "forbidden");
        }

        const parsedData = createAppointmentSchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "invalid slotId or time");
        }

        const { slotId } = parsedData.data;
        const parts = slotId.split("_");
        if (parts.length !== 3) {
            return errorResponse(res, 400, "invalid slotId");
        }
        const [serviceId, dateStr, startTime] = parts as [string, string, string];

        const inputDate = new Date(dateStr);
        if (isNaN(inputDate.getTime())) {
            return errorResponse(res, 400, "invalid slotId or time");
        }

        const today = normalizeDate(new Date());
        const given = normalizeDate(inputDate);

        if (given < today) {
            return errorResponse(res, 400, "Cannot book past dates");
        }

        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) {
            return errorResponse(res, 404, "service not found");
        }
        if (service.providerId === req.userId) {
            return errorResponse(res, 403, "cannot book own service");
        }


        const duration = service.durationMinutes;

        const start = timeToMinutes(startTime);
        const end = start + duration;

        // 5. Check availability
        const availability = await prisma.availability.findMany({
            where: {
                serviceId,
                dayOfWeek: given.getDay()
            }
        });

        const isWithinAvailability = availability.some(av => {
            const avStart = timeToMinutes(av.startTime);
            const avEnd = timeToMinutes(av.endTime);

            return start >= avStart && end <= avEnd;
        });

        if (!isWithinAvailability) {
            return errorResponse(res, 400, "slot not within availability");
        }

        if (given.getTime() === today.getTime()) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            if (start <= currentMinutes) {
                return errorResponse(res, 400, "cannot book past time");
            }
        }

        const appointment = await prisma.$transaction(async (tx) => {

            const existing = await tx.appointment.findUnique({
                where: { slotId }
            });

            if (existing) {
                throw new Error("SLOT_TAKEN");
            }

            return await tx.appointment.create({
                data: {
                    userId: req.userId,
                    serviceId,
                    date: dateStr,
                    startTime,
                    endTime: minutesToTime(end),
                    slotId,
                    status: "BOOKED"
                }
            });
        });

        return successResponse(res, 201, {
            id: appointment.id,
            slotId: appointment.slotId,
            status: appointment.status
        });

    } catch (error) {
        if (error instanceof Error && error.message === "SLOT_TAKEN") {
            return errorResponse(res, 400, "SLOT_TAKEN");
        }
        return errorResponse(res, 500, "internal error");
    }
}