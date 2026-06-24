// Minimal Bangladesh Upazila (Subdistrict) dataset, keyed by District (Zilla).
// Not exhaustive — extend as needed. Districts without an entry fall back
// to a free-text input in the UI.
export const BD_UPAZILAS: Record<string, string[]> = {
  Dhaka: [
    "Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar",
    "Tejgaon", "Mirpur", "Mohammadpur", "Gulshan", "Dhanmondi",
    "Lalbagh", "Ramna", "Motijheel", "Sutrapur", "Demra", "Khilgaon",
  ],
  Gazipur: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  Narayanganj: ["Narayanganj Sadar", "Bandar", "Araihazar", "Rupganj", "Sonargaon"],
  Chattogram: [
    "Anwara", "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari",
    "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Rangunia",
    "Raozan", "Sandwip", "Satkania", "Sitakunda", "Karnaphuli",
  ],
  "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Pekua", "Ramu", "Teknaf", "Ukhia"],
  Cumilla: ["Cumilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Meghna", "Monohorgonj", "Muradnagar", "Nangalkot", "Titas", "Lalmai"],
  Sylhet: ["Sylhet Sadar", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Zakiganj", "Dakshin Surma", "Balaganj"],
  Khulna: ["Khulna Sadar", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsa", "Terokhada"],
  Rajshahi: ["Rajshahi Sadar (Boalia)", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"],
  Barishal: ["Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
  Rangpur: ["Rangpur Sadar", "Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
  Mymensingh: ["Mymensingh Sadar", "Bhaluka", "Trishal", "Haluaghat", "Muktagachha", "Phulbaria", "Fulpur", "Gaffargaon", "Gauripur", "Ishwarganj", "Nandail", "Dhobaura", "Tarakanda"],
};
