import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String uid;
  final String email;
  final String displayName;
  final String role; // admin, teacher, student
  final String? schoolId;
  final List<String> schoolIds;
  final String? classId;
  final String? specialization;

  UserProfile({
    required this.uid, required this.email, required this.displayName, 
    required this.role, this.schoolId, this.schoolIds = const [], 
    this.classId, this.specialization
  });

  factory UserProfile.fromDoc(DocumentSnapshot doc) {
    var data = doc.data() as Map<String, dynamic>;
    return UserProfile(
      uid: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'] ?? '',
      role: data['role'] ?? 'student',
      schoolId: data['schoolId'],
      schoolIds: List<String>.from(data['schoolIds'] ?? []),
      classId: data['classId'],
      specialization: data['specialization'],
    );
  }
}

class Lesson {
  final String id;
  final String title;
  final String content;
  final String type; // text, video, pdf
  final String? videoUrl;
  final String? pdfUrl;

  Lesson({required this.id, required this.title, required this.content, required this.type, this.videoUrl, this.pdfUrl});

  factory Lesson.fromDoc(DocumentSnapshot doc) {
    var data = doc.data() as Map<String, dynamic>;
    return Lesson(
      id: doc.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      type: data['type'] ?? 'text',
      videoUrl: data['videoUrl'],
      pdfUrl: data['pdfUrl'],
    );
  }
}
