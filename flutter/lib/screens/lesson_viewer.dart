import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../models/models.dart';

class LessonViewer extends StatefulWidget {
  final Lesson lesson;
  LessonViewer({required this.lesson});

  @override
  _LessonViewerState createState() => _LessonViewerState();
}

class _LessonViewerState extends State<LessonViewer> {
  late YoutubePlayerController? _ytController;

  @override
  void initState() {
    super.initState();
    if (widget.lesson.type == 'video' && widget.lesson.videoUrl != null) {
      String? videoId = YoutubePlayer.convertUrlToId(widget.lesson.videoUrl!);
      _ytController = YoutubePlayerController(
        initialVideoId: videoId!,
        flags: YoutubePlayerFlags(autoPlay: false),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.lesson.title)),
      body: Column(
        children: [
          if (widget.lesson.type == 'video')
            YoutubePlayer(controller: _ytController!),
          
          if (widget.lesson.type == 'pdf')
            Expanded(child: SfPdfViewer.network(widget.lesson.pdfUrl!)),

          if (widget.lesson.type == 'text')
            Expanded(
              child: Markdown(
                data: widget.lesson.content,
                styleSheet: MarkdownStyleSheet(
                  p: TextStyle(fontSize: 16, color: Colors.zinc[700], height: 1.6),
                  h1: TextStyle(fontWeight: FontWeight.bold, fontSize: 24),
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _playTTS(),
        child: Icon(LucideIcons.volume2),
        backgroundColor: Colors.emerald,
      ),
    );
  }

  void _playTTS() {
    // Call GeminiService to generate and play audio
  }
}
