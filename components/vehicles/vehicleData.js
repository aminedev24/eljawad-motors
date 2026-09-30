import getConfig from "next/config";

let makesData = [];
let modelsData = {};

// window.open/next/config's basePath, not fetch() itself, know about the
// GitHub Pages build's /eljawad-motors prefix - a bare '/make_models.json'
// 404s there silently (caught below), leaving the make/model catalog empty.
const makeModelsUrl = () => {
  const { publicRuntimeConfig } = getConfig() || {};
  const basePath = publicRuntimeConfig?.basePath || "";
  return `${basePath}/make_models.json`;
};

export const setMakesData = (makes) => {
  makesData = makes;
};

export const getMakesData = () => {
  return makesData;
};

export const setModelsData = (models) => {
  modelsData = models;
};

export const getModelsData = () => {
  return modelsData;
};

// Fetch makes from local JSON file
export const fetchMakes = async () => {
  try {
    const response = await fetch(makeModelsUrl()); // Fetch local JSON
    const data = await response.json();

    const makes = Object.keys(data); // Extract makes from JSON keys

    setMakesData(makes);
    return makes;
  } catch (error) {
    console.error("Error loading makes:", error);
    return [];
  }
};

// Fetch models for a selected make
export const fetchModelsForMake = async (make) => {
  try {
    const response = await fetch(makeModelsUrl());
    const data = await response.json();

    const models = data[make] || []; // Get models for the make

    setModelsData({ ...getModelsData(), [make]: models });
    return models;
  } catch (error) {
    console.error(`Error loading models for ${make}:`, error);
    return [];
  }
};

// Fetch the full makes -> models map in a single call
export const fetchAllMakesModels = async () => {
  try {
    const response = await fetch(makeModelsUrl());
    const data = await response.json();
    setMakesData(Object.keys(data));
    setModelsData(data);
    return data;
  } catch (error) {
    console.error("Error loading makes/models:", error);
    return {};
  }
};

// Display helper: TOYOTA -> Toyota, MERCEDES BENZ -> Mercedes Benz
export const titleCaseMake = (make) => {
  if (!make) return '';
  return String(make)
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const bodyTypeOptions = [
  "Sedan", "Hatchback", "SUV", "Coupe", "Convertible",
  "Wagon", "Van", "Pickup", "Minivan", "Truck", "Other"
];

export const transmissionOptions = [
  "Automatic", "Manual", "Semi-Automatic", "CVT"
];
