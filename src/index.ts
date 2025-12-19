import "dotenv/config";
import express, { Request, Response } from "express";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middleware/errorHandler";
import reservationRoutes from "./routes/reservationRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/reservations", reservationRoutes);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
