import type { Request, Response } from "express";

import { errorResponse, successResponse } from "../lib/response";
import { prisma } from "../lib/prisma";
import { createAvailabilitySchema, createServiceSchema, getServiceSchema } from "../schemas/service.schema";
import { userRole } from "../../generated/prisma/enums";
import { timeToMinutes } from "../lib/timeToMinutes";
import { normalizeDate } from "../lib/normalizeDate";
import { minutesToTime } from "../lib/minutesToTime";

export const createService = async (req: Request, res: Response) => {
    try {
        if (req.role !== userRole.SERVICE_PROVIDER) {
            return errorResponse(res, 403, "Forbidden");
        }
        const parsedData = createServiceSchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { name, type, durationMinutes } = parsedData.data;

        const service = await prisma.service.create({
            data: {
                name,
                type,
                providerId: req.userId,
                durationMinutes
            }
        });

        const data = {
            id: service.id,
            name: service.name,
            type: service.type,
            durationMinutes: service.durationMinutes
        }
        return successResponse(res, 201, data);

    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}

export const createAvailability = async (req: Request, res: Response) => {
    try {
        if (req.role !== userRole.SERVICE_PROVIDER) {
            return errorResponse(res, 403, "Forbidden");
        }
        const parsedData = createAvailabilitySchema.safeParse(req.body);
        if (!parsedData.success) {
            return errorResponse(res, 400, "Invalid input")
        }

        const { dayOfWeek, startTime, endTime } = parsedData.data;
        const serviceId = req.params.serviceId as string;
        const service = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) {
            return errorResponse(res, 404, "service not found");
        }

        if (service.providerId !== req.userId) {
            return errorResponse(res, 403, "service soes not belong to the provider");
        }

        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        if (newStart >= newEnd) {
            return errorResponse(res, 400, "Invalid time range");
        }

        // check overlapping availability

        const existingAvailavbilities = await prisma.availability.findMany({
            where: {
                serviceId,
                dayOfWeek
            }
        });


        if (existingAvailavbilities) {

            for (const slot of existingAvailavbilities) {
                const existingStartTime = timeToMinutes(slot.startTime);
                const existingEndTime = timeToMinutes(slot.endTime);

                const isOverlapping = newStart < existingEndTime && newEnd > existingStartTime;
                if (isOverlapping) {
                    return errorResponse(res, 409, "overlapping availability");
                }
            }

        }

        const availability = await prisma.availability.create({
            data: {
                serviceId,
                dayOfWeek,
                startTime,
                endTime
            }
        });

        const data = {
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime
        };

        return successResponse(res, 201, data);
    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}


export const getService = async (req: Request, res: Response) => {
    try {
        const parsedData = getServiceSchema.safeParse(req.query);
        if (!parsedData.success) {
            return errorResponse(res, 400, "invalid service type");
        }

        const { type } = parsedData.data;
        const where: any = {};

        if (type) {
            where.type = type
        }

        const service = await prisma.service.findMany({
            where,
            include: {
                provider: { select: { name: true } }
            }
        });

        const data = service.map((s) => {
            return {
                id: s.id,
                name: s.name,
                type: s.type,
                durationMinutes: s.durationMinutes,
                providerName: s.provider.name
            }
        });

        return successResponse(res, 200, data);

    } catch (error) {
        return errorResponse(res, 500, "Internal server error");
    }
}

export const getSlotsByDate = async (req: Request, res: Response) => {
    try {
        const dateStr = req.query.date as string;
        const serviceId = req.params.serviceId as string;

        const inputDate = new Date(dateStr);

        if (isNaN(inputDate.getTime())) {
            return errorResponse(res, 400, "invalid date");
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

        const availability = await prisma.availability.findMany({
            where: {
                serviceId,
                dayOfWeek: given.getDay()
            }
        });

        if (availability.length === 0) {
            return successResponse(res, 200, { serviceId, date: dateStr, slots: [] });
        }

        const bookedAppointments = await prisma.appointment.findMany({
            where: {
                serviceId,
                date: dateStr,
                status: "BOOKED"
            }
        });

        const bookingIntervals = bookedAppointments.map((appointment) => {
            return {
                start: timeToMinutes(appointment.startTime),
                end: timeToMinutes(appointment.endTime)
            }
        });

        let slots = [];

        for (const av of availability) {
            let startTime = timeToMinutes(av.startTime);
            let endTime = timeToMinutes(av.endTime);
            let duration = service.durationMinutes;
            let current = startTime;

            while (current + duration <= endTime) {
                let start = current;
                let end = current + duration;

                const isBooked = bookingIntervals.some(b => start < b.end && end > b.start);

                if (!isBooked) {
                    let slot = `${serviceId}_${dateStr}_${minutesToTime(start)}`;
                    slots.push({
                        slotId: slot,
                        startTime: minutesToTime(start),
                        endTime: minutesToTime(end)
                    });
                }
                current += duration;
            }
        }

        if (given.getTime() === today.getTime()) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            slots = slots.filter(s => {
                const start = timeToMinutes(s.startTime);
                return start > currentMinutes;
            });
        }

        const data = {
            serviceId,
            date: dateStr,
            slots
        };

        return successResponse(res, 200, data);

    } catch (error) {
        return errorResponse(res, 500, "internal error");
    }
}