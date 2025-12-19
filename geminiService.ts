
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getDramaticNarrative(state: { cytokineLevel: number; damageCount: number; phase: string }) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Narrate a microscopic biological drama. 
      Context: A misguided immune attack on skin cells. 
      Current Cytokine Level: ${state.cytokineLevel}%. 
      Cells Compromised: ${state.damageCount}.
      Current Phase: ${state.phase}.
      
      Requirements: 
      - Use dramatic, cinematic language.
      - Refer to T-lymphocytes (CD4, CD8) as 'специализированные каратели', B-cells and antibodies as 'ракетные установки и самонаводящиеся снаряды', NK-cells as 'беспощадные ассасины', and Macrophages as 'титанические пожиратели'.
      - Mention 'дендритные шпионы' spreading the false alarm.
      - Keep it short (2-3 sentences).
      - Language: Russian (Русский язык).
      - Style: Epic sci-fi biology.`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 250,
      }
    });

    return response.text || "Макрофаги начинают поглощать здоровую ткань, ведомые ложными сигналами системы...";
  } catch (error) {
    console.error("Gemini Narrative Error:", error);
    return "Биологическая передача прервана. В клеточном матриксе воцарился хаос.";
  }
}
