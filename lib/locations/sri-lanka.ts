import { getProvinces, provinceOptions } from "sri-lanka-locations";

export { getProvinces, provinceOptions };

export type SriLankaCity = {
  name: string;
  province: string;
};

/** Major cities and towns for registration suggestions, tagged by province. */
export const MAJOR_CITIES: SriLankaCity[] = [
  // Western
  { name: "Colombo", province: "Western" },
  { name: "Dehiwala-Mount Lavinia", province: "Western" },
  { name: "Moratuwa", province: "Western" },
  { name: "Sri Jayawardenepura Kotte", province: "Western" },
  { name: "Negombo", province: "Western" },
  { name: "Gampaha", province: "Western" },
  { name: "Kalutara", province: "Western" },
  { name: "Panadura", province: "Western" },
  { name: "Wattala", province: "Western" },
  { name: "Horana", province: "Western" },
  // Central
  { name: "Kandy", province: "Central" },
  { name: "Matale", province: "Central" },
  { name: "Nuwara Eliya", province: "Central" },
  { name: "Peradeniya", province: "Central" },
  { name: "Gampola", province: "Central" },
  { name: "Dambulla", province: "Central" },
  // Southern
  { name: "Galle", province: "Southern" },
  { name: "Matara", province: "Southern" },
  { name: "Hambantota", province: "Southern" },
  { name: "Weligama", province: "Southern" },
  { name: "Tangalle", province: "Southern" },
  { name: "Ambalangoda", province: "Southern" },
  // Northern
  { name: "Jaffna", province: "Northern" },
  { name: "Vavuniya", province: "Northern" },
  { name: "Kilinochchi", province: "Northern" },
  { name: "Mannar", province: "Northern" },
  { name: "Point Pedro", province: "Northern" },
  // Eastern
  { name: "Batticaloa", province: "Eastern" },
  { name: "Trincomalee", province: "Eastern" },
  { name: "Ampara", province: "Eastern" },
  { name: "Kalmunai", province: "Eastern" },
  // North Western
  { name: "Kurunegala", province: "North Western" },
  { name: "Chilaw", province: "North Western" },
  { name: "Puttalam", province: "North Western" },
  { name: "Kuliyapitiya", province: "North Western" },
  // North Central
  { name: "Anuradhapura", province: "North Central" },
  { name: "Polonnaruwa", province: "North Central" },
  // Uva
  { name: "Badulla", province: "Uva" },
  { name: "Monaragala", province: "Uva" },
  { name: "Bandarawela", province: "Uva" },
  { name: "Haputale", province: "Uva" },
  // Sabaragamuwa
  { name: "Ratnapura", province: "Sabaragamuwa" },
  { name: "Kegalle", province: "Sabaragamuwa" },
  { name: "Balangoda", province: "Sabaragamuwa" },
  { name: "Embilipitiya", province: "Sabaragamuwa" },
];

export function getProvinceLabels(): string[] {
  return getProvinces();
}

export function getCityLabelsForProvince(province: string): string[] {
  if (!province.trim()) return [];
  const normalized = province.trim().toLowerCase();
  return MAJOR_CITIES.filter(
    (city) => city.province.toLowerCase() === normalized,
  ).map((city) => city.name);
}

export function isCityInProvinceList(city: string, province: string): boolean {
  if (!city.trim() || !province.trim()) return false;
  const normalizedCity = city.trim().toLowerCase();
  return getCityLabelsForProvince(province).some(
    (label) => label.toLowerCase() === normalizedCity,
  );
}
