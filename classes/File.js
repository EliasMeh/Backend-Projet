class File {
  constructor(tab) {
    this.tab = tab;
  }
  getTab() {
    return this.tab;
  }
  setTab(tab) {
    this.tab = tab;
  }
  addElement(element) {
    this.tab.push(element);
  }
  removeElement(index) {
    this.tab.splice(index, 1);
  }
  removeElementFIFO() {
    this.tab.shift();
  }
  removeElementFILO() {
    this.tab.pop();
  }
}