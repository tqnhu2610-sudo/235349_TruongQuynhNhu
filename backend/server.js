
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_NAME = "235349_TruongQuynhNhu";

app.use(cors());
app.use(express.json());

// ================================
// 1. SCHEMA THIẾT BỊ
// ================================

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, "Vui lòng nhập mã thiết bị"],
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: [true, "Vui lòng nhập tên thiết bị"],
      trim: true
    },

    deviceType: {
      type: String,
      required: [true, "Vui lòng nhập loại thiết bị"],
      trim: true
    },

    room: {
      type: String,
      required: [true, "Vui lòng nhập phòng học"],
      trim: true
    },

    brand: {
      type: String,
      default: ""
    },

    model: {
      type: String,
      default: ""
    },

    quantity: {
      type: Number,
      required: [true, "Vui lòng nhập số lượng"],
      min: [0, "Số lượng không được âm"],
      validate: {
        validator: Number.isInteger,
        message: "Số lượng phải là số nguyên"
      }
    },

    status: {
      type: String,
      required: true,
      enum: [
        "Đang sử dụng",
        "Hư hỏng",
        "Đang sửa chữa",
        "Ngừng sử dụng"
      ],
      default: "Đang sử dụng"
    },

    purchaseDate: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          if (value == null) return true;

          // Chấp nhận mọi thời điểm đến hết ngày hôm nay
          // theo múi giờ Việt Nam.
          const todayVN = new Date().toLocaleDateString(
            "en-CA",
            { timeZone: "Asia/Ho_Chi_Minh",
              year: "numeric",
              month: "2-digit",
              day: "2-digit" }
          );

          const parts = todayVN.split("-");
          const endOfToday = Date.UTC(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]) + 1
          ) - 1;

          return value.getTime() <= endOfToday;
        },
        message: "Ngày mua không được lớn hơn ngày hiện tại!"
      }
    },

    description: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    collection: "devices"
  }
);

const Device = mongoose.model("Device", deviceSchema);

// ================================
// 2. HÀM HỖ TRỢ
// ================================

const allowedFields = [
  "deviceId",
  "name",
  "deviceType",
  "room",
  "brand",
  "model",
  "quantity",
  "status",
  "purchaseDate",
  "description"
];

function getDeviceData(body) {
  const data = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function handleError(res, error) {
  console.error("API Error:", error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Mã thiết bị đã tồn tại"
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map(item => item.message)
        .join(", ")
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "ID hoặc dữ liệu không hợp lệ"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Lỗi máy chủ hoặc kết nối MongoDB"
  });
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

// Kiểm tra ngày bằng chuỗi YYYY-MM-DD.
// Không dùng Date.now() để tránh từ chối
// những giờ còn lại của ngày hiện tại.

function getTodayVN() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = type =>
    parts.find(p => p.type === type).value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validatePurchaseDate(data) {
  if (!Object.prototype.hasOwnProperty.call(
    data, "purchaseDate"
  )) {
    return null;
  }

  const value = data.purchaseDate;

  if (value === "" || value === null) {
    data.purchaseDate = null;
    return null;
  }

  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Ngày mua phải có định dạng YYYY-MM-DD";
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return "Ngày mua không hợp lệ";
  }

  if (value > getTodayVN()) {
    return "Ngày mua không được lớn hơn ngày hiện tại!";
  }

  data.purchaseDate = parsed;
  return null;
}

// ================================
// 3. KIỂM TRA BACKEND
// ================================

app.get("/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? "OK" : "ERROR",
    database: mongoose.connection.name,
    connection: connected ? "Connected" : "Disconnected",
    mssv: "235349"
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "API quản lý thiết bị phòng học",
    student: "TruongQuynhNhu",
    mssv: "235349",
    database: DB_NAME
  });
});

// ================================
// 4. DANH SÁCH VÀ TÌM KIẾM
// ================================

app.get("/api/devices", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const filter = search ? {
      $or: [
        "deviceId",
        "name",
        "deviceType",
        "room"
      ].map(field => ({
        [field]: {
          $regex: escapeRegex(search),
          $options: "i"
        }
      }))
    } : {};

    const devices = await Device.find(filter)
      .sort({ createdAt: -1, _id: -1 });

    res.json(devices);
  } catch (error) {
    handleError(res, error);
  }
});

// ================================
// 5. CHI TIẾT THIẾT BỊ
// ================================

app.get("/api/devices/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID thiết bị không hợp lệ"
      });
    }

    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        message: "Không tìm thấy thiết bị"
      });
    }

    res.json(device);
  } catch (error) {
    handleError(res, error);
  }
});

// ================================
// 6. THÊM THIẾT BỊ
// ================================

app.post("/api/devices", async (req, res) => {
  try {
    const data = getDeviceData(req.body);

    const dateError = validatePurchaseDate(data);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const device = await Device.create(data);

    res.status(201).json(device);
  } catch (error) {
    handleError(res, error);
  }
});

// ================================
// 7. CẬP NHẬT THIẾT BỊ
// ================================

app.put("/api/devices/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID thiết bị không hợp lệ"
      });
    }

    const data = getDeviceData(req.body);

    const dateError = validatePurchaseDate(data);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      {
        new: true,
        runValidators: true
      }
    );

    if (!device) {
      return res.status(404).json({
        message: "Không tìm thấy thiết bị"
      });
    }

    res.json(device);
  } catch (error) {
    handleError(res, error);
  }
});

// ================================
// 8. XÓA THIẾT BỊ
// ================================

app.delete("/api/devices/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "ID thiết bị không hợp lệ"
      });
    }

    const device = await Device.findByIdAndDelete(
      req.params.id
    );

    if (!device) {
      return res.status(404).json({
        message: "Không tìm thấy thiết bị"
      });
    }

    res.json({
      success: true,
      message: "Xóa thiết bị thành công"
    });
  } catch (error) {
    handleError(res, error);
  }
});

// ================================
// 9. API KHÔNG TỒN TẠI
// ================================

app.use((req, res) => {
  res.status(404).json({
    message: "Đường dẫn API không tồn tại"
  });
});

// ================================
// 10. KẾT NỐI MONGODB ATLAS
// ================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Thiếu MONGODB_URI trong .env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 15000
    });

    await Device.init();

    console.log("====================================");
    console.log("ĐÃ KẾT NỐI MONGODB ATLAS THÀNH CÔNG");
    console.log("Database:", mongoose.connection.name);
    console.log("Collection:", Device.collection.name);
    console.log("====================================");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Devices: http://localhost:${PORT}/api/devices`);
    });

  } catch (error) {
    console.error("Lỗi kết nối:", error.message);
    process.exit(1);
  }
}

startServer();
