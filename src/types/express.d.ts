import type { userRole } from "../../generated/prisma/enums";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      role: userRole;
    }
  }
}
