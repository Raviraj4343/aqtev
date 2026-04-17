import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    payloadHash: {
      type: String,
      default: null,
      trim: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

webhookEventSchema.index({ source: 1, eventId: 1 }, { unique: true });

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
