// server.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const app = express();
const upload = multer();

// ✅ endpoint para verificar si el servicio está vivo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Image merge service is alive' });
});

app.post('/merge', upload.any(), async (req, res) => {
  try {
    console.log('Campos de texto en req.body:');
    console.log(req.body);

    console.log('Archivos recibidos en req.files:');
    console.log(req.files);  // Aquí ves todo lo que Multer capturó

    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded');
    }

    // Extraemos los buffers de todos los archivos recibidos, sin importar el campo
    const buffers = req.files.map(file => file.buffer);

    // Procesamos las imágenes: redimensionar a 300px de ancho (manteniendo proporción)
    const images = await Promise.all(
      buffers.map(buf => sharp(buf).resize(300).toBuffer())
    );

    // Tomamos las dimensiones de la primera imagen para calcular la imagen final
    const { width, height } = await sharp(images[0]).metadata();

    // Creamos una imagen nueva lo suficientemente ancha para juntar todas en horizontal
    const merged = await sharp({
      create: {
        width: width * images.length,
        height,
        channels: 3,
        background: 'white'
      }
    })
      .composite(
        images.map((img, i) => ({ input: img, left: i * width, top: 0 }))
      )
      .jpeg()
      .toBuffer();

    res.set('Content-Type', 'image/jpeg');
    res.send(merged);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error merging images');
  }
});

const PORT = 5679;
app.listen(PORT, () => {
  console.log(`Image merge service listening at http://localhost:${PORT}`);
});
