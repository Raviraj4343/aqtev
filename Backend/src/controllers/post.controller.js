import multer from "multer";
import crypto from "crypto";
import Post from "../models/post.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { POST_IMAGE_MAX_SIZE, POST_IMAGES_UPLOAD_LIMIT } from "../constants.js";

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: POST_IMAGE_MAX_SIZE,
    files: POST_IMAGES_UPLOAD_LIMIT,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new ApiError(400, "Please upload valid image files only."));
      return;
    }
    cb(null, true);
  },
});

const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, "Cloudinary is not configured on the server.");
  }

  return { cloudName, apiKey, apiSecret };
};

const signCloudinaryParams = (params, apiSecret) => {
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
};

const uploadImageToCloudinary = async (file, userId) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "fitcek/posts";
  const publicId = `post_${userId}_${Date.now()}_${Math.round(Math.random() * 10000)}`;
  const signature = signCloudinaryParams(
    { folder, public_id: publicId, timestamp },
    apiSecret
  );

  const form = new FormData();
  form.append(
    "file",
    new Blob([file.buffer], {
      type: file.mimetype || "application/octet-stream",
    }),
    file.originalname || "post-image.png"
  );
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new ApiError(
      502,
      payload?.error?.message || "Unable to upload post image."
    );
  }

  return payload;
};

const removeImageFromCloudinary = async (publicId) => {
  if (!publicId) return;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signCloudinaryParams({ public_id: publicId, timestamp }, apiSecret);

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  }).catch(() => {});
};

const populatePostQuery = (query, { lightweight = false } = {}) => {
  const withAuthor = query.populate(
    "author",
    "name avatarUrl goal activityLevel dietPreference"
  );

  if (lightweight) return withAuthor;

  return withAuthor.populate("comments.author", "name avatarUrl");
};

const toPostPayload = (post, currentUserId) => {
  const payload =
    typeof post?.toObject === "function"
      ? post.toObject({ versionKey: false })
      : { ...post };
  const normalizedCurrentUserId = String(currentUserId || "");

  return {
    ...payload,
    likeCount: Array.isArray(payload.likes) ? payload.likes.length : 0,
    commentCount: Array.isArray(payload.comments) ? payload.comments.length : 0,
    likedByMe: Array.isArray(payload.likes)
      ? payload.likes.some((id) => String(id) === normalizedCurrentUserId)
      : false,
  };
};

const listPosts = asyncHandler(async (req, res) => {
  const { author } = req.query;
  const filter = {};
  const parsedLimit = Number.parseInt(String(req.query?.limit || "40"), 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 40)
    : 40;
  const lightweight =
    String(req.query?.lightweight || "").trim() === "1" ||
    String(req.query?.preview || "").trim() === "1";

  if (author) filter.author = author;

  const baseQuery = Post.find(filter).sort({ createdAt: -1 }).limit(limit);

  if (lightweight) {
    baseQuery.select("author title description images likes viewsCount createdAt");
  }

  const posts = await populatePostQuery(baseQuery, { lightweight }).lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      posts.map((post) => toPostPayload(post, req.user?._id)),
      "Community posts fetched successfully."
    )
  );
});

const createPost = asyncHandler(async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();

  if (title.length < 5) {
    throw new ApiError(400, "Title must be at least 5 characters long.");
  }

  if (description.length < 10) {
    throw new ApiError(400, "Description must be at least 10 characters long.");
  }

  const files = Array.isArray(req.files) ? req.files : [];
  const uploadedImages = [];

  for (const file of files) {
    const uploaded = await uploadImageToCloudinary(file, req.user._id);
    uploadedImages.push({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    });
  }

  const post = await Post.create({
    author: req.user._id,
    title,
    description,
    images: uploadedImages,
  });

  const savedPost = await populatePostQuery(Post.findById(post._id));

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        toPostPayload(savedPost, req.user._id),
        "Post published successfully."
      )
    );
});

const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, "Post not found.");

  const userId = String(req.user._id);
  const alreadyLiked = post.likes.some((id) => String(id) === userId);

  post.likes = alreadyLiked
    ? post.likes.filter((id) => String(id) !== userId)
    : [...post.likes, req.user._id];

  await post.save();

  const savedPost = await populatePostQuery(Post.findById(post._id));

  return res.status(200).json(
    new ApiResponse(
      200,
      toPostPayload(savedPost, req.user._id),
      alreadyLiked ? "Post like removed." : "Post liked successfully."
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (text.length < 1) {
    throw new ApiError(400, "Comment text is required.");
  }

  const post = await Post.findById(req.params.postId);
  if (!post) throw new ApiError(404, "Post not found.");

  post.comments.push({
    author: req.user._id,
    text,
  });
  await post.save();

  const savedPost = await populatePostQuery(Post.findById(post._id));

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        toPostPayload(savedPost, req.user._id),
        "Comment added successfully."
      )
    );
});

const recordView = asyncHandler(async (req, res) => {
  const post = await populatePostQuery(
    Post.findByIdAndUpdate(
      req.params.postId,
      { $inc: { viewsCount: 1 } },
      { new: true }
    )
  );

  if (!post) throw new ApiError(404, "Post not found.");

  return res
    .status(200)
    .json(new ApiResponse(200, toPostPayload(post, req.user._id), "Post view recorded."));
});

const recordViewsBulk = asyncHandler(async (req, res) => {
  const postIds = Array.isArray(req.body?.postIds)
    ? [...new Set(req.body.postIds.map((value) => String(value || "").trim()).filter(Boolean))]
    : [];

  if (!postIds.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, { updated: 0 }, "No post views to record."));
  }

  const result = await Post.updateMany(
    { _id: { $in: postIds } },
    { $inc: { viewsCount: 1 } }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { updated: Number(result?.modifiedCount || 0) },
      "Post views recorded."
    )
  );
});

const deletePost = asyncHandler(async (req, res) => {
  if (req.user?.role !== "super_admin") {
    throw new ApiError(403, "Only super-admin can delete posts.");
  }

  const post = await Post.findById(req.params.postId).select("images");
  if (!post) throw new ApiError(404, "Post not found.");

  const images = Array.isArray(post.images) ? post.images : [];
  await Promise.all(images.map((image) => removeImageFromCloudinary(image?.publicId)));

  await Post.deleteOne({ _id: post._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { postId: String(post._id) }, "Post deleted successfully."));
});

export default {
  imageUpload,
  listPosts,
  createPost,
  toggleLike,
  addComment,
  recordView,
  recordViewsBulk,
  deletePost,
};
