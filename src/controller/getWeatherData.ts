import { Request, Response } from "express";
import dotenv from "dotenv";
import WeatherDetails from "../model/weatherDetails";
import { sendErrorResponse } from "../utils/errorHandler";

dotenv.config();

const apiKey = process.env.API_KEY;
const HOT_CITY_THRESHOLD = 20;

if (!apiKey) {
  throw new Error("API key is not set");
}

interface WeatherApiResponse {
  name: string;
  main: { temp: number; temp_max: number; temp_min: number };
  coord: { lat: number; lon: number };
}

interface StoredCityWeather {
  highestTemperature: number;
  lowestTemperature: number;
}

interface CityWeatherResult {
  cityName: string;
  data: WeatherApiResponse;
}

interface TemperatureByCity {
  city: string;
  temp: number;
}

async function fetchCityWeather(cityName: string) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`,
  );
  return response.json() as Promise<WeatherApiResponse>;
}

async function persistCityWeather(
  cityName: string,
  data: WeatherApiResponse,
  weatherDetail: unknown,
) {
  const stored = weatherDetail as StoredCityWeather | null;

  if (!stored) {
    await WeatherDetails.create({
      city: cityName,
      highestTemperature: data.main.temp_max,
      lowestTemperature: data.main.temp_min,
      latitude: data.coord.lat,
      longitude: data.coord.lon,
    });
    return;
  }

  await WeatherDetails.update(
    {
      highestTemperature: Math.max(
        stored.highestTemperature,
        data.main.temp_max,
      ),
      lowestTemperature: Math.min(stored.lowestTemperature, data.main.temp_min),
      latitude: data.coord.lat,
      longitude: data.coord.lon,
    },
    { where: { city: cityName } },
  );
}

async function fetchAndPersistCity(
  cityName: string,
): Promise<CityWeatherResult> {
  const [data, weatherDetail] = await Promise.all([
    fetchCityWeather(cityName),
    WeatherDetails.findOne({ where: { city: cityName } }),
  ]);

  //console.log("weatherDetail", weatherDetail);

  await persistCityWeather(cityName, data, weatherDetail);

  return { cityName, data };
}

function buildWeatherSummary(results: CityWeatherResult[]) {
  const weatherData = results.map(({ data }) => data);
  const allCityTempSum = weatherData.reduce(
    (sum, entry) => sum + entry.main.temp,
    0,
  );

  let highestTemperature: TemperatureByCity = { city: "", temp: 0 };
  let lowestTemperature: TemperatureByCity = { city: "", temp: Infinity };

  for (const { cityName, data } of results) {
    if (data.main.temp > highestTemperature.temp) {
      highestTemperature = { city: cityName, temp: data.main.temp };
    }
    if (data.main.temp < lowestTemperature.temp) {
      lowestTemperature = { city: cityName, temp: data.main.temp };
    }
  }

  const averageTemperature = +(allCityTempSum / results.length).toFixed(1);

  const hotCities = weatherData
    .filter((entry) => entry.main.temp > HOT_CITY_THRESHOLD)
    .map((entry) => entry.name);

  return {
    averageTemperature,
    highestTemperature,
    lowestTemperature,
    hotCities,
  };
}

const getWeather = async (cities: string[]) => {
  if (!cities) {
    throw new Error("City is not set");
  }

  const results = await Promise.all(cities.map(fetchAndPersistCity));
  return buildWeatherSummary(results);
};

const getWeatherData = async (req: Request, res: Response) => {
  try {
    const { city } = req.body;

    if (!city) {
      return res.status(400).send("City is required");
    }

    const weather = await getWeather(city as string[]);
    return res.send(weather);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

export { getWeatherData };
