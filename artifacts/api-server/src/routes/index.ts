import { Router, type IRouter } from "express";
import expensesRouter from "./expenses";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import budgetsRouter from "./budgets";
import dashboardRouter from "./dashboard";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(budgetsRouter);
router.use(dashboardRouter);

export default router;
