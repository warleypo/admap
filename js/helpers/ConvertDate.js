class ConvertDate {
  static convertStringDateToBR(stringDate) {
    if (!stringDate) return "";
    return String(stringDate).split("-").reverse().join("/");
  }
}
