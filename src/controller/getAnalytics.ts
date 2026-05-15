import { Request, Response } from "express";
import dotenv from "dotenv";
import WeatherDetails from "../model/weatherDetails";
import { sendErrorResponse } from "../utils/errorHandler";

dotenv.config();

const apiKey = process.env.API_KEY;
const HEAT_WAVE_THRESHOLD = 35;
const COLD_WAVE_THRESHOLD = 10;
const FORECAST_SLOTS_PER_DAY = 8;
const HEAT_WAVE_WARNING =
  "Heat Wave Warning: temperature can go above 35°C";
const COLD_WAVE_WARNING =
  "Cold Wave Warning: temperature can go below 10°C";

interface ForecastSlot {
  main: { temp: number; temp_max: number; temp_min: number };
  dt_txt: string;
}

interface DayReport {
  maxTemp: number;
  minTemp: number;
  date: string;
}

interface StoredCityWeather {
  highestTemperature?: number;
  lowestTemperature?: number;
}

function summarizeDaySlots(daySlots: ForecastSlot[]) {
  let maxTemp = 0;
  let minTemp = Infinity;
  let heatWaveWarning = "";
  let coldWaveWarning = "";

  for (const { main } of daySlots) {
    if (main.temp_max > maxTemp) {
      maxTemp = main.temp;
      if (maxTemp > HEAT_WAVE_THRESHOLD) {
        heatWaveWarning = HEAT_WAVE_WARNING;
      }
    }
    if (main.temp_min < minTemp) {
      minTemp = main.temp_min;
      if (minTemp < COLD_WAVE_THRESHOLD) {
        coldWaveWarning = COLD_WAVE_WARNING;
      }
    }
  }

  return {
    maxTemp,
    minTemp,
    date: daySlots[0].dt_txt,
    heatWaveWarning,
    coldWaveWarning,
  };
}

function buildFiveDayReport(forecastList: ForecastSlot[]) {
  const nextfiveDaysReport: Record<string, DayReport> = {};
  let heatWaveWarning = "";
  let coldWaveWarning = "";

  for (
    let offset = 0, dayNumber = 1;
    offset < forecastList.length;
    offset += FORECAST_SLOTS_PER_DAY, dayNumber++
  ) {
    const summary = summarizeDaySlots(
      forecastList.slice(offset, offset + FORECAST_SLOTS_PER_DAY),
    );

    if (summary.heatWaveWarning) {
      heatWaveWarning = summary.heatWaveWarning;
    }
    if (summary.coldWaveWarning) {
      coldWaveWarning = summary.coldWaveWarning;
    }

    nextfiveDaysReport[`Day${dayNumber}`] = {
      maxTemp: summary.maxTemp,
      minTemp: summary.minTemp,
      date: summary.date,
    };
  }

  return { nextfiveDaysReport, heatWaveWarning, coldWaveWarning };
}

function applyStoredTemperatures(
  cityDetails: Record<string, unknown>,
  weatherDetail: unknown,
) {
  const stored = weatherDetail as StoredCityWeather | null;

  if (stored?.highestTemperature) {
    cityDetails.highestTemperature = stored.highestTemperature || "";
  }
  if (stored?.lowestTemperature) {
    cityDetails.lowestTemperature = stored.lowestTemperature || "";
  }
}

const getAnalyticsData = async (req: Request, res: Response) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).send("City is required");
    }

    const [weatherDetail, response] = await Promise.all([
      WeatherDetails.findOne({ where: { city } }),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`,
      ),
    ]);

    const data = await response.json();
    const { nextfiveDaysReport, heatWaveWarning, coldWaveWarning } =
      buildFiveDayReport(data.list);

    //console.log("finalResponse", weatherDetail);

    const finalResponse = {
      cityDetails: { ...data.city },
      nextfiveDaysReport,
      heatWaveWarning,
      coldWaveWarning,
    };

    applyStoredTemperatures(finalResponse.cityDetails, weatherDetail);

    return res.send(finalResponse);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

export { getAnalyticsData };
