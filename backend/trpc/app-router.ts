import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { extractReceiptProcedure } from "./routes/receipts/extract/route";
import { updateReceiptProcedure } from "./routes/receipts/update/route";
import { checkReceiptProcedure } from "./routes/receipts/check/route";
import { processOCRProcedure, reprocessOCRProcedure, batchProcessOCRProcedure } from "./routes/ocr/process/route";
import { suggestTitleProcedure } from "./routes/ai/suggest-title/route";
import { suggestTagsProcedure } from "./routes/ai/suggest-tags/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  receipts: createTRPCRouter({
    extract: extractReceiptProcedure,
    update: updateReceiptProcedure,
    check: checkReceiptProcedure,
  }),
  ocr: createTRPCRouter({
    process: processOCRProcedure,
    reprocess: reprocessOCRProcedure,
    batchProcess: batchProcessOCRProcedure,
  }),
  ai: createTRPCRouter({
    suggestTitle: suggestTitleProcedure,
    suggestTags: suggestTagsProcedure,
  }),
});

export type AppRouter = typeof appRouter;