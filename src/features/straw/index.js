export default class Straw {
  static idCount = 0;
  name = "";
  id;
  constructor(name) {
    this.name = name;
    this.id = this.idCount;
    this.idCount += 1;
  }

}