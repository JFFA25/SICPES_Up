const axios = require("axios");

// Helper para esperar entre intentos de consulta (polling)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generatePDF = async (data) => {
  // Falla rápido y con un mensaje claro si faltan las variables de entorno de
  // PDFMonkey (típico cuando se despliega a un hosting nuevo, como Render,
  // y el .env local -que está en .gitignore- no se replicó ahí manualmente).
  if (!process.env.PDFMONKEY_API_KEY || !process.env.PDFMONKEY_TEMPLATE_ID) {
    throw new Error(
      "Faltan las variables de entorno PDFMONKEY_API_KEY / PDFMONKEY_TEMPLATE_ID en el servidor."
    );
  }

  try {
    const headers = {
      Authorization: `Bearer ${process.env.PDFMONKEY_API_KEY}`,
      "Content-Type": "application/json",
    };

    // 1. Crear el documento (enviando el payload como string JSON)
    const response = await axios.post(
      "https://api.pdfmonkey.io/api/v1/documents",
      {
        document: {
          document_template_id: process.env.PDFMONKEY_TEMPLATE_ID,
          payload: JSON.stringify(data), // <-- PDFMonkey requiere que sea un string JSON
          status: "pending",
        },
      },
      { headers }
    );

    const documentId = response.data.document.id;

    // 2. Esperar a que el PDF se genere (Polling)
    let downloadUrl = null;
    let attempts = 0;
    const maxAttempts = 10; // Máximo 15 segundos de espera activa

    while (!downloadUrl && attempts < maxAttempts) {
      await delay(1500); // Esperar 1.5 segundos entre intentos
      attempts++;

      const statusResponse = await axios.get(
        `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
        { headers }
      );

      const doc = statusResponse.data.document;

      if (doc.status === "success") {
        downloadUrl = doc.download_url;
      } else if (doc.status === "failure") {
        throw new Error("PDFMonkey falló en la compilación interna del PDF.");
      }
    }

    if (!downloadUrl) {
      throw new Error("Tiempo de espera agotado al generar el archivo en PDFMonkey.");
    }

    // Devolvemos el objeto con la URL final para que tu controlador haga "res.json(pdf);"
    return {
      id: documentId,
      url: downloadUrl,
    };

  } catch (error) {
    // Detalle real que devuelve PDFMonkey (p. ej. { errors: { document_template_id: ["can't be blank"] } }
    // o "Template is not published"). error.message por sí solo solo dice "Request failed with status code 422".
    const apiDetail = error.response?.data;

    console.error("Error PDFMonkey:", JSON.stringify(apiDetail || { message: error.message }, null, 2));

    if (apiDetail) {
      const readable =
        typeof apiDetail.errors === "object"
          ? JSON.stringify(apiDetail.errors)
          : apiDetail.message || JSON.stringify(apiDetail);
      throw new Error(`PDFMonkey (${error.response.status}): ${readable}`);
    }

    throw error;
  }
};

// Exportamos como 'generatePDF' para que coincida exactamente con tu controlador
module.exports = {
  generatePDF,
};