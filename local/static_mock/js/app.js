function setActiveNav() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".mock-nav a").forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) {
            return;
        }
        const normalizedHref = href === "#" ? "index.html" : href;
        if (normalizedHref === currentPage) {
            link.classList.add("active");
        }
    });
}

function formatPrice(value) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    }).format(value);
}

function showToast(message) {
    const toast = document.querySelector(".mock-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
}

function renderProductGrid(elementId, products) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = "";
    products.forEach((product) => {
        const card = document.createElement("article");
        card.className = "mock-card";

        card.innerHTML = `
            <header class="mock-card__header">
                <h3 class="mock-card__title">${product.name}</h3>
                <span class="mock-card__price">${formatPrice(product.price)}</span>
            </header>
            <div class="mock-card__meta">
                <span class="mock-chip">${product.highlight}</span>
                <span class="mock-chip mock-chip--success">${product.stock}x verfügbar</span>
            </div>
            <div class="mock-card__meta">
                <span>${product.volume || product.weight}</span>
                <span>Artikel-Nr.: ${product.id}</span>
            </div>
            <p class="mock-card__meta">${product.tags.join(" · ")}</p>
            <div class="mock-card__actions">
                <button class="mock-button" data-product="${product.id}">Jetzt kaufen</button>
                <button class="mock-button" data-product="${product.id}" data-action="details">Details</button>
            </div>
        `;

        container.appendChild(card);
    });

    container.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            const productId = button.dataset.product;
            if (button.dataset.action === "details") {
                showToast(`Details für ${productId} öffnen (Mock)`);
            } else {
                showToast(`Kaufabsicht für ${productId} gestartet (Mock)`);
            }
        });
    });
}

function renderMaintenanceTable(elementId, items) {
    const tableBody = document.querySelector(`#${elementId} tbody`);
    if (!tableBody) return;

    tableBody.innerHTML = items
        .map(
            (item) => `
            <tr>
                <td>${item.id}</td>
                <td>${item.action}</td>
                <td>
                    <span class="mock-chip ${item.status === "erfolgreich" ? "mock-chip--success" : "mock-chip--warning"}">
                        ${item.status}
                    </span>
                </td>
                <td>${item.performedAt}</td>
            </tr>
        `
        )
        .join("");
}

function populateUserList(elementId, users) {
    const list = document.getElementById(elementId);
    if (!list) return;

    list.innerHTML = "";
    users.forEach((user) => {
        const listItem = document.createElement("li");
        listItem.className = "mock-card__meta";
        listItem.innerHTML = `<strong>${user.name}</strong> (${user.role}) – RFID ${user.rfid}`;
        list.appendChild(listItem);
    });
}

function setupAdminActions() {
    const loginForm = document.getElementById("mock-admin-login");
    const commandButtons = document.querySelectorAll("[data-admin-action]");

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const pin = loginForm.querySelector("input[type='password']").value;
            if (pin.trim()) {
                showToast("Admin-Mock-Login erfolgreich");
            } else {
                showToast("Bitte PIN eingeben");
            }
        });
    }

    commandButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const action = button.dataset.adminAction;
            showToast(`Mock-Aktion \"${action}\" ausgelöst`);
        });
    });
}

window.addEventListener("DOMContentLoaded", () => {
    setActiveNav();
});

window.MockHelpers = {
    renderProductGrid,
    renderMaintenanceTable,
    populateUserList,
    setupAdminActions,
    showToast,
};
