// model for weather details
import { DataTypes } from "sequelize";
import sequelize from "../db/config";

const WeatherDetails = sequelize.define("CityWeatherDetails", {
  id: {
    type: DataTypes.INTEGER,
    
    primaryKey: true,
    autoIncrement: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  highestTemperature: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lowestTemperature: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

export default WeatherDetails;
