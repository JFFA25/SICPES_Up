import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';

/// Archivo elegido por el usuario (ya leído en memoria).
class PickedFile {
  const PickedFile(this.name, this.bytes);

  final String name;
  final Uint8List bytes;

  int get size => bytes.length;

  String get sizeLabel => size >= 1024 * 1024
      ? '${(size / (1024 * 1024)).toStringAsFixed(1)} MB'
      : '${(size / 1024).ceil()} KB';
}

/// Abre el selector del sistema. Devuelve null si el usuario cancela.
/// Sin [extensions] solo permite imágenes.
Future<PickedFile?> pickFile({List<String>? extensions}) async {
  final files = await FilePicker.pickFiles(
    type: extensions == null ? FileType.image : FileType.custom,
    allowedExtensions: extensions,
  );
  if (files.isEmpty) return null;

  final file = files.first;
  final bytes = await file.readAsBytes();
  return PickedFile(file.name, bytes);
}
