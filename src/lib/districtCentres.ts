/**
 * Each district's headquarters town, for turning a visitor's coordinates into
 * a district in their own browser — the coordinates are never sent anywhere.
 * Names are bd_districts' (0096). Coordinates from nuhil/bangladesh-geocode.
 *
 * The nearest town decides, which is not the same as the district's border:
 * someone near an edge can be given the neighbour (Sherpur and Jamalpur towns
 * are 12 km apart). Near enough to list doctors by; the visitor can pick
 * their own district beside it.
 */
const CENTRES: [name: string, lat: number, lng: number][] = [
  ["Bagerhat", 22.6516, 89.7859],
  ["Bandarban", 22.1953, 92.2184],
  ["Barguna", 22.1592, 90.1256],
  ["Barishal", 22.7004, 90.3732],
  ["Bhola", 22.6859, 90.6482],
  ["Bogura", 24.8465, 89.3778],
  ["Brahmanbaria", 23.9571, 91.1119],
  ["Chandpur", 23.2333, 90.6713],
  ["Chapai Nawabganj", 24.5965, 88.2775],
  ["Chattogram", 22.3351, 91.8341],
  ["Chuadanga", 23.6402, 88.8418],
  ["Cox's Bazar", 21.4432, 91.9738],
  ["Cumilla", 23.4683, 91.1788],
  ["Dhaka", 23.7115, 90.4111],
  ["Dinajpur", 25.6217, 88.6355],
  ["Faridpur", 23.6071, 89.8429],
  ["Feni", 23.0232, 91.3841],
  ["Gaibandha", 25.3288, 89.5281],
  ["Gazipur", 24.0023, 90.4264],
  ["Gopalganj", 23.0051, 89.8266],
  ["Habiganj", 24.3749, 91.4155],
  ["Jamalpur", 24.9375, 89.9378],
  ["Jashore", 23.1664, 89.2081],
  ["Jhalokati", 22.6423, 90.2004],
  ["Jhenaidah", 23.5448, 89.1539],
  ["Joypurhat", 25.0964, 89.04],
  ["Khagrachhari", 23.1193, 91.9847],
  ["Khulna", 22.8158, 89.5687],
  ["Kishoreganj", 24.4449, 90.7766],
  ["Kurigram", 25.8054, 89.6362],
  ["Kushtia", 23.9013, 89.1205],
  ["Lakshmipur", 22.9425, 90.8412],
  ["Lalmonirhat", 25.9165, 89.4532],
  ["Madaripur", 23.1641, 90.1897],
  ["Magura", 23.4873, 89.42],
  ["Manikganj", 23.8602, 90.0018],
  ["Meherpur", 23.7622, 88.6318],
  ["Moulvibazar", 24.4829, 91.7774],
  ["Munshiganj", 23.5436, 90.5354],
  ["Mymensingh", 24.7466, 90.4072],
  ["Naogaon", 24.8326, 88.9249],
  ["Narail", 23.1725, 89.5127],
  ["Narayanganj", 23.6337, 90.4965],
  ["Narsingdi", 23.9322, 90.7154],
  ["Natore", 24.4206, 89.0003],
  ["Netrokona", 24.871, 90.7279],
  ["Nilphamari", 25.9318, 88.856],
  ["Noakhali", 22.8696, 91.0994],
  ["Pabna", 23.9985, 89.2336],
  ["Panchagarh", 26.3411, 88.5542],
  ["Patuakhali", 22.3596, 90.3299],
  ["Pirojpur", 22.5781, 89.9984],
  ["Rajbari", 23.7574, 89.6445],
  ["Rajshahi", 24.3723, 88.5631],
  ["Rangamati", 22.6556, 92.1754],
  ["Rangpur", 25.7558, 89.2445],
  ["Satkhira", 22.7181, 89.0687],
  ["Shariatpur", 23.206, 90.3478],
  ["Sherpur", 25.0205, 90.0153],
  ["Sirajganj", 24.4534, 89.7007],
  ["Sunamganj", 25.0658, 91.395],
  ["Sylhet", 24.8898, 91.8698],
  ["Tangail", 24.2641, 89.918],
  ["Thakurgaon", 26.0337, 88.4617],
];

const km = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};

/** The district whose town is nearest; null beyond 120 km of every one of them — abroad. */
export const nearestDistrict = (lat: number, lng: number): string | null => {
  let best: { name: string; d: number } | null = null;
  for (const [name, clat, clng] of CENTRES) {
    const d = km(lat, lng, clat, clng);
    if (!best || d < best.d) best = { name, d };
  }
  return best && best.d <= 120 ? best.name : null;
};
