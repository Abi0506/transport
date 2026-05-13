require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Route = require('../models/Route');

const routes = [
  {
    routeNumber: 'R1',
    routeName: 'Kuniamuthur',
    capacity: 55,
    stops: [
      { name: 'Koaviputhur Pirivu', fees: 49500, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Kuniamuthur', fees: 49500, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Athupalam', fees: 49500, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Ukkadam', fees: 40000, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Chinthamani Bus Stop', fees: 36000, time: '7:30 AM', distanceOrder: 5 },
      { name: 'Ramanathapuram', fees: 36000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Central Studio', fees: 36000, time: '7:45 AM', distanceOrder: 7 }
    ]
  },
  {
    routeNumber: 'R2',
    routeName: 'Vadavalli',
    capacity: 55,
    stops: [
      { name: 'Bharathiyar University', fees: 55500, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Vadavalli Roundana', fees: 55500, time: '7:20 AM', distanceOrder: 2 },
      { name: 'P.N.Pudur', fees: 55500, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Lawley Road', fees: 55500, time: '7:30 AM', distanceOrder: 4 },
      { name: 'R.S.Puram', fees: 55500, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Chinthamani / Vadakovai', fees: 55500, time: '7:40 AM', distanceOrder: 6 }
    ]
  },
  {
    routeNumber: 'R3',
    routeName: 'Peelamedu (NEW)',
    capacity: 55,
    stops: [
      { name: 'Peelamedu', fees: 38000, time: '7:45 AM', distanceOrder: 1 },
      { name: 'Hopes', fees: 38000, time: '7:55 AM', distanceOrder: 2 },
      { name: 'KMCH', fees: 36000, time: '8:00 AM', distanceOrder: 3 },
      { name: 'PLS Nagar', fees: 36000, time: '8:04 AM', distanceOrder: 4 }
    ]
  },
  {
    routeNumber: 'R4',
    routeName: 'Karamadai',
    capacity: 55,
    stops: [
      { name: 'Karamadai', fees: 57000, time: '6:55 AM', distanceOrder: 1 },
      { name: 'Periyanaickenpalayam', fees: 57000, time: '7:15 AM', distanceOrder: 2 },
      { name: 'Narasimmanaickenpalayam', fees: 57000, time: '7:20 AM', distanceOrder: 3 },
      { name: 'NGGO Colony', fees: 50000, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Vellakinar', fees: 50000, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Athipalayam Pirivu', fees: 48000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Chinnavedampatti Pirivu', fees: 48000, time: '7:45 AM', distanceOrder: 7 }
    ]
  },
  {
    routeNumber: 'R5',
    routeName: 'Tirupur via Avinashi',
    capacity: 55,
    stops: [
      { name: 'Tirupur - Kumar Nagar', fees: 50500, time: '7:15 AM', distanceOrder: 1 },
      { name: 'SAP Theatre', fees: 50500, time: '7:18 AM', distanceOrder: 2 },
      { name: 'Gandhinagar', fees: 50500, time: '7:20 AM', distanceOrder: 3 },
      { name: 'Anupparpalayam', fees: 50500, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Poondi', fees: 50500, time: '7:30 AM', distanceOrder: 5 }
    ]
  },
  {
    routeNumber: 'R6',
    routeName: 'Tirupur OBS / Palladam',
    capacity: 57,
    stops: [
      { name: 'Tirupur OBS', fees: 54500, time: '7:00 AM', distanceOrder: 1 },
      { name: 'Veerapandi Pirivu', fees: 54500, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Palladam Bus Stand', fees: 50500, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Lakshmi Mills (KN Puram)', fees: 50500, time: '7:35 AM', distanceOrder: 4 },
      { name: 'Karanampettai', fees: 41000, time: '7:40 AM', distanceOrder: 5 },
      { name: 'Defence Colony', fees: 36000, time: '7:42 AM', distanceOrder: 6 },
      { name: 'Sulur', fees: 36000, time: '7:50 AM', distanceOrder: 7 },
      { name: 'Pappampatti Pirivu', fees: 36000, time: '7:55 AM', distanceOrder: 8 }
    ]
  },
  {
    routeNumber: 'R7',
    routeName: 'Pollachi',
    capacity: 44,
    stops: [
      { name: 'Pollachi', fees: 57500, time: '6:55 AM', distanceOrder: 1 },
      { name: 'Kovilpalayam', fees: 52500, time: '7:05 AM', distanceOrder: 2 },
      { name: 'Thamaraikulam', fees: 50500, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Kinathukadavu', fees: 50500, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Othakkalmandapam', fees: 47500, time: '7:25 AM', distanceOrder: 5 },
      { name: 'Malumichampatti', fees: 47500, time: '7:30 AM', distanceOrder: 6 },
      { name: 'Karpagam University', fees: 47500, time: '7:35 AM', distanceOrder: 7 },
      { name: 'Vellalore Pirivu (L&T Bypass)', fees: 40000, time: '7:45 AM', distanceOrder: 8 }
    ]
  },
  {
    routeNumber: 'R8',
    routeName: 'Ganapathy',
    capacity: 55,
    stops: [
      { name: 'Ganapathy', fees: 42000, time: '7:20 AM', distanceOrder: 1 },
      { name: 'Athipalayam Pirivu', fees: 42000, time: '7:25 AM', distanceOrder: 2 },
      { name: 'Bharathipuram', fees: 42000, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Cheran Maanagar', fees: 40000, time: '7:35 AM', distanceOrder: 4 },
      { name: 'Thanneerpandal', fees: 40000, time: '7:50 AM', distanceOrder: 5 }
    ]
  },
  {
    routeNumber: 'R9',
    routeName: 'Annur',
    capacity: 55,
    stops: [
      { name: 'Annur', fees: 50000, time: '7:10 AM', distanceOrder: 1 },
      { name: 'Kariyampalayam Pirivu', fees: 50000, time: '7:15 AM', distanceOrder: 2 },
      { name: 'Ganesa Puram (Sakthi Road)', fees: 50000, time: '7:20 AM', distanceOrder: 3 },
      { name: 'Kovilpalayam (Sakthi Road)', fees: 50000, time: '7:30 AM', distanceOrder: 4 },
      { name: 'Kurumbapalayam (Sakthi Road)', fees: 48000, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Saravanampatti', fees: 48000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Vilankurichi', fees: 40000, time: '7:45 AM', distanceOrder: 7 },
      { name: 'Kalapatti', fees: 36000, time: '7:53 AM', distanceOrder: 8 },
      { name: 'Nehru Nagar', fees: 36000, time: '7:58 AM', distanceOrder: 9 }
    ]
  },
  {
    routeNumber: 'R10',
    routeName: 'Perur',
    capacity: 55,
    stops: [
      { name: 'Perur', fees: 48000, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Telungupalayam Pirivu', fees: 48000, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Selvapuram', fees: 48000, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Townhall', fees: 40000, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Varatharajapuram', fees: 36000, time: '7:45 AM', distanceOrder: 5 },
      { name: 'ESI & Lions', fees: 36000, time: '7:50 AM', distanceOrder: 6 },
      { name: 'Ramanujanagar', fees: 36000, time: '7:51 AM', distanceOrder: 7 },
      { name: "Mani's Theatre", fees: 36000, time: '7:58 AM', distanceOrder: 8 }
    ]
  },
  {
    routeNumber: 'R11',
    routeName: 'Kanuvai',
    capacity: 55,
    stops: [
      { name: 'Kanuvai', fees: 50000, time: '7:00 AM', distanceOrder: 1 },
      { name: 'TVS Nagar', fees: 50000, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Edayarpalayam', fees: 50000, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Venkitapuram', fees: 50000, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Saibaba Colony', fees: 50000, time: '7:25 AM', distanceOrder: 5 },
      { name: 'Saibaba Koil', fees: 50000, time: '7:30 AM', distanceOrder: 6 },
      { name: 'Nava India', fees: 42000, time: '7:47 AM', distanceOrder: 7 }
    ]
  },
  {
    routeNumber: 'R12',
    routeName: 'Avinashi (NEW)',
    capacity: 44,
    stops: [
      { name: 'Avinashi NBS', fees: 42000, time: '7:30 AM', distanceOrder: 1 },
      { name: 'Avinashi OBS', fees: 42000, time: '7:35 AM', distanceOrder: 2 },
      { name: 'Thekkalur', fees: 42000, time: '7:40 AM', distanceOrder: 3 },
      { name: 'Karumathampatti', fees: 31000, time: '7:55 AM', distanceOrder: 4 }
    ]
  },
  {
    routeNumber: 'R13',
    routeName: 'Thudiyalur (NEW)',
    capacity: 55,
    stops: [
      { name: 'Thudiyalur', fees: 50000, time: '7:15 AM', distanceOrder: 1 },
      { name: 'Kavundampalayam', fees: 50000, time: '7:20 AM', distanceOrder: 2 },
      { name: 'Krishna Silks - 100 ft Road', fees: 42000, time: '7:30 AM', distanceOrder: 3 }
    ]
  },
  {
    routeNumber: 'R14',
    routeName: 'Podanur (NEW)',
    capacity: 55,
    stops: [
      { name: 'Podanur', fees: 40000, time: '7:15 AM', distanceOrder: 1 },
      { name: 'Nanjundapuram', fees: 40000, time: '7:20 AM', distanceOrder: 2 },
      { name: 'Singanallur', fees: 36000, time: '7:40 AM', distanceOrder: 3 },
      { name: 'Ondipudur', fees: 36000, time: '7:50 AM', distanceOrder: 4 },
      { name: 'Irugur Pirivu', fees: 36000, time: '7:55 AM', distanceOrder: 5 }
    ]
  },
  {
    routeNumber: 'R15',
    routeName: 'Gandhipuram',
    capacity: 55,
    stops: [
      { name: 'Gandhipuram', fees: 42000, time: '7:25 AM', distanceOrder: 1 },
      { name: 'Pap.N.Palayam', fees: 42000, time: '7:30 AM', distanceOrder: 2 },
      { name: 'Lakshmi Mills (Avinashi Road)', fees: 42000, time: '7:35 AM', distanceOrder: 3 },
      { name: 'Esso Bunk', fees: 38000, time: '7:40 AM', distanceOrder: 4 },
      { name: 'Fun Mall', fees: 38000, time: '7:45 AM', distanceOrder: 5 },
      { name: 'SITRA', fees: 36000, time: '7:55 AM', distanceOrder: 6 }
    ]
  }
];

async function seedRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Route.deleteMany({});
    console.log('Cleared existing routes');

    const created = await Route.insertMany(routes);
    console.log(`Seeded ${created.length} routes successfully!`);

    // Print summary
    let totalCapacity = 0;
    let totalStops = 0;
    created.forEach(r => {
      totalCapacity += r.capacity;
      totalStops += r.stops.length;
      console.log(`  ${r.routeNumber} - ${r.routeName}: ${r.stops.length} stops, capacity ${r.capacity}`);
    });
    console.log(`\nTotal: ${created.length} routes, ${totalStops} stops, ${totalCapacity} seats`);
    console.log(`  Faculty seats (9%): ${Math.floor(totalCapacity * 0.09)}`);
    console.log(`  Staff seats (6%): ${Math.floor(totalCapacity * 0.06)}`);
    console.log(`  Student seats (85%): ${Math.floor(totalCapacity * 0.85)}`);

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedRoutes();
