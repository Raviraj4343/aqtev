import mongoose from "mongoose";
import { POST_IMAGES_UPLOAD_LIMIT, POST_IMAGE_MAX_SIZE } from "../constants.js";

const postCommentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 800,
    },
  },
  {
    timestamps: true,
    _id: true,
  }
);

const postImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
  },
  {
    _id: false,
  }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    images: {
      type: [postImageSchema],
      default: [],
      validate: {
        validator: (value = []) => value.length <= POST_IMAGES_UPLOAD_LIMIT,
        message: "A post can include up to POST_IMAGES_UPLOAD_LIMIT images.",
      },
    },
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    comments: {
      type: [postCommentSchema],
      default: [],
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);

export default Post;
