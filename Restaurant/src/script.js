const API_BASE = "http://localhost:4000";

const menuData = [
    { id: 1, name: "Classic Burger", desc: "Lettuce, tomato, onion, house sauce.", price: 10.99 },
    { id: 2, name: "Wings (10pc)", desc: "Choice of buffalo, BBQ, or lemon pepper.", price: 12.5 },
    { id: 3, name: "Loaded Fries", desc: "Cheese, bacon, green onion, ranch.", price: 8.0 },
    { id: 4, name: "Grilled Chicken Sandwich", desc: "Marinated chicken, pickles, mayo.", price: 11.25 },
];

let cart = [];

function renderMenu() {
    const menuContainer = document.getElementById("menuItems");
    menuContainer.innerHTML = "";
    menuData.forEach(item => {
        const div = document.createElement("div");
        div.className = "menu-item";
        div.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <p class="price">$${item.price.toFixed(2)}</p>
            </div>
            <button data-id="${item.id}">Add to Cart</button>
        `;
        menuContainer.appendChild(div);
    });

    menuContainer.addEventListener("click", e => {
        if (e.target.tagName === "BUTTON") {
            const id = Number(e.target.getAttribute("data-id"));
            addToCart(id);
        }
    });
}

function addToCart(id) {
    const item = menuData.find(m => m.id === id);
    if (!item) return;
    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById("cartList");
    const totalEl = document.getElementById("cartTotal");
    list.innerHTML = "";
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement("li");
        const lineTotal = item.price * item.qty;
        total += lineTotal;
        li.textContent = '${item.name} *${item.qty} - $${lineTotal.toFixed(2)}';
        list.appendChild(li);
    });
    totalEl.textContent = total.toFixed(2);
}

function setupHeroButton() {
    const btn = document.getElementById("orderNowBtn");
    btn.addEventListener("click", () => {
        document.getElementById("order").scrollIntoView({ behavior: "smooth" });
    });
}

function setupDeliveryToggle() {
    const form = document.getElementById("checkoutForm");
    const typeSelect = form.elements["type"];
    const addressField = document.getElementById("addressField");

    typeSelect.addEventListener("change", () => {
        if (typeSelect.value === "delivery") {
            addressField.style.display = "block";
            form.elements["address"].required = true;
        } else {
            addressField.style.display = "none";
            form.elements["address"].required = false;
        }
    });
}

function setupCheckout() {
    const form = document.getElementById("checkoutForm");
    const msg = document.getElementById("checkoutMessage");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";

        if (cart.length === 0) {
            msg.textContent = "Your cart is empty.";
            return;
        }

        const formData = new FormData(form);
        const payload = {
            name: formData.get("name"),
            phone: formData.get("phone"),
            type: formData.get("type"),
            address: formData.get("address") || "",
            items: cart.map(c => ({
                id: c.id,
                name: c.name,
                price: c.price,
                qty: c.qty
            }))
        };

        try {
            const res = await fetch('${API_BASE}/create-checkout-session', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                msg.textContent = data.error || "Something went wrong.";
                return;
            }

            const stripe = Stripe(data.publicKey);
            const { error } = await Stripe.redirectToCheckout({
                sessionId: data.sessionId
            });

            if (error) {
                msg.textContent = error.message;
            }
        } catch (err) {
            console.error(err);
            msg.textContent = "Network error. Try again.";
        }
    });
}

function setYear() {
    document.getElementById("year").textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
    renderMenu();
    renderCart();
    setupHeroButton();
    setupDeliveryToggle();
    setupCheckout();
    setYear();
});