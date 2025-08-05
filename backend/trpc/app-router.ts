import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { extractReceiptProcedure } from "./routes/receipts/extract/route";
import { updateReceiptProcedure } from "./routes/receipts/update/route";
import { checkReceiptProcedure } from "./routes/receipts/check/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  receipts: createTRPCRouter({
    extract: extractReceiptProcedure,
    update: updateReceiptProcedure,
    check: checkReceiptProcedure,
  }),
});

export type AppRouter = typeof appRouter;