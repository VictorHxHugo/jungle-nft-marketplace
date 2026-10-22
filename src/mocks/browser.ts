import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { authHandlers } from "./authHandlers";
import { socketHandlers } from "./socket";

export const worker = setupWorker(...handlers, ...authHandlers, ...socketHandlers);
