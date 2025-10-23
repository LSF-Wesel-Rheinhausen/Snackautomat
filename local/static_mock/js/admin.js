document.addEventListener("DOMContentLoaded", () => {
    if (!window.MockHelpers) return;
    const { renderMaintenanceTable, populateUserList, setupAdminActions } = window.MockHelpers;

    const statusCards = document.querySelectorAll("[data-status]");
    statusCards.forEach((card) => {
        const statusKey = card.dataset.status;
        if (statusKey && MOCK_STATUS.machine[statusKey]) {
            card.textContent = MOCK_STATUS.machine[statusKey];
        }
    });

    const lastSync = document.querySelector("[data-last-sync]");
    if (lastSync) {
        lastSync.textContent = MOCK_STATUS.machine.lastSync;
    }

    renderMaintenanceTable("mock-maintenance-table", MOCK_STATUS.maintenance);
    populateUserList("mock-user-list", MOCK_USERS);
    setupAdminActions();
});
