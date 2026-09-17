import { GoogleGenAI } from '@google/genai';
import { AIBrainPlan, AspectRatio, GenerationMode, ReferenceImage, VideoMotionConfig } from '../../src/types';

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * AI Brain:
 * Analyzes the user's prompt + optional reference image.
 * Understands intent, improves/structures the prompt, determines visual style,
 * composition, subject details, lighting, camera/motion instructions, and preservation requirements.
 */
export async function planCreativeGeneration(params: {
  mode: GenerationMode;
  rawPrompt: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  videoMotion?: VideoMotionConfig;
}): Promise<AIBrainPlan> {
  const { mode, rawPrompt, referenceImage, aspectRatio, videoMotion } = params;
  const ai = getGeminiClient();

  if (ai) {
    try {
      const contents: Array<any> = [];

      // If reference image provided, pass it to Gemini for visual analysis and preservation detection
      if (referenceImage?.dataUrl) {
        const matches = referenceImage.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          contents.push({
            inlineData: {
              mimeType: matches[1] || 'image/jpeg',
              data: matches[2],
            }
          });
        }
      }

      const systemPrompt = `You are the lead Creative Director & AI Visual Engineer at AI Studio.
Your responsibility is to analyze the user's input prompt and any attached reference image, and generate a meticulously structured, professional plan for ${mode === 'video' ? 'a 10-second cinematic video' : 'a high-fidelity photographic/artistic image'}.

CRITICAL ARCHITECTURAL DIRECTIVES:
1. PRESERVE USER INTENT: Enhance the user's creative vision into a rich, photorealistic production prompt without arbitrarily replacing their core subject, aesthetic, or desired atmosphere.
2. REFERENCE IMAGE PRESERVATION: If an image is attached, inspect it thoroughly: identify key subjects, product features, logos/branding, garment design, exact color scheme, material textures, and compositional balance that MUST be preserved. Do not hallucinate details not present.
3. VIDEO GENERATION TARGET (${mode === 'video'}): Detail a strict 10-second timeline with continuous camera movement, subject kinetics, ambient motion, lighting evolution, and temporal consistency.
4. Output STRICT JSON conforming to the schema below without markdown backticks or commentary:
{
  "originalPrompt": "${rawPrompt.replace(/"/g, '\\"')}",
  "enhancedPrompt": "Highly descriptive, vivid, cinematic prompt capturing subject, textures, lighting, camera lens, environment, and mood while strictly honoring the user's original concept",
  "intent": "Concise summary of the visual and emotional intent",
  "visualStyle": "Specific style (e.g. 35mm Arri Alexa cinematography, Hasselblad macro commercial, hyper-detailed cyberpunk, etc.)",
  "composition": "Framing, focal depth, camera height, and spatial balance",
  "subjectDetails": "Intricate surface textures, anatomy, materials, physics, expressions",
  "lighting": "Light source, direction, intensity, volumetric diffusion, specular reflections",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "referencePreservation": [
    "Specific element 1 to preserve from reference (or 'None' if no image)",
    "Specific element 2"
  ],
  "negativeConstraints": "blurry, noise, low resolution, artifacts, distorted anatomy, warped geometry, oversaturated plastic sheen, text watermark, flicker",
  ${mode === 'video' ? `
  "videoPlan": {
    "cameraMovement": "${videoMotion?.cameraMovement || 'Slow fluid forward tracking shot'}",
    "subjectMotion": "${videoMotion?.subjectMotion || 'Natural, lifelike motion with organic momentum'}",
    "environmentMotion": "Subtle atmospheric particles, natural ambient breeze, shifting specular highlights",
    "speed": "${videoMotion?.speed || 'medium'}",
    "cinematicDirection": "Anamorphic widescreen 24fps motion blur, realistic temporal consistency, smooth physics across 10 seconds",
    "durationSeconds": 10,
    "timelineKeyframes": [
      "00:00 - 00:02: Establishing initial framing with fluid camera ingress",
      "00:02 - 00:05: Subject motion accelerates with secondary particle dynamics",
      "00:05 - 00:08: Dynamic lighting shift revealing intricate material textures",
      "00:08 - 00:10: Graceful deceleration framing final hero composition"
    ]
  }` : ''}
}`;

      contents.push({
        text: `User Prompt: "${rawPrompt}"
Desired Mode: ${mode}
Aspect Ratio: ${aspectRatio}
Has Reference Image: ${Boolean(referenceImage?.dataUrl)}
${videoMotion ? `User Motion Preferences: ${JSON.stringify(videoMotion)}` : ''}

${systemPrompt}`
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Brain generation timeout after 25000ms')), 25000)
      );

      let response: any;
      try {
        const generatePromise = ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config: {
            temperature: 0.7,
          }
        });
        response = await Promise.race([generatePromise, timeoutPromise]);
      } catch (err: any) {
        // Fallback to gemini-3.8-flash or gemini-3.1-flash-lite if needed
        const fallbackPromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            temperature: 0.7,
          }
        });
        response = await Promise.race([fallbackPromise, timeoutPromise]);
      }

      const text = response.text || '';
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        originalPrompt: rawPrompt,
        enhancedPrompt: parsed.enhancedPrompt || rawPrompt,
        intent: parsed.intent || 'High-fidelity visual generation',
        visualStyle: parsed.visualStyle || 'Ultra-detailed cinematic rendering',
        composition: parsed.composition || 'Balanced dynamic composition',
        subjectDetails: parsed.subjectDetails || 'Rich photorealistic textures and contours',
        lighting: parsed.lighting || 'Cinematic volumetric lighting with subtle rim highlights',
        colorPalette: parsed.colorPalette || ['#1e1e24', '#4a4e69', '#9a8c98', '#f2e9e4'],
        referencePreservation: parsed.referencePreservation || (referenceImage ? ['Subject silhouette', 'Color scheme', 'Dominant focal elements'] : []),
        negativeConstraints: parsed.negativeConstraints || 'blurry, noise, low resolution, bad anatomy, artifacts, distortions',
        videoPlan: mode === 'video' ? {
          cameraMovement: parsed.videoPlan?.cameraMovement || 'Slow cinematic forward dolly tracking shot',
          subjectMotion: parsed.videoPlan?.subjectMotion || 'Organic fluid lifelike motion',
          environmentMotion: parsed.videoPlan?.environmentMotion || 'Atmospheric drift and ambient reflections',
          speed: parsed.videoPlan?.speed || 'medium',
          cinematicDirection: parsed.videoPlan?.cinematicDirection || '35mm anamorphic film look with 24fps motion blur',
          durationSeconds: 10,
          timelineKeyframes: parsed.videoPlan?.timelineKeyframes || [
            '0s-2s: Smooth establishing motion',
            '3s-6s: Core subject kinetic movement',
            '7s-10s: Graceful settling into balanced frame'
          ]
        } : undefined
      };
    } catch (err) {
      console.warn('Gemini AI Brain encountered error, falling back to algorithmic Brain:', err);
    }
  }

  // Algorithmic Fallback AI Brain (intelligent heuristic rule-engine)
  return fallbackAIBrain({ mode, rawPrompt, referenceImage, aspectRatio, videoMotion });
}

function fallbackAIBrain(params: {
  mode: GenerationMode;
  rawPrompt: string;
  referenceImage?: ReferenceImage;
  aspectRatio: AspectRatio;
  videoMotion?: VideoMotionConfig;
}): AIBrainPlan {
  const { mode, rawPrompt, referenceImage, videoMotion } = params;
  const promptLower = rawPrompt.toLowerCase().trim();

  let style = 'Cinematic 35mm film photograph';
  let lighting = 'Volumetric rim lighting with soft golden hour fill';
  let composition = 'Wide cinematic angle with depth-of-field separation';
  let subject = 'High fidelity with intricate micro-textures, specular highlights, and natural physics';

  if (promptLower.includes('cyberpunk') || promptLower.includes('neon') || promptLower.includes('futuristic')) {
    style = 'Cyberpunk neo-noir cinematic realism';
    lighting = 'Bioluminescent neon ambient reflections, diffused fog, wet street specularities';
    composition = 'Low-angle hero perspective with towering architectural vanishing lines';
  } else if (promptLower.includes('product') || promptLower.includes('bottle') || promptLower.includes('shoe') || promptLower.includes('commercial')) {
    style = 'High-end commercial luxury studio photography';
    lighting = 'Three-point softbox studio lighting with razor-sharp edge definition';
    composition = 'Centered hero display on textured minimalist plinth';
  } else if (promptLower.includes('nature') || promptLower.includes('forest') || promptLower.includes('mountain') || promptLower.includes('ocean')) {
    style = 'National Geographic master landscape photography';
    lighting = 'Ethereal morning sunbeams filtering through mist, warm chromatic gradation';
    composition = 'Expansive panoramic sweep with foreground framing foliage';
  } else if (promptLower.includes('portrait') || promptLower.includes('person') || promptLower.includes('woman') || promptLower.includes('man')) {
    style = 'Editorial Hasselblad medium format portraiture';
    lighting = 'Rembrandt soft window illumination, delicate catchlights in eyes';
    composition = 'Close medium shot with subtle 85mm f/1.4 background bokeh';
  }

  const cameraMove = videoMotion?.cameraMovement || (
    promptLower.includes('drone') || promptLower.includes('landscape') ? 'Smooth sweeping aerial crane shot gliding forward' :
    promptLower.includes('product') ? 'Slow 360-degree orbit with gentle macro zoom' :
    'Steadicam tracking shot with smooth linear motion'
  );

  const preservedDetails: string[] = [];
  if (referenceImage) {
    preservedDetails.push('Maintain original color harmony and primary hues');
    preservedDetails.push('Preserve core subject geometry, silhouette, and proportions');
    preservedDetails.push('Retain textural material properties and surface characteristics');
  }

  const enhancedPrompt = `${rawPrompt.trim()}, ${style}, shot on 35mm master lens, ${lighting}, ${composition}, ${subject}, photorealistic, ultra-detailed 8k resolution, masterful color grading.`;

  return {
    originalPrompt: rawPrompt,
    enhancedPrompt,
    intent: `Evocative ${mode === 'video' ? '10-second visual cinematic experience' : 'high-resolution creative image'} capturing "${rawPrompt}"`,
    visualStyle: style,
    composition,
    subjectDetails: subject,
    lighting,
    colorPalette: ['#0f172a', '#3b82f6', '#06b6d4', '#f8fafc'],
    referencePreservation: preservedDetails,
    negativeConstraints: 'blurry, noise, low resolution, oversaturated, deformed proportions, plastic skin, artifacts, stuttering motion, watermarks',
    videoPlan: mode === 'video' ? {
      cameraMovement: cameraMove,
      subjectMotion: videoMotion?.subjectMotion || 'Organic, fluid kinematics with natural momentum',
      environmentMotion: 'Atmospheric particles, soft breeze dynamics, shifting specular reflections',
      speed: videoMotion?.speed || 'medium',
      cinematicDirection: '24fps cinematic motion blur, temporal cohesion across 10 seconds, seamless continuity',
      durationSeconds: 10,
      timelineKeyframes: [
        '00:00 - 00:02: Establishing initial framing with fluid camera ingress',
        '00:02 - 00:05: Subject motion accelerates with secondary particle dynamics',
        '00:05 - 00:08: Dynamic lighting shift revealing intricate material textures',
        '00:08 - 00:10: Graceful deceleration framing final hero composition'
      ]
    } : undefined
  };
}
