const API_URL = "https://api.escuelajs.co/api/v1/products";
let allProducts = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let sortState = { column: "", direction: "asc" };
let editModal, createModal;

document.addEventListener("DOMContentLoaded", () => {
  editModal = new bootstrap.Modal(document.getElementById("editModal"));
  createModal = new bootstrap.Modal(document.getElementById("createModal"));
  fetchProducts();
});

// 1. Fetch Data
async function fetchProducts() {
  try {
    const res = await fetch(API_URL);
    allProducts = await res.json();
    filteredData = [...allProducts];
    renderTable();
  } catch (e) {
    console.error("API Error", e);
  }
}

// 2. Render Table
function renderTable() {
  const tbody = document.getElementById("product-list");
  tbody.innerHTML = "";
  const start = (currentPage - 1) * pageSize;
  const items = filteredData.slice(start, start + pageSize);

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.className = "product-row";
    row.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") openEditModal(item.id);
    };

    const img = fixImageUrl(item.images[0]);
    row.innerHTML = `
            <td class="text-center">${item.id}</td>
            <td class="text-center"><img src="${img}" class="img-product" referrerpolicy="no-referrer"></td>
            <td class="position-relative">
                <span class="fw-bold">${item.title}</span>
                <div class="desc-box">${item.description}</div>
            </td>
            <td class="text-center text-success fw-bold">$${item.price}</td>
            <td class="text-center"><span class="badge bg-info text-dark">${item.category.name}</span></td>
        `;
    tbody.appendChild(row);
  });
  renderPagination();
}

// 3. Phân trang
function renderPagination() {
  const nav = document.getElementById("pagination-controls");
  nav.innerHTML = "";
  const totalPages = Math.ceil(filteredData.length / pageSize);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 2 && i <= currentPage + 2)
    ) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      li.innerHTML = `<a class="page-link">${i}</a>`;
      li.onclick = () => {
        currentPage = i;
        renderTable();
      };
      nav.appendChild(li);
    }
  }
}

// 4. Tìm kiếm (OnChanged)
document.getElementById("searchInput").addEventListener("input", (e) => {
  const key = e.target.value.toLowerCase();
  filteredData = allProducts.filter((p) => p.title.toLowerCase().includes(key));
  currentPage = 1;
  renderTable();
});

// Đổi Page Size
document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
  pageSize = parseInt(e.target.value);
  currentPage = 1;
  renderTable();
});

// 5. Sắp xếp
function handleSort(col) {
  sortState.direction =
    sortState.column === col && sortState.direction === "asc" ? "desc" : "asc";
  sortState.column = col;
  updateSortIcons();
  filteredData.sort((a, b) => {
    let vA = a[col],
      vB = b[col];
    if (typeof vA === "string")
      return sortState.direction === "asc"
        ? vA.localeCompare(vB)
        : vB.localeCompare(vA);
    return sortState.direction === "asc" ? vA - vB : vB - vA;
  });
  renderTable();
}

function updateSortIcons() {
  document.getElementById("sort-icon-title").innerText = "↕";
  document.getElementById("sort-icon-price").innerText = "↕";
  document.getElementById(`sort-icon-${sortState.column}`).innerText =
    sortState.direction === "asc" ? "↑" : "↓";
}

// 6. Export CSV
function exportCSV() {
  const headers = ["ID,Title,Price,Category"];
  const rows = filteredData.map(
    (p) => `${p.id},"${p.title}",${p.price},"${p.category.name}"`
  );
  const blob = new Blob(["\ufeff" + headers.concat(rows).join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "products.csv";
  link.click();
}

// 7. Edit (PUT)
async function openEditModal(id) {
  const res = await fetch(`${API_URL}/${id}`);
  const p = await res.json();
  document.getElementById("edit-id").value = p.id;
  document.getElementById("edit-title").value = p.title;
  document.getElementById("edit-price").value = p.price;
  document.getElementById("edit-desc").value = p.description;
  document.getElementById("edit-preview").src = fixImageUrl(p.images[0]);
  editModal.show();
}

async function updateProduct() {
  const id = document.getElementById("edit-id").value;
  const btnUpdate = document.querySelector("#editModal .btn-primary");

  // Lấy giá trị từ form
  const title = document.getElementById("edit-title").value.trim();
  const price = parseInt(document.getElementById("edit-price").value);
  // Lưu ý: Chúng ta tạm thời không gửi description nếu server đang bị lỗi 500 với nó
  const description = document.getElementById("edit-desc").value.trim();

  if (!title || isNaN(price) || price <= 0) {
    alert("Vui lòng nhập Tiêu đề và Giá hợp lệ!");
    return;
  }

  // BODY GỬI ĐI: Match chính xác với request thủ công đã thành công của bạn
  // Nếu vẫn lỗi 500, bạn có thể bỏ dòng description ra khỏi object này
  const dataUpdate = {
    title: title,
    price: price,
    description: description,
  };

  try {
    btnUpdate.innerText = "Đang xử lý...";
    btnUpdate.disabled = true;

    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataUpdate),
    });

    // Kiểm tra kết quả trả về
    if (res.ok) {
      const result = await res.json();
      alert("Cập nhật thành công!");
      editModal.hide();
      fetchProducts(); // Tải lại bảng để cập nhật giao diện
    } else {
      // Hiển thị lỗi cụ thể nếu có
      const errorText = await res.text();
      console.error("Server Error:", errorText);
      alert("Không thể cập nhật. Server phản hồi lỗi.");
    }
  } catch (e) {
    console.error("Lỗi:", e);
    alert("Có lỗi xảy ra, vui lòng kiểm tra kết nối!");
  } finally {
    btnUpdate.innerText = "Lưu thay đổi";
    btnUpdate.disabled = false;
  }
}

// 8. Create (POST)
async function createProduct() {
  const btnCreate = document.querySelector("#createModal .btn-success");

  // 1. Lấy dữ liệu và ép kiểu thật kỹ
  const title = document.getElementById("create-title").value.trim();
  const price = Number(document.getElementById("create-price").value); // Ép kiểu số
  const description = document.getElementById("create-desc").value.trim();
  const categoryId = Number(document.getElementById("create-catId").value); // Ép kiểu số
  const imageUrl = document.getElementById("create-img").value.trim();

  // 2. Kiểm tra dữ liệu trống phía Client
  if (!title || !description || isNaN(price) || price <= 0 || !imageUrl) {
    alert("Vui lòng không để trống thông tin và giá phải lớn hơn 0!");
    return;
  }

  // 3. Cấu trúc Object gửi đi đúng 100% yêu cầu của API
  const payload = {
    title: title,
    price: price,
    description: description,
    categoryId: categoryId,
    images: [imageUrl], // Phải là mảng chứa chuỗi URL
  };

  try {
    btnCreate.disabled = true;
    btnCreate.innerText = "Đang gửi...";

    console.log("Dữ liệu gửi đi:", payload); // Để bạn kiểm tra trong F12

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json();

    if (res.ok) {
      alert("Tạo thành công sản phẩm: " + responseData.title);
      createModal.hide();

      // Reset form
      document.getElementById("create-title").value = "";
      document.getElementById("create-desc").value = "";

      fetchProducts(); // Tải lại bảng
    } else {
      // Nếu vẫn bị 400, API sẽ trả về lý do ở đây
      console.error("Lỗi chi tiết từ Server:", responseData);
      alert(
        "Lỗi 400: " +
          (responseData.message ||
            "Dữ liệu không hợp lệ. Hãy kiểm tra Console F12")
      );
    }
  } catch (error) {
    console.error("Lỗi mạng:", error);
    alert("Không thể kết nối tới máy chủ!");
  } finally {
    btnCreate.disabled = false;
    btnCreate.innerText = "Tạo ngay";
  }
}

// Fix Image URL
function fixImageUrl(url) {
  if (!url) return "https://placehold.co/70x70?text=No+Image";
  let clean = url.replace(/[\[\]"\\]/g, "");
  if (clean.includes("http")) clean = clean.substring(clean.indexOf("http"));
  return clean;
}
