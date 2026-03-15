import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/admin_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Note: You must configure your firebase_options.dart using the FlutterFire CLI
  // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const LMSApp());
}

class LMSApp extends StatelessWidget {
  const LMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LMS Flutter',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF10B981), // emerald-500
          primary: const Color(0xFF10B981),
        ),
        textTheme: GoogleFonts.interTextTheme(),
        useMaterial3: true,
      ),
      home: AdminDashboard(),
    );
  }
}
