import sharp from 'sharp';
import fs from 'fs';

// Les dossiers où sont tes images
const inputDir = './public/recipes';
const outputDir = './public/recipes-opti'; // On crée un nouveau dossier pour ne pas écraser tes originaux au cas où !

// Crée le dossier de destination s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Parcours toutes les images du dossier
fs.readdirSync(inputDir).forEach(file => {
  if (file.endsWith('.webp') || file.endsWith('.jpg') || file.endsWith('.png')) {
    
    // sharp entre en action ici !
    sharp(`${inputDir}/${file}`)
      .resize({ width: 800 }) // Force la largeur à 800px (la hauteur s'adapte)
      .webp({ quality: 80 })  // Compresse en WebP avec 80% de qualité
      .toFile(`${outputDir}/${file}`)
      .then(() => console.log(`✅ ${file} optimisée avec succès !`))
      .catch(err => console.error(`❌ Erreur sur ${file}:`, err));
  }
});