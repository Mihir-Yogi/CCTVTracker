import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import combosRouter from "./combos";
import devicesRouter from "./devices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(combosRouter);
router.use(devicesRouter);

export default router;
