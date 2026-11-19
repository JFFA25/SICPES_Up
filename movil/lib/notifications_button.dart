import 'package:flutter/material.dart';

import 'api_client.dart';

class NotificationsButton extends StatefulWidget {
  const NotificationsButton({required this.api, super.key});

  final ApiClient api;

  @override
  State<NotificationsButton> createState() => _NotificationsButtonState();
}

class _NotificationsButtonState extends State<NotificationsButton> {
  List<Map<String, dynamic>> _items = [];
  int _unread = 0;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await widget.api.get('/mobile/notifications');
      if (result is Map<String, dynamic>) {
        final items = result['items'];
        if (mounted) {
          setState(() {
            _items = items is List
                ? items
                      .whereType<Map>()
                      .map((item) => Map<String, dynamic>.from(item))
                      .toList()
                : [];
            _unread = int.tryParse(result['unread']?.toString() ?? '') ?? 0;
            _error = null;
          });
        }
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    }
  }

  Future<void> _markRead(Map<String, dynamic> item) async {
    final id = item['id'];
    if (id == null || item['leida'] == 1) return;
    try {
      await widget.api.put('/mobile/notifications/$id/read');
      if (mounted) {
        setState(() {
          item['leida'] = 1;
          if (_unread > 0) _unread--;
        });
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  void _openInbox() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * .72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 4, 20, 10),
                child: Text(
                  'Notificaciones',
                  style: TextStyle(
                    color: Color(0xFF173D2A),
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Color(0xFFA93830)),
                  ),
                ),
              Expanded(
                child: _items.isEmpty
                    ? const Center(
                        child: Text(
                          'Todavía no tienes avisos.',
                          style: TextStyle(color: Color(0xFF66766A)),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(12, 4, 12, 20),
                        itemCount: _items.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final item = _items[index];
                          return ListTile(
                            leading: Icon(
                              item['leida'] == 1
                                  ? Icons.notifications_none
                                  : Icons.notifications_active_outlined,
                              color: const Color(0xFF287A51),
                            ),
                            title: Text((item['titulo'] ?? '').toString()),
                            subtitle: Text((item['cuerpo'] ?? '').toString()),
                            isThreeLine: true,
                            onTap: () => _markRead(item),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Notificaciones',
    onPressed: () {
      _openInbox();
      _load();
    },
    icon: Stack(
      clipBehavior: Clip.none,
      children: [
        const Icon(Icons.notifications_none_rounded),
        if (_unread > 0)
          Positioned(
            top: -3,
            right: -3,
            child: Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(
                color: const Color(0xFFD9773F),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: const Color(0xFFFDFBF7), width: 1.5),
              ),
            ),
          ),
      ],
    ),
  );
}
