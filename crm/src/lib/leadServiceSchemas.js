/** Service type taxonomy — mirrors backend ALLOWED_SERVICE_TYPES / detail schemas. */

import { DEFAULT_GST_PERCENT } from "@/lib/productPricing";

export const SERVICE_TYPE_OPTIONS = [
  { value: "visa", label: "Visa" },
  { value: "passport", label: "Passport" },
  { value: "hotel_booking", label: "Hotel Booking" },
  { value: "ticket", label: "Ticket" },
  { value: "package", label: "Packages" },
  { value: "travel_insurance", label: "Travel Insurance" },
  { value: "car_booking", label: "Car Booking" },
];

export const SERVICE_TYPE_LABELS = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const VISA_TYPE_OPTIONS = [
  { value: "tourist", label: "Tourist" },
  { value: "business", label: "Business" },
  { value: "transit", label: "Transit" },
  { value: "other_general", label: "Other" },
];

export const PASSPORT_SERVICE_OPTIONS = [
  { value: "fresh", label: "Fresh" },
  { value: "reissue", label: "Reissue" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "minor", label: "Minor" },
  { value: "tatkal", label: "Tatkal" },
];

export const TRIP_TYPE_OPTIONS = [
  { value: "one_way", label: "One way" },
  { value: "round_trip", label: "Round trip" },
  { value: "multi_city", label: "Multi city" },
];

export const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "gujarati", label: "Gujarati" },
  { value: "other", label: "Other" },
];

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
];

/** Declarative field configs per service_type */
export const SERVICE_FIELD_SCHEMAS = {
  visa: [
    { key: "visa_product_id", label: "Visa product", type: "product_visa", required: true },
    { key: "country_code", label: "Country", type: "readonly" },
    { key: "visa_type", label: "Visa type", type: "readonly", format: "visa_type" },
    { key: "adults", label: "Adults", type: "number", min: 1, max: 40, default: 1 },
    { key: "children", label: "Child (3–14 years)", type: "number", min: 0, max: 40, default: 0 },
    { key: "infants", label: "Infant (0–2 years)", type: "number", min: 0, max: 40, default: 0 },
    { key: "govt_fee_per_person", label: "Government fee (incl. GST)", type: "money_readonly" },
    { key: "service_fee_per_person", label: "Service fee (excl. GST)", type: "money_readonly" },
    { key: "gst_percent", label: "GST % on service", type: "money_readonly", default: DEFAULT_GST_PERCENT },
    { key: "total_amount", label: "Total (all members)", type: "money_readonly" },
    { key: "refusal_faced", label: "Ever faced visa refusal?", type: "checkbox" },
    { key: "refusal_details", label: "Refusal details", type: "textarea", showIf: (d) => d.refusal_faced },
  ],
  passport: [
    { key: "passport_product_id", label: "Passport product", type: "product_passport", required: true },
    { key: "passport_service_type", label: "Passport service", type: "readonly", format: "passport_service" },
    { key: "applicants_count", label: "Applicants", type: "number", min: 1, max: 20, default: 1 },
    { key: "govt_fee_per_person", label: "Government fee (incl. GST)", type: "money_readonly" },
    { key: "service_fee_per_person", label: "Service fee (excl. GST)", type: "money_readonly" },
    { key: "gst_percent", label: "GST % on service", type: "money_readonly", default: DEFAULT_GST_PERCENT },
    { key: "total_amount", label: "Total", type: "money_readonly" },
  ],
  hotel_booking: [
    { key: "destination", label: "Destination", type: "text" },
    { key: "check_in", label: "Check-in", type: "date" },
    { key: "check_out", label: "Check-out", type: "date" },
    { key: "rooms", label: "Rooms", type: "number", min: 1, default: 1 },
    { key: "guests", label: "Guests", type: "number", min: 1, default: 1 },
    { key: "budget", label: "Budget (INR)", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  ticket: [
    { key: "trip_type", label: "Trip type", type: "select", options: TRIP_TYPE_OPTIONS },
    { key: "origin", label: "Origin", type: "text" },
    { key: "destination", label: "Destination", type: "text" },
    { key: "destination_country_code", label: "Destination country", type: "country" },
    { key: "departure_date", label: "Departure", type: "date" },
    { key: "return_date", label: "Return", type: "date" },
    { key: "passengers", label: "Passengers", type: "number", min: 1, default: 1 },
    { key: "budget", label: "Budget (INR)", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  package: [
    { key: "destination", label: "Destination", type: "text" },
    { key: "destination_country_code", label: "Country", type: "country" },
    { key: "travel_date", label: "Travel date", type: "date" },
    { key: "duration_days", label: "Duration (days)", type: "number", min: 1 },
    { key: "travelers", label: "Travelers", type: "number", min: 1, default: 1 },
    { key: "budget", label: "Budget (INR)", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  travel_insurance: [
    { key: "destination_country_code", label: "Destination country", type: "country" },
    { key: "travel_start", label: "Travel start", type: "date" },
    { key: "travel_end", label: "Travel end", type: "date" },
    { key: "travelers", label: "Travelers", type: "number", min: 1, default: 1 },
    { key: "coverage_amount", label: "Coverage amount", type: "number", step: "0.01" },
    { key: "budget", label: "Premium budget (INR)", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  car_booking: [
    { key: "pickup_location", label: "Pickup location", type: "text" },
    { key: "drop_location", label: "Drop location", type: "text" },
    { key: "pickup_date", label: "Pickup date", type: "date" },
    { key: "drop_date", label: "Drop date", type: "date" },
    { key: "car_type", label: "Car type", type: "text", placeholder: "Sedan / SUV / …" },
    { key: "budget", label: "Budget (INR)", type: "number", step: "0.01" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export function emptyServiceDetails(serviceType) {
  const schema = SERVICE_FIELD_SCHEMAS[serviceType] || [];
  const out = {};
  schema.forEach((f) => {
    if (f.default !== undefined) out[f.key] = f.default;
    else if (f.type === "checkbox") out[f.key] = false;
    else if (f.type === "number") out[f.key] = f.min ?? "";
    else out[f.key] = "";
  });
  return out;
}

export function sumServiceTotals(serviceTypes, serviceDetailsMap) {
  return serviceTypes.reduce((sum, st) => {
    const total = Number(serviceDetailsMap[st]?.total_amount);
    return sum + (Number.isFinite(total) ? total : 0);
  }, 0);
}

export const SIMPLE_SERVICE_TYPES = new Set([
  "hotel_booking",
  "ticket",
  "package",
  "travel_insurance",
  "car_booking",
]);

export function validateProductServiceDetails(serviceType, details) {
  if (serviceType === "visa" && !details?.visa_product_id) {
    return "Select a visa product";
  }
  if (serviceType === "passport" && !details?.passport_product_id) {
    return "Select a passport product";
  }
  return null;
}
