
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/$/, "");

const API = `${API_URL}/api/devices`;

const STATUS_OPTIONS = [
  "Đang sử dụng",
  "Hư hỏng",
  "Đang sửa chữa",
  "Ngừng sử dụng"
];

const emptyForm = {
  deviceId: "",
  name: "",
  deviceType: "",
  room: "",
  brand: "",
  model: "",
  quantity: 1,
  status: "Đang sử dụng",
  purchaseDate: "",
  description: ""
};

// Ngày hiện tại theo múi giờ Việt Nam
function getTodayVN() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const get = type => parts.find(p => p.type === type).value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không hợp lệ";
  }

  return date.toLocaleDateString("vi-VN", {
    timeZone: "UTC"
  });
}

function statusClass(status) {
  switch (status) {
    case "Đang sử dụng":
      return "using";
    case "Hư hỏng":
      return "broken";
    case "Đang sửa chữa":
      return "repair";
    default:
      return "inactive";
  }
}

export default function App() {
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = getTodayVN();

  // ====================================
  // 1. TẢI DANH SÁCH VÀ TÌM KIẾM
  // ====================================

  async function loadDevices(keyword = "", signal) {
    setLoading(true);
    setError("");

    try {
      const url = keyword.trim()
        ? `${API}?search=${encodeURIComponent(keyword.trim())}`
        : API;

      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách thiết bị");
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Dữ liệu API không đúng định dạng");
      }

      if (!signal?.aborted) {
        setDevices(data);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Lỗi kết nối Backend");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      loadDevices(search, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  // ====================================
  // 2. FORM
  // ====================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function openCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setSelectedDevice(null);
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(device) {
    setEditingId(device._id);
    setSelectedDevice(null);

    setForm({
      deviceId: device.deviceId || "",
      name: device.name || "",
      deviceType: device.deviceType || "",
      room: device.room || "",
      brand: device.brand || "",
      model: device.model || "",
      quantity: device.quantity ?? 1,
      status: device.status || "Đang sử dụng",
      purchaseDate: device.purchaseDate
        ? device.purchaseDate.substring(0, 10)
        : "",
      description: device.description || ""
    });

    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  // ====================================
  // 3. XEM CHI TIẾT
  // ====================================

  async function viewDetail(id) {
    setError("");
    setSelectedDevice(null);

    try {
      const response = await fetch(`${API}/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xem chi tiết thiết bị"
        );
      }

      setSelectedDevice(data);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  // ====================================
  // 4. THÊM / SỬA THIẾT BỊ
  // ====================================

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    const quantity = Number(form.quantity);

    if (
      !form.deviceId.trim() ||
      !form.name.trim() ||
      !form.deviceType.trim() ||
      !form.room.trim()
    ) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    if (
      form.quantity === "" ||
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      setError("Số lượng phải là số nguyên không âm!");
      return;
    }

    // Kiểm tra ngày mua
    // Để trống được phép, nhưng không được ở tương lai
    if (form.purchaseDate) {
      const parsed = new Date(
        `${form.purchaseDate}T00:00:00.000Z`
      );

      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !==
          form.purchaseDate
      ) {
        setError("Ngày mua không hợp lệ!");
        return;
      }

      if (form.purchaseDate > getTodayVN()) {
        setError(
          "Ngày mua không được lớn hơn ngày hiện tại!"
        );
        return;
      }
    }

    const payload = {
      ...form,
      deviceId: form.deviceId.trim(),
      name: form.name.trim(),
      deviceType: form.deviceType.trim(),
      room: form.room.trim(),
      quantity,
      purchaseDate: form.purchaseDate || null
    };

    setSaving(true);

    try {
      const url = editingId
        ? `${API}/${editingId}`
        : API;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể lưu thiết bị"
        );
      }

      setMessage(
        editingId
          ? "Cập nhật thiết bị thành công!"
          : "Thêm thiết bị thành công!"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadDevices(search);
    } catch (err) {
      setError(err.message || "Lưu thiết bị thất bại");
    } finally {
      setSaving(false);
    }
  }

  // ====================================
  // 5. XÓA THIẾT BỊ
  // ====================================

  async function handleDelete(device) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${device.deviceId} - ${device.name}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(device._id);

    try {
      const response = await fetch(
        `${API}/${device._id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể xóa thiết bị"
        );
      }

      if (selectedDevice?._id === device._id) {
        setSelectedDevice(null);
      }

      setMessage("Xóa thiết bị thành công!");
      await loadDevices(search);
    } catch (err) {
      setError(err.message || "Xóa thất bại");
    } finally {
      setDeletingId(null);
    }
  }

  // ====================================
  // 6. THỐNG KÊ
  // ====================================

  const total = devices.length;

  const using = devices.filter(
    d => d.status === "Đang sử dụng"
  ).length;

  const broken = devices.filter(
    d => d.status === "Hư hỏng"
  ).length;

  const repairing = devices.filter(
    d => d.status === "Đang sửa chữa"
  ).length;

  // ====================================
  // 7. GIAO DIỆN
  // ====================================

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1>QUẢN LÝ THIẾT BỊ PHÒNG HỌC</h1>
            <p>
              Hệ thống quản lý thiết bị trên nền tảng đám mây
            </p>
          </div>

          <div className="student-info">
            <strong>TruongQuynhNhu</strong>
            <span>MSSV: 235349</span>
          </div>
        </div>
      </header>

      <main className="container">

        {/* DASHBOARD */}
        <section className="dashboard">
          <div className="stat-card">
            <span>Tổng thiết bị</span>
            <strong>{total}</strong>
          </div>

          <div className="stat-card green">
            <span>Đang sử dụng</span>
            <strong>{using}</strong>
          </div>

          <div className="stat-card red">
            <span>Hư hỏng</span>
            <strong>{broken}</strong>
          </div>

          <div className="stat-card orange">
            <span>Đang sửa chữa</span>
            <strong>{repairing}</strong>
          </div>
        </section>

        {/* DANH SÁCH */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Danh sách thiết bị</h2>
              <p>Quản lý thông tin và tình trạng thiết bị</p>
            </div>

            <button
              className="btn primary"
              onClick={openCreate}
            >
              + Thêm thiết bị
            </button>
          </div>

          <div className="toolbar">
            <input
              className="search"
              type="text"
              placeholder="Tìm mã, tên, loại thiết bị hoặc phòng học..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <button
              className="btn secondary"
              onClick={() => loadDevices(search)}
            >
              Làm mới
            </button>
          </div>

          {message && (
            <div className="alert success">
              {message}
            </div>
          )}

          {error && (
            <div className="alert danger">
              {error}
            </div>
          )}

          {loading ? (
            <div className="empty">
              Đang tải dữ liệu...
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã thiết bị</th>
                    <th>Tên thiết bị</th>
                    <th>Loại thiết bị</th>
                    <th>Phòng học</th>
                    <th>Số lượng</th>
                    <th>Tình trạng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty">
                        Không có thiết bị nào
                      </td>
                    </tr>
                  ) : (
                    devices.map((device, index) => (
                      <tr key={device._id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{device.deviceId}</strong>
                        </td>
                        <td>{device.name}</td>
                        <td>{device.deviceType}</td>
                        <td>{device.room}</td>
                        <td>{device.quantity}</td>
                        <td>
                          <span
                            className={`status ${statusClass(device.status)}`}
                          >
                            {device.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn detail"
                              onClick={() =>
                                viewDetail(device._id)
                              }
                            >
                              Chi tiết
                            </button>

                            <button
                              className="btn edit"
                              onClick={() =>
                                openEdit(device)
                              }
                            >
                              Sửa
                            </button>

                            <button
                              className="btn delete"
                              disabled={
                                deletingId === device._id
                              }
                              onClick={() =>
                                handleDelete(device)
                              }
                            >
                              {deletingId === device._id
                                ? "Đang xóa..."
                                : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FORM THÊM / SỬA */}
        {showForm && (
          <section className="panel form-panel">
            <div className="panel-header">
              <h2>
                {editingId
                  ? "Cập nhật thiết bị"
                  : "Thêm thiết bị mới"}
              </h2>

              <button
                className="btn secondary"
                onClick={closeForm}
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">

                <label>
                  Mã thiết bị *
                  <input
                    name="deviceId"
                    value={form.deviceId}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Tên thiết bị *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Loại thiết bị *
                  <input
                    name="deviceType"
                    value={form.deviceType}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Phòng học *
                  <input
                    name="room"
                    value={form.room}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Hãng sản xuất
                  <input
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Model
                  <input
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Số lượng *
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    step="1"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Tình trạng
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                {/* NGÀY MUA ĐÃ SỬA */}
                <label>
                  Ngày mua
                  <input
                    type="date"
                    name="purchaseDate"
                    value={form.purchaseDate}
                    onChange={handleChange}
                    max={today}
                  />
                  <small>
                    Không được chọn ngày sau{" "}
                    {formatDate(`${today}T00:00:00Z`)}
                  </small>
                </label>

                <label className="full-width">
                  Mô tả
                  <textarea
                    name="description"
                    rows="3"
                    value={form.description}
                    onChange={handleChange}
                  />
                </label>

              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={closeForm}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                    ? "Lưu thay đổi"
                    : "Thêm thiết bị"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* CHI TIẾT THIẾT BỊ */}
        {selectedDevice && (
          <section className="panel">
            <div className="panel-header">
              <h2>Chi tiết thiết bị</h2>

              <button
                className="btn secondary"
                onClick={() =>
                  setSelectedDevice(null)
                }
              >
                Đóng
              </button>
            </div>

            <div className="detail-grid">
              <p>
                <b>Mã:</b> {selectedDevice.deviceId}
              </p>
              <p>
                <b>Tên:</b> {selectedDevice.name}
              </p>
              <p>
                <b>Loại:</b> {selectedDevice.deviceType}
              </p>
              <p>
                <b>Phòng:</b> {selectedDevice.room}
              </p>
              <p>
                <b>Hãng:</b> {selectedDevice.brand || "—"}
              </p>
              <p>
                <b>Model:</b> {selectedDevice.model || "—"}
              </p>
              <p>
                <b>Số lượng:</b> {selectedDevice.quantity}
              </p>
              <p>
                <b>Tình trạng:</b> {selectedDevice.status}
              </p>
              <p>
                <b>Ngày mua:</b>{" "}
                {formatDate(selectedDevice.purchaseDate)}
              </p>
              <p className="full-width">
                <b>Mô tả:</b>{" "}
                {selectedDevice.description || "—"}
              </p>
            </div>
          </section>
        )}

      </main>

      <footer>
        MSSV: 235349 | TruongQuynhNhu | Điện toán đám mây
      </footer>
    </div>
  );
}
