import express, { NextFunction, Request, Response } from "express";
import weatherRoutes from "./src/routes/weather";
import dotenv from "dotenv";
import sequelize from "./src/db/config";
import WeatherDetails from "./src/model/weatherDetails";
import { getErrorMessage } from "./src/utils/errorHandler";

dotenv.config();
const app = express();

app.use(express.json());

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    //console.log("Database connected");
  } catch (error) {
    //console.error("Error connecting to database", error);
  }
};

const createTables = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableName = WeatherDetails.getTableName();
    const tableExists = await queryInterface.tableExists(tableName);

    if (tableExists) {
      //console.log("Tables already exist");
      return;
    }

    await WeatherDetails.sync();
    //console.log("Tables created");
  } catch (error) {
    //console.error("Error creating tables", error);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await createTables();

    app.use("/analytics", weatherRoutes);

    app.use((req: Request, res: Response) => {
      res.status(404).json({ message: "Route not found" });
    });

    app.use(
      (error: unknown, req: Request, res: Response, next: NextFunction) => {
        //console.error(error);
        res.status(500).json({ message: getErrorMessage(error) });
      },
    );

    app.listen(3000, () => {
      //console.log("Server is running on port 3000");
    });
  } catch (error) {
    //console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
