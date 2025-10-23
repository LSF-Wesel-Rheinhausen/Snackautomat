document.addEventListener("DOMContentLoaded", () => {
    if (!window.MockHelpers) return;
    window.MockHelpers.renderProductGrid("mock-product-grid", MOCK_PRODUCTS.drinks);
});
