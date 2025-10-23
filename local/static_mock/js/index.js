document.addEventListener("DOMContentLoaded", () => {
    if (!window.MockHelpers) return;
    const ctaButtons = document.querySelectorAll("[data-cta]");
    ctaButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const target = button.dataset.cta;
            if (target) {
                window.location.href = `${target}.html`;
            }
        });
    });
});
