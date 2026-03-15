import 'package:google_generative_ai/google_generative_ai.dart';

class GeminiService {
  final String apiKey;
  late GenerativeModel model;

  GeminiService(this.apiKey) {
    model = GenerativeModel(model: 'gemini-1.5-flash', apiKey: apiKey);
  }

  // Replicates the TTS logic using Gemini's multimodal capabilities
  Future<String?> generateSpeech(String text) async {
    final prompt = "Convert this text to speech instructions for a clear, educational voice: $text";
    final response = await model.generateContent([Content.text(prompt)]);
    return response.text;
  }
}
