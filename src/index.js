const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const port = 3000;
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.set("strictQuery", false);
const Schema = mongoose.Schema;
const cartSchema = new Schema(
  {
    userEntity: {
      id: Number,
    },
    productEntity: {
      id: Number,
      title: String,
      price: Number,
      description: String,
    },
    quantity: Number,
    total: Number,
    image: String,
  },

  { timestamps: true, collectionOptions: "carts" }
);

const notificationItemSchema = new Schema(
  {
    userId: Number,
    productEntity: {
      title: String,
    },
    quantity: Number,
    total: Number,
    image: String,
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    items: [notificationItemSchema],
    isRead: { type: Boolean, default: false },
    userId: Number,
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);
try {
  mongoose.connect(
    "mongodb+srv://dath33603:G7vS2ro9mmsxI98H@cluster0.thjesfk.mongodb.net/backend_newware",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
  console.log("connect successfully");
} catch (error) {
  console.log(error);
}

const Cart = mongoose.model("Cart", cartSchema);
const Notification = mongoose.model("Notification", notificationSchema);

io.on("connection", (client) => {
  let couter = 0;
  console.log("connect from client");
  client.on("disconnect", () => console.log("disconnet from client"));
  client.on("viewNotification", () => {
    couter = 0;
    return client.emit("notificationCouter", `${couter}`);
  });
  client.on("checkoutCart", () => {
    couter++;
    return client.emit("notificationCouter", `${couter}`);
  });
});
app.post("/addToCart", async (req, res) => {
  try {
    const productId = req.body.productEntity.id;
    const userId = req.body.userEntity.id;
    const quantity = req.body.quantity;
    const image = req.body.image;
    Cart.findOne({
      "productEntity.id": productId,
      "userEntity.id": userId,
      image: image,
    }).then(async (values) => {
      if (values) {
        const newQuantity = values.quantity + quantity;
        const newObj = { ...req.body };
        newObj.quantity = newQuantity;
        newObj.total = newQuantity * newObj.productEntity.price;
        await Cart.findOneAndUpdate({ "productEntity.id": productId }, newObj);
        res.json({
          statusCode: 200,
          message: "Đặt hàng thành công",
        });
      } else {
        await Cart.create(req.body);
        res.json({
          statusCode: 200,
          message: "Đặt hàng thành công",
        });
      }
    });
  } catch (error) {
    console.error("Lỗi: " + error);
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi trong quá trình xử lý đặt hàng",
    });
  }
});
app.post("/checkoutCart", async (req, res) => {
  try {
    const userId = req.body[0].userEntity.id;
    Cart.deleteMany({ "userEntity.id": userId }).then((values) => {});
    const item = {
      items: [...req.body],
      userId: userId,
    };
    await Notification.create(item);
    res.json({
      statusCode: 200,
      message: "Mua hàng thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi trong quá trình xử lý yêu cầu.",
    });
  }
});
app.post("/updateCart", async (req, res) => {
  try {
    const userId = req.body[0].userEntity.id;
    await Cart.deleteMany({ "userEntity.id": userId }).then((values) => {});
    await Cart.insertMany(req.body);
    res.json({
      statusCode: 200,
      message: "Update cart thành công",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Lỗi trong quá trình xử lý yêu cầu.",
    });
  }
});

app.get("/notify/:userId", (req, res) => {
  let { userId } = req.params;
  const userIdReplace = userId.replace(":", "");
  Notification.find({ userId: userIdReplace })
    .sort({ createdAt: -1 })
    .then((values) => {
      const notify = values.map((item, index) => {
        return {
          id: item._id,
          createdAt: item.createdAt,
          isRead: item.isRead,
          image: item.items.length == 1 ? item.items[0]?.image : null,
        };
      });

      return res.json(notify);
    });
});
app.get("/cart", (req, res) => {
  Cart.find().then((values) => {
    console.log(values);
    res.json(values);
  });
});
app.get("/cart/:userId", (req, res) => {
  let { userId } = req.params;

  const userIdReplace = userId.replace(":", "");
  console.log(userIdReplace);
  Cart.find({ "userEntity.id": userIdReplace }).then((values) =>
    res.json(values)
  );
});

server.listen(port, () => console.log(`listen at ${port}`));
