import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AdminDashboard extends StatefulWidget {
  @override
  _AdminDashboardState createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF8FAFC), // zinc-50
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Text('Administration', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.emerald[700],
          unselectedLabelColor: Colors.zinc[400],
          indicatorColor: Colors.emerald[600],
          tabs: [
            Tab(icon: Icon(LucideIcons.school), text: "Schools"),
            Tab(icon: Icon(LucideIcons.bookOpen), text: "Classes"),
            Tab(icon: Icon(LucideIcons.users), text: "Users"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildList('schools'),
          _buildList('classes'),
          _buildList('users'),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddModal(),
        backgroundColor: Colors.zinc[900],
        icon: Icon(LucideIcons.plus),
        label: Text("Add New"),
      ),
    );
  }

  Widget _buildList(String collection) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection(collection).snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return Center(child: CircularProgressIndicator());
        return ListView.builder(
          padding: EdgeInsets.all(16),
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            var data = snapshot.data!.docs[index].data() as Map<String, dynamic>;
            return Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              margin: EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                title: Text(data['name'] ?? data['displayName'] ?? 'Untitled', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(data['role'] ?? data['address'] ?? ''),
                trailing: Icon(LucideIcons.settings, size: 18, color: Colors.zinc[400]),
              ),
            );
          },
        );
      },
    );
  }

  void _showAddModal() {
    // Implementation of the modal forms similar to your React modals
  }
}
