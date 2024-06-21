// -*- Mode: JavaScript; tab-width: 2; indent-tabs-mode: nil; -*-
// vim:set ft=javascript ts=2 sw=2 sts=2 cindent:
class Configuration {
    constructor() {
        this.abbrevsOn = true;
        this.textBackgrounds = "striped";
        this.svgWidth = '100%';
        this.rapidModeOn = false;
        this.confirmModeOn = true;
        this.autorefreshOn = false;
        this.visual = {
            margin: { x: 2, y: 1 },
            arcTextMargin: 1,
            boxSpacing: 1,
            curlyHeight: 4,
            arcSpacing: 9, // 10;
            arcStartHeight: 19, // 23; // 25;
        };
    }
}

// BRAT STANDALONE LIBRARY BEGIN
// Browserify export
export default Configuration;
// BRAT STANDALONE LIBRARY END