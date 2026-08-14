import { decimal } from "@/domain/calculators/decimal";

export const lengthUnits = ["metre", "centimetre", "foot"] as const;
export type LengthUnit = (typeof lengthUnits)[number];

export const distanceUnits = ["kilometre", "mile"] as const;
export type DistanceUnit = (typeof distanceUnits)[number];

export const volumeUnits = ["litre", "us-gallon", "imperial-gallon"] as const;
export type VolumeUnit = (typeof volumeUnits)[number];

const lengthToMetres: Record<LengthUnit, string> = {
  metre: "1",
  centimetre: "0.01",
  foot: "0.3048",
};

const distanceToKilometres: Record<DistanceUnit, string> = {
  kilometre: "1",
  mile: "1.609344",
};

const volumeToLitres: Record<VolumeUnit, string> = {
  litre: "1",
  "us-gallon": "3.785411784",
  "imperial-gallon": "4.54609",
};

export const lengthUnitOptions = [
  { label: "Metres", value: "metre" },
  { label: "Centimetres", value: "centimetre" },
  { label: "Feet", value: "foot" },
];

export const distanceUnitOptions = [
  { label: "Kilometres", value: "kilometre" },
  { label: "Miles", value: "mile" },
];

export const volumeUnitOptions = [
  { label: "Litres", value: "litre" },
  { label: "US gallons", value: "us-gallon" },
  { label: "Imperial gallons", value: "imperial-gallon" },
];

export const squareUnitLabels: Record<LengthUnit, string> = {
  metre: "m2",
  centimetre: "cm2",
  foot: "ft2",
};

export function lengthInMetres(value: string, unit: LengthUnit) {
  return decimal(value).mul(lengthToMetres[unit]);
}

export function metresInUnit(value: string, unit: LengthUnit) {
  return decimal(value).div(lengthToMetres[unit]);
}

export function squareMetresInUnit(value: string, unit: LengthUnit) {
  return decimal(value).div(decimal(lengthToMetres[unit]).pow(2));
}

export function distanceInKilometres(value: string, unit: DistanceUnit) {
  return decimal(value).mul(distanceToKilometres[unit]);
}

export function kilometresInUnit(value: string, unit: DistanceUnit) {
  return decimal(value).div(distanceToKilometres[unit]);
}

export function volumeInLitres(value: string, unit: VolumeUnit) {
  return decimal(value).mul(volumeToLitres[unit]);
}

export function litresInUnit(value: string, unit: VolumeUnit) {
  return decimal(value).div(volumeToLitres[unit]);
}
