import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { app } from "./app.js";
import { v2 as Cloudinary } from "cloudinary";

dotenv.config({
  path: "./.env",
});

app.use(
  cors({
    origin: ["http://localhost:5173"],
  }),
);


Cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const upload = multer({ dest: "uploads/" });


app.get("/", (req, res) => {
  res.setHeader("customvalue", "somehting");
  res.status(200).json({
    success: true,
    message: "Server is working fine",
  });
});

app.post("/upload", upload.array("files"), async (req, res) => {
  console.log(req.files);

  // for (const file of req.files) {
  //   if (file.size > 1000000) {
  //     return res.status(413).json({
  //       success: true,
  //       message: `${file.originalname} exceeds the max allowed size`,
  //     });
  //   }
  // }

  const result = await Cloudinary.uploader.upload(req.files[0].path);

  return res.status(200).json({
    success: true,
    message: "Uploaded successfully",
    result,
  });
});

app.listen(process.env.PORT, () => {
  console.log("Server is started at", process.env.PORT);
});
