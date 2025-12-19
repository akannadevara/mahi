// test/widget_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:avk_events_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Use the real app entry widget (name is case-sensitive)
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    expect(find.byType(MyApp), findsOneWidget);
  });
}
