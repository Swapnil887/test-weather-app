const express = require("express");
import { getWeatherData } from "../controller/getWeatherData";
import { getAnalyticsData } from "../controller/getAnalytics";

const router = express();


router.get("/city/:city", getAnalyticsData);

router.post("/city", getWeatherData);


export default router;
