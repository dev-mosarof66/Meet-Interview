// A curated list of real cities for the searchable location picker.
// Format: "City, Region/Country" — the same shape people write on a resume.
// Bundled (no API key, works offline) and searchable client-side; users can
// still type a free-form value if their city isn't listed.

export const LOCATIONS: string[] = [
  // United States
  "New York, NY, USA",
  "Los Angeles, CA, USA",
  "San Francisco, CA, USA",
  "San Jose, CA, USA",
  "San Diego, CA, USA",
  "Seattle, WA, USA",
  "Portland, OR, USA",
  "Austin, TX, USA",
  "Dallas, TX, USA",
  "Houston, TX, USA",
  "San Antonio, TX, USA",
  "Chicago, IL, USA",
  "Boston, MA, USA",
  "Washington, DC, USA",
  "Atlanta, GA, USA",
  "Miami, FL, USA",
  "Orlando, FL, USA",
  "Tampa, FL, USA",
  "Denver, CO, USA",
  "Phoenix, AZ, USA",
  "Las Vegas, NV, USA",
  "Philadelphia, PA, USA",
  "Pittsburgh, PA, USA",
  "Detroit, MI, USA",
  "Minneapolis, MN, USA",
  "Nashville, TN, USA",
  "Charlotte, NC, USA",
  "Raleigh, NC, USA",
  "Salt Lake City, UT, USA",
  "Columbus, OH, USA",
  "Kansas City, MO, USA",
  "St. Louis, MO, USA",
  "Indianapolis, IN, USA",
  "Sacramento, CA, USA",
  "Remote, USA",

  // Canada
  "Toronto, ON, Canada",
  "Vancouver, BC, Canada",
  "Montreal, QC, Canada",
  "Calgary, AB, Canada",
  "Ottawa, ON, Canada",
  "Edmonton, AB, Canada",
  "Waterloo, ON, Canada",

  // United Kingdom & Ireland
  "London, UK",
  "Manchester, UK",
  "Birmingham, UK",
  "Edinburgh, UK",
  "Glasgow, UK",
  "Bristol, UK",
  "Leeds, UK",
  "Cambridge, UK",
  "Oxford, UK",
  "Dublin, Ireland",
  "Cork, Ireland",

  // Europe
  "Berlin, Germany",
  "Munich, Germany",
  "Hamburg, Germany",
  "Frankfurt, Germany",
  "Paris, France",
  "Lyon, France",
  "Amsterdam, Netherlands",
  "Rotterdam, Netherlands",
  "Madrid, Spain",
  "Barcelona, Spain",
  "Lisbon, Portugal",
  "Porto, Portugal",
  "Rome, Italy",
  "Milan, Italy",
  "Zurich, Switzerland",
  "Geneva, Switzerland",
  "Vienna, Austria",
  "Brussels, Belgium",
  "Stockholm, Sweden",
  "Copenhagen, Denmark",
  "Oslo, Norway",
  "Helsinki, Finland",
  "Warsaw, Poland",
  "Kraków, Poland",
  "Prague, Czech Republic",
  "Budapest, Hungary",
  "Bucharest, Romania",
  "Athens, Greece",
  "Istanbul, Turkey",

  // Middle East
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Doha, Qatar",
  "Riyadh, Saudi Arabia",
  "Tel Aviv, Israel",

  // Asia
  "Bangalore, India",
  "Mumbai, India",
  "Delhi, India",
  "Hyderabad, India",
  "Pune, India",
  "Chennai, India",
  "Kolkata, India",
  "Gurugram, India",
  "Noida, India",
  "Dhaka, Bangladesh",
  "Chittagong, Bangladesh",
  "Karachi, Pakistan",
  "Lahore, Pakistan",
  "Islamabad, Pakistan",
  "Colombo, Sri Lanka",
  "Kathmandu, Nepal",
  "Singapore",
  "Hong Kong",
  "Tokyo, Japan",
  "Osaka, Japan",
  "Seoul, South Korea",
  "Beijing, China",
  "Shanghai, China",
  "Shenzhen, China",
  "Taipei, Taiwan",
  "Bangkok, Thailand",
  "Jakarta, Indonesia",
  "Kuala Lumpur, Malaysia",
  "Manila, Philippines",
  "Ho Chi Minh City, Vietnam",
  "Hanoi, Vietnam",

  // Oceania
  "Sydney, Australia",
  "Melbourne, Australia",
  "Brisbane, Australia",
  "Perth, Australia",
  "Auckland, New Zealand",
  "Wellington, New Zealand",

  // Latin America
  "Mexico City, Mexico",
  "Guadalajara, Mexico",
  "São Paulo, Brazil",
  "Rio de Janeiro, Brazil",
  "Buenos Aires, Argentina",
  "Santiago, Chile",
  "Bogotá, Colombia",
  "Lima, Peru",

  // Africa
  "Lagos, Nigeria",
  "Nairobi, Kenya",
  "Cairo, Egypt",
  "Cape Town, South Africa",
  "Johannesburg, South Africa",
  "Accra, Ghana",

  // Fully remote
  "Remote",
];

/** Case-insensitive, order-aware search over the bundled location list. */
export function searchLocations(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return LOCATIONS.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const loc of LOCATIONS) {
    const lower = loc.toLowerCase();
    if (lower.startsWith(q)) starts.push(loc);
    else if (lower.includes(q)) contains.push(loc);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
