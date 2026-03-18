import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.route";
import serviceRoutes from "./src/routes/service.route";

const app = express();
const PORT = Bun.env.PORT;

app.use(express.json());
app.use(cors());

app.use("/api/auth",authRoutes);
app.use("/services",serviceRoutes);

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`); 
});