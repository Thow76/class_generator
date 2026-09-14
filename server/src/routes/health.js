import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "lesson-source-builder-api",
    phase: "6"
  });
});

export default router;
