import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { authHandlers } from "./authHandlers";

export const worker = setupWorker(...handlers, ...authHandlers);
