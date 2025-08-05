import { router } from './create-context';
import { checkReceiptProcedure } from './routes/receipts/check/route';
import { extractReceiptProcedure } from './routes/receipts/extract/route';
import { updateReceiptProcedure } from './routes/receipts/update/route';

// Import example route
import exampleHiRoute from './routes/example/hi/route';

export const appRouter = router({
  example: router({
    hi: exampleHiRoute,
  }),
  receipts: router({
    check: checkReceiptProcedure,
    extract: extractReceiptProcedure,
    update: updateReceiptProcedure,
  }),
});

export type AppRouter = typeof appRouter;