// Bangladesh Divisions and their Zillas (Districts)
export const BD_LOCATIONS: Record<string, string[]> = {
  Dhaka: [
    "Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur",
    "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail",
  ],
  Chattogram: [
    "Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar",
    "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati",
  ],
  Rajshahi: [
    "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj",
  ],
  Khulna: [
    "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia",
    "Magura", "Meherpur", "Narail", "Satkhira",
  ],
  Barishal: [
    "Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur",
  ],
  Sylhet: [
    "Habiganj", "Moulvibazar", "Sunamganj", "Sylhet",
  ],
  Rangpur: [
    "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon",
  ],
  Mymensingh: [
    "Jamalpur", "Mymensingh", "Netrokona", "Sherpur",
  ],
};

export const BD_DIVISIONS = Object.keys(BD_LOCATIONS);
