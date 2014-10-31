/**
 * Created by turner on 6/19/14.
 */
var cursor = (function (cursor) {

    cursor.CursorHistogram = function (binCount, maxScore, controlDiv) {

        this.createMarkupAndSetBinLength(controlDiv);

//        this.bins = [];
//        this.bins.length = binCount;

        this.canvasFillStyle = igv.greyScale(255);
        this.minMaxfillStyle = igv.rgbaColor(64, 64, 64, 0.5);
        this.minMaxEdgefillStyle = igv.rgbaColor(32, 32, 32, 1.0);

        this.maxCount = 0;
        this.initializeBins();

        this.maxScore = maxScore;

    };

    // Methods
    cursor.CursorHistogram.prototype.initializeBins = function () {

        var i, len;
        for (i=0, len=this.bins.length; i < len; i++) {
            this.bins[i] = 0;
        }

        this.maxCount = 0;
    };

    cursor.CursorHistogram.prototype.insertScore = function (score) {

        if (score < 0) {
            return;
        }

        var index = this.scoreIndex(score);
        this.bins[ index ] += 1;
        this.maxCount = Math.max(this.maxCount, this.bins[ index ]);
    };

    cursor.CursorHistogram.prototype.scoreIndex = function (score) {

        var value;

        // Handle edge condition
        if (this.maxScore === score) {
            return (this.bins.length - 1);
        }

        value = (score / this.maxScore);
        value *= this.bins.length;

        return Math.floor(value);
    };

    // Render
    cursor.CursorHistogram.prototype.render = function (track) {

        var myself = this;
        var renderMinimumOverlay = function (minimum) {

            var height = (minimum/track.max) * myself.bins.length;
            myself.igvCanvas.fillRect(0, myself.bins.length - height, myself.canvasWidth, height, { fillStyle: myself.minMaxfillStyle });
        };

        var renderMaximumOverlay = function (maximum) {

            var height = myself.bins.length - ((maximum/track.max) * myself.bins.length);
            myself.igvCanvas.fillRect(0, 0, myself.canvasWidth, height, { fillStyle: myself.minMaxfillStyle });
        };

        // Clear canvas
        this.fillCanvasWithFillStyle(this.canvasFillStyle);

        // render histogram
        this.bins.forEach(function (count, index, counts) {

            var x,
                y,
                width,
                height,
                percent,
                color;

            if (count) {

                percent = (count/this.maxCount);

                // Symmetric centerline histogram. Pretty.
                x = ((1.0 - percent) / 2.0) * this.canvasWidth;

                // Asymmetric histogram. Meh.
//            x = (1.0 - percent) * this.canvasWidth;

                width = (percent) * this.canvasWidth;

                y = (counts.length - 1) - index;
                height = 1;

                color = (track.color) ? track.color : igv.rgbColor(128, 128, 128);

                this.igvCanvas.fillRect(x, y, width, height, { fillStyle: color });
            }

        }, this);

        var renderTrackFilterOverlays = track.trackFilter.makeTrackFilterOverlayRenderer(renderMinimumOverlay, renderMaximumOverlay);
        renderTrackFilterOverlays();

    };

    cursor.CursorHistogram.prototype.fillCanvasWithFillStyle = function (fillStyle) {
        this.igvCanvas.fillRect(0, 0, this.canvasWidth, this.canvasHeight, { fillStyle:fillStyle } );
    };

    function showX(count, index, counts) {

        var yPercent = index/(counts.length - 1),
            color = igv.rgbaColor(Math.floor(yPercent * 255), 0, 0, 0.75);

        this.igvCanvas.fillRect(index, 0, 1, counts.length, { fillStyle: color });

    }

    function showY(count, index, counts) {

        var yPercent = index/(counts.length - 1),
            color = igv.rgbaColor(Math.floor(yPercent * 255), 0, 0, 0.75);

        this.igvCanvas.fillRect(0, index, counts.length, 1, { fillStyle: color });

    }

    // Markup
    cursor.CursorHistogram.prototype.createMarkupAndSetBinLength = function (parentDiv) {

        this.igvCanvas = this.createCanvasAndSetBinLength(parentDiv);

        // Clear canvas
        this.fillCanvasWithFillStyle(this.canvasFillStyle);

    };

    cursor.CursorHistogram.prototype.createCanvasAndSetBinLength = function (parentDiv) {

        var cursorHistogramDiv = document.createElement('div');
        parentDiv.appendChild(cursorHistogramDiv);
        cursorHistogramDiv.className = "igv-cursorHistogram-div";

        this.cursorHistogramDiv = cursorHistogramDiv;
        this.bins = [];
        this.bins.length = cursorHistogramDiv.clientHeight;

        var DOMCanvas = this.createDOMCanvasWithParent(this.cursorHistogramDiv);

        var igvCanvas = new igv.Canvas(DOMCanvas);
        return igvCanvas;
    };

    cursor.CursorHistogram.prototype.createDOMCanvasWithParent = function (parentDiv) {

        var DOMCanvas;

        DOMCanvas = document.createElement('canvas');
        parentDiv.appendChild(DOMCanvas);

        this.canvasWidth = parentDiv.clientWidth;
        this.canvasHeight = parentDiv.clientHeight;

        DOMCanvas.setAttribute('width', parentDiv.clientWidth);
        DOMCanvas.setAttribute('height', parentDiv.clientHeight);

        return DOMCanvas;
    };

    cursor.CursorHistogram.prototype.updateHeightAndInitializeHistogramWithTrack = function (track) {

        this.canvasHeight = this.cursorHistogramDiv.clientHeight;
        this.igvCanvas.canvas.setAttribute('height', this.cursorHistogramDiv.clientHeight);

        this.bins = [];
        this.bins.length = this.cursorHistogramDiv.clientHeight;
        track.cursorModel.initializeHistogram(track);
     };

    return cursor;

})(cursor || {});

