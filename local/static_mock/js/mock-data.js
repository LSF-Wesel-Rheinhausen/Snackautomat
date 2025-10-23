const MOCK_PRODUCTS = {
    drinks: [
        {
            id: "D-001",
            name: "Isotonisches Sportgetränk",
            price: 2.80,
            volume: "500 ml",
            tags: ["gekühlt", "ohne Zucker"],
            stock: 14,
            highlight: "Beliebt"
        },
        {
            id: "D-002",
            name: "Apfelschorle",
            price: 2.20,
            volume: "330 ml",
            tags: ["regional", "fruchtig"],
            stock: 8,
            highlight: "Neu"
        },
        {
            id: "D-003",
            name: "Koffeinfreier Kaffee",
            price: 1.70,
            volume: "250 ml",
            tags: ["heiß", "aromatisch"],
            stock: 6,
            highlight: "Saison"
        }
    ],
    snacks: [
        {
            id: "S-101",
            name: "Nuss-Mix Deluxe",
            price: 3.40,
            weight: "120 g",
            tags: ["proteinreich", "glutenfrei"],
            stock: 12,
            highlight: "Energie"
        },
        {
            id: "S-102",
            name: "Schoko-Riegel Classic",
            price: 1.90,
            weight: "65 g",
            tags: ["mit Nüssen"],
            stock: 22,
            highlight: "Klassiker"
        },
        {
            id: "S-103",
            name: "Vegane Hafer-Cookies",
            price: 2.60,
            weight: "80 g",
            tags: ["vegan", "hafer"],
            stock: 5,
            highlight: "Limited"
        }
    ]
};

const MOCK_STATUS = {
    machine: {
        temperature: "6°C",
        door: "geschlossen",
        network: "stabil",
        lastSync: "21.10.2025 17:45"
    },
    maintenance: [
        {
            id: "M-5501",
            action: "Slot-Test 4B",
            status: "erfolgreich",
            performedAt: "21.10.2025 15:03"
        },
        {
            id: "M-5502",
            action: "Preisanpassung Snacks",
            status: "ausstehend",
            performedAt: "21.10.2025 11:22"
        }
    ]
};

const MOCK_USERS = [
    { rfid: "041A82BC", name: "Jan S.", role: "Admin" },
    { rfid: "07FF23D1", name: "Lena K.", role: "Pilot" },
    { rfid: "03CD982A", name: "Chris B.", role: "Technik" }
];
