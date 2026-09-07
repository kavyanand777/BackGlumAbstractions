import { Router, type IRouter } from "express";
import expensesRouter from "./expenses";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);

export default router;
