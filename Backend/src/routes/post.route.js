import express from "express";
import { protect, requireEmailVerified } from "../middlewares/auth.middleware.js";
import postController from "../controllers/post.controller.js";
import { POST_IMAGES_UPLOAD_LIMIT } from "../constants.js";

const router = express.Router();

router.use(protect, requireEmailVerified);

router.get("/", postController.listPosts);
router.post("/", postController.imageUpload.array("images", POST_IMAGES_UPLOAD_LIMIT), postController.createPost);
router.post("/:postId/like", postController.toggleLike);
router.post("/:postId/comment", postController.addComment);
router.post("/:postId/view", postController.recordView);

export default router;
