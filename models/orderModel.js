const mongoose = require("mongoose");
const { AutoIncrementID } = require("@typegoose/auto-increment");

const orderSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true }, // This will be auto-incremented
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "order must belong to user"],
    },
    cartItems: [
      {
        product: { type: mongoose.Schema.ObjectId, ref: "Product" },
        count: { type: Number, default: 1 },
        color: String,
        price: Number,
      },
    ],
    shippingAddress: {
      details: String,
      phone: String,
      city: String,
      postalCode: String,
    },
    taxPrice: {
      type: Number,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      default: 0.0,
    },
    totalOrderPrice: {
      type: Number,
      default: 0.0,
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash"],
      default: "cash",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name profileImg email phone",
  }).populate({
    path: "cartItems.product",
    select: "title imageCover ratingsAverage ratingsQuantity",
  });

  next();
});

// Initialize auto-increment
orderSchema.plugin(AutoIncrementID, {
  field: "id",
  startAt: 1,
  incrementBy: 1,
  trackerCollection: "counters", // Optional: name of the counter collection
  trackerModelName: "Counter", // Optional: name of the counter model
});

const Order = mongoose.model("Order", orderSchema);

// Create indexes for better query performance
Order.collection.createIndex({ user: 1 });
Order.collection.createIndex({ id: 1 }, { unique: true });

module.exports = Order;
