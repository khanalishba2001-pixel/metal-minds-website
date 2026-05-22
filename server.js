require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =========================
// SECURITY + BODY PARSING
// =========================
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

// =========================
// RATE LIMITERS
// =========================
const quoteRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many quote requests. Please try again later."
  }
});

const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many chatbot messages. Please try again shortly."
  }
});

// =========================
// SERVE WEBSITE FILES
// =========================
app.use(express.static(path.join(__dirname)));

// =========================
// HEALTH CHECK
// =========================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Metal Minds backend is running."
  });
});

// =========================
// QUOTE / CONTACT FORM
// =========================
app.post("/api/quote", quoteRequestLimiter, async (req, res) => {
  try {
    const { name, phone, email, product, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and message are required."
      });
    }

    const cleanedName = String(name).trim();
    const cleanedPhone = String(phone).trim();
    const cleanedEmail = email ? String(email).trim() : "Not provided";
    const cleanedProduct = product
      ? String(product).trim()
      : "General enquiry";
    const cleanedMessage = String(message).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(cleanedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.QUOTE_TO_EMAIL,
      replyTo: email || undefined,
      subject: `New Metal Minds Quote Request - ${cleanedProduct}`,
      text: `
New quote request received from the Metal Minds website.

Name: ${cleanedName}
Phone: ${cleanedPhone}
Email: ${cleanedEmail}
Product: ${cleanedProduct}

Message:
${cleanedMessage}
      `,
      html: `
        <h2>New Metal Minds Quote Request</h2>
        <p><strong>Name:</strong> ${cleanedName}</p>
        <p><strong>Phone:</strong> ${cleanedPhone}</p>
        <p><strong>Email:</strong> ${cleanedEmail}</p>
        <p><strong>Product:</strong> ${cleanedProduct}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(cleanedMessage).replace(/\n/g, "<br>")}</p>
      `
    });

    res.status(200).json({
      success: true,
      message: "Your quote request has been sent successfully."
    });
  } catch (error) {
    console.error("Quote form error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later."
    });
  }
});

// =========================
// AI CHATBOT ENDPOINT
// =========================
app.post("/api/chat", chatbotLimiter, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key is missing in the .env file."
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No chatbot messages were provided."
      });
    }

    const cleanedMessages = messages
      .slice(-8)
      .filter(
        (msg) =>
          msg &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0
      )
      .map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content.trim().slice(0, 800)
      }));

    if (cleanedMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Messages were empty."
      });
    }

    const instructions = `
You are the helpful AI assistant for Metal Minds, a steel and building materials supplier.

You help website visitors with:
- Product questions
- Basic quote preparation
- Understanding what information is needed before ordering
- Directing them to WhatsApp for detailed assistance

Metal Minds products include:
- IBR Roofing Sheets
- Barbed Wire
- Game Fence
- Brickforce
- Wire Nails
- Door Frames
- Welding Rods
- PVC Pipes
- Galvanized Wire

Rules:
- Keep answers friendly, clear, and concise.
- Never invent prices, stock availability, delivery fees, or delivery times.
- If the customer asks for pricing, exact quote, stock, bulk order, delivery, custom sizing, or wants to place an order, say the Metal Minds team can assist on WhatsApp.
- When useful, ask for quantity, product type, dimensions/specification, and delivery location.
- Never say an order has been confirmed.
- Keep most replies under 120 words.
`;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      instructions,
      input: cleanedMessages
    });

    const reply =
      response.output_text?.trim() ||
      "Thanks for your message. Please contact us on WhatsApp for further assistance.";

    res.status(200).json({
      success: true,
      reply
    });
  } catch (error) {
    console.error("Chatbot error:", error);

    res.status(500).json({
      success: false,
      message:
        "The chatbot is unavailable right now. Please use WhatsApp for assistance."
    });
  }
});

// =========================
// FALLBACK ROUTE
// =========================
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`Metal Minds server running at http://localhost:${PORT}`);
});

// =========================
// HELPER FUNCTION
// =========================
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[char];
  });
}