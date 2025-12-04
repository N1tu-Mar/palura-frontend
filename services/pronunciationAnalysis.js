/**
 * Pronunciation Analysis Service
 * 
 * This is a MOCK implementation for MVP.
 * Later, this will be replaced with real MFCC/DTW analysis.
 * 
 * The function signature and return structure match the real implementation
 * so we can swap it out easily later.
 */

/**
 * Analyzes a user's pronunciation against a reference word
 * @param {string} audioUri - URI of the recorded audio file
 * @param {object} ref - Reference data containing template.json content
 * @returns {Promise<object>} Analysis results with scores, alignment, and decisions
 */
export const analyzeWord = async (audioUri, ref) => {
  // Simulate processing delay (real analysis would take ~50ms)
  await new Promise(resolve => setTimeout(resolve, 800));

  // Mock analysis results - these would come from real DTW/MFCC analysis
  // For MVP, we return realistic but randomized data
  
  // Generate realistic scores (slightly randomized for demo purposes)
  const overallWordScore = Math.floor(Math.random() * 30) + 70; // 70-100
  const phonemeScore = Math.floor(Math.random() * 35) + 65; // 65-100
  
  // Determine pass/fail based on threshold (default 70)
  const threshold = 70;
  const pass = phonemeScore >= threshold;
  
  // Mock detected phoneme (sometimes different from target)
  const detectedPhoneme = Math.random() > 0.7 ? "i:" : "I";
  
  // Mock alignment data - map reference phonemes to child audio timings
  const mappedPhonemes = ref.phonemes.map((phoneme, index) => {
    // Simulate slight timing variations in child's pronunciation
    const variation = Math.random() * 40 - 20; // -20ms to +20ms variation
    return {
      p: phoneme.p,
      startMs: Math.max(0, phoneme.start + variation),
      endMs: phoneme.end + variation
    };
  });
  
  // Get target phoneme alignment
  const targetPhoneme = mappedPhonemes[ref.targetIndex];
  
  // Mock wrong word detection (low overall score or bad duration)
  const wrongWord = overallWordScore < 60 || Math.random() < 0.1; // 10% chance for demo
  
  // Return structure matching the real implementation
  return {
    overallWordScore,        // 0-100
    phonemeScore,            // 0-100 (for target phoneme)
    detectedPhoneme: detectedPhoneme === "I" ? "I" : "i:", // "i:" | "I" | null
    alignment: {
      phonemes: mappedPhonemes,
      target: {
        startMs: targetPhoneme.startMs,
        endMs: targetPhoneme.endMs
      }
    },
    decision: {
      target: pass ? "pass" : "fail"
    },
    wrongWord
  };
};


