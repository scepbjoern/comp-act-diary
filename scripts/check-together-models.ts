
import Together from 'together-ai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function listModels() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.error('Error: TOGETHER_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Using API Key:', apiKey.substring(0, 5) + '...');

  const together = new Together({ apiKey });

  try {
    const models = await together.models.list();
    
    console.log('\n--- Available Image Models ---');
    const imageModels = models.filter(m => m.type === 'image' || m.id.includes('image') || m.id.includes('FLUX') || m.id.includes('Seedream'));
    
    if (imageModels.length === 0) {
        console.log('No models with type "image" found. Listing ALL models that might be relevant:');
         models.forEach(m => {
            if (m.id.includes('diffusion') || m.id.includes('flux') || m.id.includes('image')) {
                 console.log(`- ${m.id} (type: ${m.type})`);
            }
        });
    } else {
        imageModels.forEach(m => {
            console.log(`- ${m.id} (type: ${m.type})`);
        });
    }

    console.log('\n--- Checking specific user-requested models ---');
    const requested = ['google/flash-image-2.5', 'ByteDance-Seed/Seedream-4.0', 'black-forest-labs/FLUX.1-schnell', 'black-forest-labs/FLUX.1-schnell-Free'];
    
    for (const reqId of requested) {
        const found = models.find(m => m.id === reqId);
        if (found) {
            console.log(`[AVAILABLE] ${reqId}`);
        } else {
            console.log(`[MISSING]   ${reqId}`);
        }
    }

  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
