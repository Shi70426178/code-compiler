import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fetch from "node-fetch";
import { Buffer } from "buffer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
app.use(bodyParser.json());

// CORS Configuration: Allow requests from the frontend hosted on Netlify
app.use(cors({
  origin: 'https://onlinecompilers.netlify.app', // frontend domain
  methods: ['GET', 'POST', 'OPTIONS'], // Handle OPTIONS preflight requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Add any necessary headers
}));

// Handle preflight requests
app.options("*", cors());

// Function to decode Base64
const decodeBase64 = (str) => {
  if (!str) return null;
  return Buffer.from(str, "base64").toString("utf-8");
};

// Function to poll Judge0 for submission status
const getSubmissionResult = async (token) => {
  const url = `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": process.env.RapidAPI_Key,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching submission result:", error);
    return null;
  }
};

app.post("/compile", async (req, res) => {
  const { code, languageId, input } = req.body;

  // Validate input
  if (!code || !languageId) {
    return res.status(400).json({ error: "Code and language ID are required" });
  }

  // Step 1: Submit code to Judge0
  const submitUrl = "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true";
  const submitOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": process.env.RapidAPI_Key,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
    body: JSON.stringify({
      source_code: Buffer.from(code).toString("base64"),
      language_id: languageId,
      stdin: Buffer.from(input || "").toString("base64"),
    }),
  };

  try {
    const submitResponse = await fetch(submitUrl, submitOptions);
    const submitData = await submitResponse.json();

    if (!submitData.token) {
      return res.status(500).json({ error: "Failed to submit code" });
    }

    const { token } = submitData;

    // Step 2: Poll Judge0 for submission result
    let result = null;
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 1000;

    while (attempts < maxAttempts) {
      result = await getSubmissionResult(token);

      // If submission is processed, break the loop
      if (result.status?.id !== 1 && result.status?.id !== 2) {
        break;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }

    // Handle polling timeout
    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: "Submission timed out" });
    }

    // Decode the result fields
    if (result) {
      const decodedResult = {
        output: decodeBase64(result.stdout),
        error: decodeBase64(result.stderr),
        compileOutput: decodeBase64(result.compile_output),
        status: result.status,
      };

      // Return the decoded result to the frontend
      res.json(decodedResult);
    } else {
      res.status(500).json({ error: "Failed to get submission result" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
