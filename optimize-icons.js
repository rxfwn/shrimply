import sharp from 'sharp';
import fs from 'fs';

// Les dossiers où sont tes icônes
const inputDir = './public/icons';
const outputDir = './public/icons-opti'; // Dossier temporaire de sécurité

// Crée le dossier de destination s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Parcours toutes les images du dossier
fs.readdirSync(inputDir).forEach(file => {
  // On cible les formats classiques (tes icônes ont l'air d'être en .webp)
  if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg')) {
    
    sharp(`${inputDir}/${file}`)
      // On force la taille à 56x56 pixels (fit: 'inside' garde les proportions si elles ne sont pas parfaitement carrées)
      .resize({ width: 56, height: 56, fit: 'inside' }) 
      .webp({ quality: 85 }) // Un peu plus de qualité pour les icônes pour éviter le flou
      .toFile(`${outputDir}/${file}`)
      .then(() => console.log(`✅ Icône ${file} réduite à 56px !`))
      .catch(err => console.error(`❌ Erreur sur ${file}:`, err));
  }
});